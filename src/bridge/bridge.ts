import type { IncomingMessage, ServerResponse } from "http";
import type { Duplex } from "stream";
import { URL } from "url";
import { WebSocket, WebSocketServer } from "ws";

import {
  RuntimeHelper,
  type RuntimeHelperOptions,
} from "../runtime/runtime-helper.js";
import type {
  DevSocketBridgeEvent,
  DevSocketBridgeState,
  DevSocketErrorCode,
  DevSocketErrorPayload,
  DevSocketRuntimeStatus,
} from "../types.js";
import {
  API_PROXY_PREFIX,
  BRIDGE_PREFIX_DEFAULT,
  DEFAULT_FALLBACK_COMMAND,
  DEVSOCKET_PROTOCOL_VERSION,
  DEVSOCKET_WS_SUBPROTOCOL,
  EVENTS_PATH,
  WS_HEARTBEAT_INTERVAL_MS_DEFAULT,
} from "./constants.js";
import { readRequestBody, writeError, writeJson } from "./http.js";
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
  eventHeartbeatIntervalMs?: number;
}

type ResolvedBridgeOptions = Required<
  Pick<
    DevSocketBridgeOptions,
    | "autoStart"
    | "bridgePathPrefix"
    | "fallbackCommand"
    | "eventHeartbeatIntervalMs"
  >
> &
  Omit<
    DevSocketBridgeOptions,
    | "autoStart"
    | "bridgePathPrefix"
    | "fallbackCommand"
    | "eventHeartbeatIntervalMs"
  >;

function resolveBridgeOptions(
  options: DevSocketBridgeOptions,
): ResolvedBridgeOptions {
  return {
    autoStart: options.autoStart ?? true,
    bridgePathPrefix: options.bridgePathPrefix ?? BRIDGE_PREFIX_DEFAULT,
    fallbackCommand: options.fallbackCommand ?? DEFAULT_FALLBACK_COMMAND,
    eventHeartbeatIntervalMs:
      options.eventHeartbeatIntervalMs ?? WS_HEARTBEAT_INTERVAL_MS_DEFAULT,
    ...options,
  };
}

interface EventClientState {
  isAlive: boolean;
}

export class DevSocketBridge {
  #options: ResolvedBridgeOptions;
  #helper: RuntimeHelper;
  #wss = new WebSocketServer({
    noServer: true,
    perMessageDeflate: false,
    handleProtocols: (protocols) => {
      return protocols.has(DEVSOCKET_WS_SUBPROTOCOL)
        ? DEVSOCKET_WS_SUBPROTOCOL
        : false;
    },
  });
  #eventClients = new Set<WebSocket>();
  #eventClientState = new Map<WebSocket, EventClientState>();
  #closed = false;
  #autoStartEnabled = true;
  #heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  #nextEventId = 1;

  constructor(options: DevSocketBridgeOptions = {}) {
    this.#options = resolveBridgeOptions(options);
    this.#helper = new RuntimeHelper(this.#options);
    this.#autoStartEnabled = this.#options.autoStart;

    this.#helper.onStatusChange((status) =>
      this.emitBridgeEvent(this.createRuntimeStatusEvent(status)),
    );

    this.#wss.on("connection", (socket) => this.registerEventClient(socket));
    this.startHeartbeatLoop();
  }

  getBridgePathPrefix(): string {
    return this.#options.bridgePathPrefix;
  }

  getState(): DevSocketBridgeState {
    const runtime = this.#helper.getStatus();
    return {
      protocolVersion: DEVSOCKET_PROTOCOL_VERSION,
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
    this.#eventClientState.clear();
    this.stopHeartbeatLoop();
    this.#wss.close();
  }

  async attach(server: BridgeMiddlewareServer): Promise<void> {
    server.middlewares.use((req, res, next) => {
      void this.handleHttpRequest(req, res, next);
    });

    server.httpServer?.on("upgrade", (...args: unknown[]) => {
      const [req, socket, head] = args as [IncomingMessage, unknown, Buffer];
      this.handleUpgrade(req, socket as Duplex, head);
    });

    server.httpServer?.on("close", () => {
      void this.close();
    });
  }

  async attachVite(server: BridgeMiddlewareServer): Promise<void> {
    await this.attach(server);
  }

  handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): void {
    if (!this.isEventsUpgradePath(req.url || "/")) {
      return;
    }
    const requestedProtocols = this.getRequestedSubprotocols(req);
    if (
      requestedProtocols.length > 0 &&
      !requestedProtocols.includes(DEVSOCKET_WS_SUBPROTOCOL)
    ) {
      this.rejectUpgrade(
        socket,
        426,
        `Unsupported WebSocket subprotocol. Include Sec-WebSocket-Protocol: ${DEVSOCKET_WS_SUBPROTOCOL}.`,
      );
      return;
    }

    this.#wss.handleUpgrade(req, socket, head, (ws) => {
      this.#wss.emit("connection", ws, req);
      ws.send(
        JSON.stringify(this.createRuntimeStatusEvent(this.#helper.getStatus())),
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
          this.emitBridgeEvent(
            this.createRuntimeErrorEvent(
              error instanceof Error ? error.message : String(error),
            ),
          );
          writeJson(res, 200, this.getState());
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

    this.writeBridgeError(
      res,
      404,
      "route_not_found",
      `Unknown devsocket bridge route: ${route}`,
      {
        details: {
          route,
          method,
        },
      },
    );
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
        this.writeBridgeError(
          res,
          503,
          "runtime_start_failed",
          error instanceof Error ? error.message : "Unable to start runtime",
          {
            retryable: true,
            details: {
              fallbackCommand: this.#options.fallbackCommand,
            },
          },
        );
        return;
      }
    }

    const runtimeUrl = this.#helper.getRuntimeUrl();
    if (!runtimeUrl) {
      this.writeBridgeError(
        res,
        503,
        "runtime_unavailable",
        "Runtime is not running",
        {
          retryable: true,
          details: {
            fallbackCommand: this.#options.fallbackCommand,
          },
        },
      );
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
      this.writeBridgeError(
        res,
        502,
        "bridge_proxy_failed",
        error instanceof Error ? error.message : "Bridge proxy failed",
        {
          retryable: true,
          details: {
            target: target.toString(),
          },
        },
      );
      return;
    }

    if (upstream.status >= 500) {
      this.emitBridgeEvent(
        this.createRuntimeErrorEvent(
          `Upstream runtime returned ${upstream.status} for ${target.pathname}`,
        ),
      );
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
      this.writeBridgeError(
        res,
        500,
        "runtime_control_failed",
        error instanceof Error ? error.message : String(error),
        {
          retryable: true,
        },
      );
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

  private createRuntimeStatusEvent(
    status: DevSocketRuntimeStatus,
  ): DevSocketBridgeEvent {
    return this.createBridgeEvent({
      type: "runtime-status",
      status,
    });
  }

  private createRuntimeErrorEvent(error: string): DevSocketBridgeEvent {
    return this.createBridgeEvent({
      type: "runtime-error",
      error,
    });
  }

  private createBridgeEvent(
    event:
      | {
          type: "runtime-status";
          status: DevSocketRuntimeStatus;
        }
      | {
          type: "runtime-error";
          error: string;
        },
  ): DevSocketBridgeEvent {
    return {
      ...event,
      protocolVersion: DEVSOCKET_PROTOCOL_VERSION,
      eventId: this.#nextEventId++,
      timestamp: Date.now(),
    };
  }

  private registerEventClient(socket: WebSocket): void {
    this.#eventClients.add(socket);
    this.#eventClientState.set(socket, { isAlive: true });

    socket.on("pong", () => {
      const state = this.#eventClientState.get(socket);
      if (state) {
        state.isAlive = true;
      }
    });

    socket.on("close", () => {
      this.unregisterEventClient(socket);
    });

    socket.on("error", () => {
      this.unregisterEventClient(socket);
    });
  }

  private unregisterEventClient(socket: WebSocket): void {
    this.#eventClients.delete(socket);
    this.#eventClientState.delete(socket);
  }

  private startHeartbeatLoop(): void {
    this.#heartbeatTimer = setInterval(() => {
      for (const socket of this.#eventClients) {
        if (socket.readyState !== WebSocket.OPEN) {
          this.unregisterEventClient(socket);
          continue;
        }

        const state = this.#eventClientState.get(socket);
        if (!state) {
          continue;
        }

        if (!state.isAlive) {
          socket.terminate();
          this.unregisterEventClient(socket);
          continue;
        }

        state.isAlive = false;
        socket.ping();
      }
    }, this.#options.eventHeartbeatIntervalMs);

    this.#heartbeatTimer.unref?.();
  }

  private stopHeartbeatLoop(): void {
    if (!this.#heartbeatTimer) {
      return;
    }

    clearInterval(this.#heartbeatTimer);
    this.#heartbeatTimer = null;
  }

  private getRequestedSubprotocols(req: IncomingMessage): string[] {
    const protocolHeader = req.headers["sec-websocket-protocol"];
    const raw = Array.isArray(protocolHeader)
      ? protocolHeader.join(",")
      : (protocolHeader ?? "");

    return raw
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }

  private isEventsUpgradePath(requestUrl: string): boolean {
    const eventsPath = `${this.#options.bridgePathPrefix}${EVENTS_PATH}`;
    const parsed = new URL(requestUrl, "http://devsocket.local");
    return parsed.pathname === eventsPath;
  }

  private rejectUpgrade(
    socket: Duplex,
    statusCode: number,
    message: string,
  ): void {
    const payload = JSON.stringify({
      success: false,
      error: {
        code: "invalid_request",
        message,
        retryable: false,
        details: {
          wsSubprotocol: DEVSOCKET_WS_SUBPROTOCOL,
        },
      } satisfies DevSocketErrorPayload,
    });
    const reason = statusCode === 426 ? "Upgrade Required" : "Bad Request";
    const responseText =
      `HTTP/1.1 ${statusCode} ${reason}\r\n` +
      "Connection: close\r\n" +
      "Content-Type: application/json; charset=utf-8\r\n" +
      `Content-Length: ${Buffer.byteLength(payload)}\r\n` +
      "\r\n" +
      payload;

    try {
      socket.end(responseText);
    } catch {
      socket.destroy();
    }
  }

  private writeBridgeError(
    res: ServerResponse,
    statusCode: number,
    code: DevSocketErrorCode,
    message: string,
    options?: {
      retryable?: boolean;
      details?: Record<string, unknown>;
    },
  ): void {
    const error: DevSocketErrorPayload = {
      code,
      message,
      retryable: options?.retryable ?? false,
      ...(options?.details ? { details: options.details } : {}),
    };

    writeError(res, statusCode, error);
  }

  private async pipeRuntimeEvents(client: WebSocket): Promise<void> {
    if (this.shouldAutoStartRuntime()) {
      try {
        await this.#helper.ensureStarted();
      } catch (error) {
        this.emitBridgeEvent(
          this.createRuntimeErrorEvent(
            error instanceof Error ? error.message : String(error),
          ),
        );
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
      this.emitBridgeEvent(this.createRuntimeErrorEvent(error.message));
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
