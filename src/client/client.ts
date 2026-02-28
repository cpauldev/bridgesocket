import {
  BRIDGE_PREFIX_DEFAULT,
  UNIVERSA_WS_SUBPROTOCOL,
} from "../bridge/constants.js";
import type {
  UniversaBridgeEvent,
  UniversaBridgeInstance,
  UniversaBridgeState,
  UniversaErrorResponse,
  UniversaRuntimeStatus,
} from "../types.js";

export interface UniversaClientOptions {
  baseUrl?: string;
  bridgePathPrefix?: string;
  fetchImpl?: typeof fetch;
  webSocketFactory?: (
    url: string,
    protocols: string[],
  ) => UniversaWebSocketLike;
}

export interface UniversaBridgeHealth extends UniversaBridgeState {
  ok: true;
  bridge: true;
  instance?: UniversaBridgeInstance;
}

export interface UniversaEventsSubscriptionOptions {
  onError?: (error: unknown) => void;
}

export interface UniversaWebSocketLike {
  close: () => void;
  addEventListener?: (
    event: string,
    listener: (...args: unknown[]) => void,
  ) => void;
  removeEventListener?: (
    event: string,
    listener: (...args: unknown[]) => void,
  ) => void;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  off?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (
    event: string,
    listener: (...args: unknown[]) => void,
  ) => void;
}

export class UniversaClientError extends Error {
  statusCode: number;
  response: UniversaErrorResponse | null;

  constructor(statusCode: number, response: UniversaErrorResponse | null) {
    super(
      response?.error.message ?? `Request failed with status ${statusCode}`,
    );
    this.name = "UniversaClientError";
    this.statusCode = statusCode;
    this.response = response;
  }
}

export interface UniversaClient {
  getHealth: () => Promise<UniversaBridgeHealth>;
  getState: () => Promise<UniversaBridgeState>;
  getRuntimeStatus: () => Promise<UniversaRuntimeStatus>;
  startRuntime: () => Promise<UniversaRuntimeStatus>;
  restartRuntime: () => Promise<UniversaRuntimeStatus>;
  stopRuntime: () => Promise<UniversaRuntimeStatus>;
  subscribeEvents: (
    listener: (event: UniversaBridgeEvent) => void,
    options?: UniversaEventsSubscriptionOptions,
  ) => () => void;
}

function normalizePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

function joinPath(basePath: string, suffix: string): string {
  return `${basePath.replace(/\/$/, "")}${normalizePath(suffix)}`;
}

function resolveHttpUrl(baseUrl: string | undefined, path: string): string {
  if (!baseUrl) {
    return path;
  }

  return new URL(path, baseUrl).toString();
}

function resolveWebSocketUrl(
  baseUrl: string | undefined,
  path: string,
): string {
  if (baseUrl) {
    const url = new URL(path, baseUrl);
    if (url.protocol === "http:") {
      url.protocol = "ws:";
    } else if (url.protocol === "https:") {
      url.protocol = "wss:";
    }
    return url.toString();
  }

  if (typeof window !== "undefined") {
    const url = new URL(path, window.location.origin);
    url.protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return url.toString();
  }

  throw new Error(
    "Universa client requires `baseUrl` in non-browser environments for WebSocket subscriptions.",
  );
}

function addSocketListener(
  socket: UniversaWebSocketLike,
  event: string,
  listener: (...args: unknown[]) => void,
): void {
  if (typeof socket.addEventListener === "function") {
    socket.addEventListener(event, listener);
    return;
  }
  if (typeof socket.on === "function") {
    socket.on(event, listener);
    return;
  }
  throw new Error("WebSocket implementation does not support event listeners.");
}

function removeSocketListener(
  socket: UniversaWebSocketLike,
  event: string,
  listener: (...args: unknown[]) => void,
): void {
  if (typeof socket.removeEventListener === "function") {
    socket.removeEventListener(event, listener);
    return;
  }
  if (typeof socket.off === "function") {
    socket.off(event, listener);
    return;
  }
  if (typeof socket.removeListener === "function") {
    socket.removeListener(event, listener);
  }
}

function extractMessagePayload(message: unknown): string {
  const textDecoder = new TextDecoder();

  if (typeof message === "string") {
    return message;
  }

  if (
    typeof message === "object" &&
    message !== null &&
    "data" in message &&
    typeof (message as { data?: unknown }).data !== "undefined"
  ) {
    return extractMessagePayload((message as { data: unknown }).data);
  }

  if (message instanceof ArrayBuffer) {
    return textDecoder.decode(new Uint8Array(message));
  }
  if (ArrayBuffer.isView(message)) {
    return textDecoder.decode(
      new Uint8Array(message.buffer, message.byteOffset, message.byteLength),
    );
  }

  return String(message);
}

export function createUniversaClient(
  options: UniversaClientOptions = {},
): UniversaClient {
  const bridgePathPrefix = options.bridgePathPrefix ?? BRIDGE_PREFIX_DEFAULT;
  const fetchImpl = options.fetchImpl ?? fetch;

  const requestJson = async <T>(
    routeSuffix: string,
    init?: RequestInit,
  ): Promise<T> => {
    const routePath = joinPath(bridgePathPrefix, routeSuffix);
    const url = resolveHttpUrl(options.baseUrl, routePath);
    const response = await fetchImpl(url, init);

    if (!response.ok) {
      let payload: UniversaErrorResponse | null;
      try {
        payload = (await response.json()) as UniversaErrorResponse;
      } catch {
        payload = null;
      }
      throw new UniversaClientError(response.status, payload);
    }

    return (await response.json()) as T;
  };

  const requestRuntimeControl = async (
    routeSuffix: "/runtime/start" | "/runtime/restart" | "/runtime/stop",
  ): Promise<UniversaRuntimeStatus> => {
    const payload = await requestJson<{
      success: boolean;
      runtime: UniversaRuntimeStatus;
    }>(routeSuffix, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: "{}",
    });

    return payload.runtime;
  };

  return {
    getHealth: () => requestJson<UniversaBridgeHealth>("/health"),
    getState: () => requestJson<UniversaBridgeState>("/state"),
    getRuntimeStatus: () =>
      requestJson<UniversaRuntimeStatus>("/runtime/status"),
    startRuntime: () => requestRuntimeControl("/runtime/start"),
    restartRuntime: () => requestRuntimeControl("/runtime/restart"),
    stopRuntime: () => requestRuntimeControl("/runtime/stop"),
    subscribeEvents: (
      listener: (event: UniversaBridgeEvent) => void,
      subscriptionOptions?: UniversaEventsSubscriptionOptions,
    ) => {
      const eventsPath = joinPath(bridgePathPrefix, "/events");
      const webSocketUrl = resolveWebSocketUrl(options.baseUrl, eventsPath);
      const socket =
        options.webSocketFactory?.(webSocketUrl, [UNIVERSA_WS_SUBPROTOCOL]) ??
        (new WebSocket(webSocketUrl, [
          UNIVERSA_WS_SUBPROTOCOL,
        ]) as UniversaWebSocketLike);

      const onMessage = (message: unknown) => {
        try {
          const payload = JSON.parse(
            extractMessagePayload(message),
          ) as UniversaBridgeEvent;
          listener(payload);
        } catch (error) {
          subscriptionOptions?.onError?.(error);
        }
      };

      const onError = (...args: unknown[]) => {
        subscriptionOptions?.onError?.(args.length > 1 ? args : args[0]);
      };

      addSocketListener(socket, "message", onMessage);
      addSocketListener(socket, "error", onError);

      return () => {
        removeSocketListener(socket, "message", onMessage);
        removeSocketListener(socket, "error", onError);
        socket.close();
      };
    },
  };
}
