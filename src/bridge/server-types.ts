import type { IncomingMessage, ServerResponse } from "http";

export interface BridgeMiddlewareServer {
  middlewares: {
    use: (
      fn: (
        req: IncomingMessage,
        res: ServerResponse,
        next: (error?: unknown) => void,
      ) => void,
    ) => void;
  };
  httpServer:
    | {
        on: (
          event: "upgrade" | "close",
          listener: (...args: unknown[]) => void,
        ) => void;
      }
    | null
    | undefined;
}
