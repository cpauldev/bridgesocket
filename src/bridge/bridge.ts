import type { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import { WebSocket, WebSocketServer } from "ws";

import {
  RuntimeHelper,
  type RuntimeHelperOptions,
} from "../runtime/runtime-helper.js";
import type {
  DevSocketBridgeEvent,
  DevSocketBridgeState,
  DevSocketRuntimeStatus,
} from "../types.js";
import {
  API_PROXY_PREFIX,
  BRIDGE_PREFIX_DEFAULT,
  DEFAULT_FALLBACK_COMMAND,
  EVENTS_PATH,
} from "./constants.js";
import { readRequestBody, writeJson } from "./http.js";
import type { BridgeMiddlewareServer } from "./server-types.js";
import {
  createCapabilities,
  toRuntimeWebSocketUrl,
  toTransportState,
} from "./state.js";

export interface DevSocketBridgeOptions extends RuntimeHelperOptions {
  autoStart?: boolean;
  bridgePathPrefix?: string;
  fallbackCommand?: string;
}

type ResolvedBridgeOptions = Required<
  Pick<
    DevSocketBridgeOptions,
    "autoStart" | "bridgePathPrefix" | "fallbackCommand"
  >
> &
  Omit<
    DevSocketBridgeOptions,
    "autoStart" | "bridgePathPrefix" | "fallbackCommand"
  >;

function resolveBridgeOptions(
  options: DevSocketBridgeOptions,
): ResolvedBridgeOptions {
  return {
    autoStart: options.autoStart ?? true,
    bridgePathPrefix: options.bridgePathPrefix ?? BRIDGE_PREFIX_DEFAULT,
    fallbackCommand: options.fallbackCommand ?? DEFAULT_FALLBACK_COMMAND,
    ...options,
  };
}

export class DevSocketBridge {
  #options: ResolvedBridgeOptions;
  #helper: RuntimeHelper;
  #wss = new WebSocketServer({ noServer: true });
  #eventClients = new Set<WebSocket>();
  #closed = false;
  #autoStartEnabled = true;

  constructor(options: DevSocketBridgeOptions = {}) {
    this.#options = resolveBridgeOptions(options);
    this.#helper = new RuntimeHelper(this.#options);
    this.#autoStartEnabled = this.#options.autoStart;

    this.#helper.onStatusChange((status) => {
      this.emitBridgeEvent({
        type: "runtime-status",
        timestamp: Date.now(),
        status,
      });
    });

    this.#wss.on("connection", (socket) => {
      this.#eventClients.add(socket);
      socket.on("close", () => this.#eventClients.delete(socket));
    });
  }

  getBridgePathPrefix(): string {
    return this.#options.bridgePathPrefix;
  }

  getState(): DevSocketBridgeState {
    const runtime = this.#helper.getStatus();
    return {
      transportState: toTransportState(runtime),
      runtime,
      capabilities: createCapabilities(this.#options.fallbackCommand),
    };
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    await this.#helper.stop();
    this.#eventClients.forEach((socket) => socket.close());
    this.#eventClients.clear();
    this.#wss.close();
  }

  async attach(server: BridgeMiddlewareServer): Promise<void> {
    server.middlewares.use((req, res, next) => {
      void this.handleHttpRequest(req, res, next);
    });

    server.httpServer?.on("upgrade", (...args: unknown[]) => {
      const [req, socket, head] = args as [IncomingMessage, unknown, Buffer];
      this.handleUpgrade(req, socket as never, head);
    });

    server.httpServer?.on("close", () => {
      void this.close();
    });
  }

  async attachVite(server: BridgeMiddlewareServer): Promise<void> {
    await this.attach(server);
  }

  handleUpgrade(req: IncomingMessage, socket: never, head: Buffer): void {
    const requestPath = req.url || "/";
    const eventsPath = `${this.#options.bridgePathPrefix}${EVENTS_PATH}`;
    if (!requestPath.startsWith(eventsPath)) {
      return;
    }

    this.#wss.handleUpgrade(req, socket, head, (ws) => {
      this.#wss.emit("connection", ws, req);
      ws.send(
        JSON.stringify({
          type: "runtime-status",
          timestamp: Date.now(),
          status: this.#helper.getStatus(),
        } satisfies DevSocketBridgeEvent),
      );
      void this.pipeRuntimeEvents(ws);
    });
  }

  async handleHttpRequest(
    req: IncomingMessage,
    res: ServerResponse,
    next?: (error?: unknown) => void,
  ): Promise<void> {
    const requestUrl = req.url || "/";
    const method = req.method || "GET";
    const prefix = this.#options.bridgePathPrefix;

    if (!requestUrl.startsWith(prefix)) {
      next?.();
      return;
    }

    const route = requestUrl.slice(prefix.length) || "/";
    const routeKey = `${method} ${route}`;

    if (routeKey === "GET /health") {
      writeJson(res, 200, { ok: true, bridge: true, ...this.getState() });
      return;
    }

    if (routeKey === "GET /state") {
      if (
        this.shouldAutoStartRuntime() &&
        this.#helper.getStatus().phase === "stopped"
      ) {
        try {
          await this.#helper.start();
        } catch (error) {
          writeJson(res, 200, {
            ...this.getState(),
            error: error instanceof Error ? error.message : String(error),
          });
          return;
        }
      }
      writeJson(res, 200, this.getState());
      return;
    }

    if (routeKey === "GET /runtime/status") {
      writeJson(res, 200, this.#helper.getStatus());
      return;
    }

    if (routeKey === "POST /runtime/start") {
      await this.handleRuntimeControlRequest(res, () => {
        this.enableAutoStartRuntime();
        return this.#helper.start();
      });
      return;
    }

    if (routeKey === "POST /runtime/restart") {
      await this.handleRuntimeControlRequest(res, () => {
        this.enableAutoStartRuntime();
        return this.#helper.restart();
      });
      return;
    }

    if (routeKey === "POST /runtime/stop") {
      await this.handleRuntimeControlRequest(res, () => {
        this.disableAutoStartRuntime();
        return this.#helper.stop();
      });
      return;
    }

    if (route.startsWith(API_PROXY_PREFIX)) {
      await this.proxyToRuntime(req, res, route.slice(API_PROXY_PREFIX.length));
      return;
    }

    writeJson(res, 404, {
      success: false,
      error: `Unknown devsocket bridge route: ${route}`,
    });
  }

  private shouldAutoStartRuntime(): boolean {
    return this.#options.autoStart && this.#autoStartEnabled;
  }

  private enableAutoStartRuntime(): void {
    this.#autoStartEnabled = true;
  }

  private disableAutoStartRuntime(): void {
    this.#autoStartEnabled = false;
  }

  private async proxyToRuntime(
    req: IncomingMessage,
    res: ServerResponse,
    runtimePath: string,
  ): Promise<void> {
    if (this.shouldAutoStartRuntime()) {
      try {
        await this.#helper.ensureStarted();
      } catch (error) {
        writeJson(res, 503, {
          success: false,
          error:
            error instanceof Error ? error.message : "Unable to start runtime",
          fallbackCommand: this.#options.fallbackCommand,
        });
        return;
      }
    }

    const runtimeUrl = this.#helper.getRuntimeUrl();
    if (!runtimeUrl) {
      writeJson(res, 503, {
        success: false,
        error: "Runtime is not running",
        fallbackCommand: this.#options.fallbackCommand,
      });
      return;
    }

    const target = new URL(`/api${runtimePath || ""}`, runtimeUrl);
    const body =
      req.method && ["POST", "PUT", "PATCH", "DELETE"].includes(req.method)
        ? await readRequestBody(req)
        : undefined;
    const bodyText =
      body && body.length > 0 ? body.toString("utf8") : undefined;

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) {
        value.forEach((item) => headers.append(key, item));
      } else if (typeof value === "string") {
        headers.set(key, value);
      }
    }

    let upstream: Response;
    try {
      upstream = await fetch(target, {
        method: req.method || "GET",
        headers,
        body: bodyText,
      });
    } catch (error) {
      writeJson(res, 502, {
        success: false,
        error: error instanceof Error ? error.message : "Bridge proxy failed",
      });
      return;
    }

    const responseHeaders: Record<string, string> = {};
    upstream.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    res.writeHead(upstream.status, responseHeaders);
    res.end(Buffer.from(await upstream.arrayBuffer()));
  }

  private async handleRuntimeControlRequest(
    res: ServerResponse,
    action: () => Promise<DevSocketRuntimeStatus>,
  ): Promise<void> {
    try {
      const status = await action();
      writeJson(res, 200, { success: true, runtime: status });
    } catch (error) {
      writeJson(res, 500, {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private emitBridgeEvent(event: DevSocketBridgeEvent): void {
    const payload = JSON.stringify(event);
    for (const client of this.#eventClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  private async pipeRuntimeEvents(client: WebSocket): Promise<void> {
    if (this.shouldAutoStartRuntime()) {
      try {
        await this.#helper.ensureStarted();
      } catch (error) {
        this.emitBridgeEvent({
          type: "runtime-error",
          timestamp: Date.now(),
          error: error instanceof Error ? error.message : String(error),
        });
        return;
      }
    }

    const runtimeUrl = this.#helper.getRuntimeUrl();
    if (!runtimeUrl || client.readyState !== WebSocket.OPEN) {
      return;
    }

    const upstream = new WebSocket(toRuntimeWebSocketUrl(runtimeUrl));
    upstream.on("message", (data, isBinary) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data, { binary: isBinary });
      }
    });
    upstream.on("error", (error) => {
      this.emitBridgeEvent({
        type: "runtime-error",
        timestamp: Date.now(),
        error: error.message,
      });
    });
    upstream.on("close", () => {
      if (client.readyState === WebSocket.OPEN) {
        client.close();
      }
    });

    client.on("message", (data, isBinary) => {
      if (upstream.readyState === WebSocket.OPEN) {
        upstream.send(data, { binary: isBinary });
      }
    });
    client.on("close", () => {
      if (upstream.readyState === WebSocket.OPEN) {
        upstream.close();
      }
    });
  }
}

export async function createDevSocketBridge(
  options: DevSocketBridgeOptions = {},
): Promise<DevSocketBridge> {
  return new DevSocketBridge(options);
}
