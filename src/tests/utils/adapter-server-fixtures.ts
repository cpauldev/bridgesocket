import type { IncomingMessage, ServerResponse } from "http";

export type HookEvent = "upgrade" | "close";
export type HttpServerListener = (...args: unknown[]) => void;
export type BridgeMiddlewareHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  next: (error?: unknown) => void,
) => void;
export type SetupMiddlewareHandler = (
  req: unknown,
  res: unknown,
  next: (error?: unknown) => void,
) => void;

interface HookRegistry {
  middlewareListeners: BridgeMiddlewareHandler[];
  setupMiddlewareListeners: SetupMiddlewareHandler[];
  listeners: Record<HookEvent, HttpServerListener[]>;
}

function createHookRegistry(): HookRegistry {
  return {
    middlewareListeners: [],
    setupMiddlewareListeners: [],
    listeners: {
      upgrade: [],
      close: [],
    },
  };
}

function createHelpers(registry: HookRegistry) {
  return {
    getMiddlewareCount: () => registry.middlewareListeners.length,
    getSetupMiddlewareCount: () => registry.setupMiddlewareListeners.length,
    getListenerCount: (event: HookEvent) => registry.listeners[event].length,
    emit: (event: HookEvent, ...args: unknown[]) => {
      registry.listeners[event].forEach((listener) => listener(...args));
    },
  };
}

export function createMiddlewareAdapterServerFixture() {
  const registry = createHookRegistry();

  return {
    server: {
      middlewares: {
        use: (listener: BridgeMiddlewareHandler) => {
          registry.middlewareListeners.push(listener);
        },
      },
      httpServer: {
        on: (event: HookEvent, listener: HttpServerListener) => {
          registry.listeners[event].push(listener);
        },
      },
    },
    ...createHelpers(registry),
  };
}

export function createSetupMiddlewaresDevServerFixture() {
  const registry = createHookRegistry();

  return {
    devServer: {
      app: {
        use: (listener: SetupMiddlewareHandler) => {
          registry.setupMiddlewareListeners.push(listener);
        },
      },
      server: {
        on: (event: HookEvent, listener: HttpServerListener) => {
          registry.listeners[event].push(listener);
        },
      },
    },
    ...createHelpers(registry),
  };
}
