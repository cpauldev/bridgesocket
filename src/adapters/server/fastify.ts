import type { IncomingMessage, ServerResponse } from "http";

import {
  type UniversaBridge,
  createUniversaBridge,
} from "../../bridge/bridge.js";
import {
  type UniversaAdapterOptions,
  resolveAdapterOptions,
} from "../shared/adapter-utils.js";

type FastifyDone = (error?: Error) => void;

export interface FastifyLikeRequest {
  raw: IncomingMessage;
}

export interface FastifyLikeReply {
  raw: ServerResponse;
}

export interface FastifyLikeInstance {
  addHook(
    name: "onRequest",
    hook: (
      request: FastifyLikeRequest,
      reply: FastifyLikeReply,
      done: FastifyDone,
    ) => void,
  ): void;
  addHook(
    name: "onClose",
    hook: (instance: unknown, done: FastifyDone) => void,
  ): void;
}

export interface FastifyBridgeHandle {
  bridge: UniversaBridge;
  close: () => Promise<void>;
}

export type FastifyUniversaOptions = UniversaAdapterOptions;

function toError(value: unknown): Error {
  if (value instanceof Error) return value;
  return new Error(String(value));
}

export async function attachUniversaToFastify(
  fastify: FastifyLikeInstance,
  options: FastifyUniversaOptions = {},
): Promise<FastifyBridgeHandle> {
  const bridge = await createUniversaBridge(resolveAdapterOptions(options));

  fastify.addHook(
    "onRequest",
    (
      request: FastifyLikeRequest,
      reply: FastifyLikeReply,
      done: FastifyDone,
    ) => {
      void bridge
        .handleHttpRequest(request.raw, reply.raw, (error) =>
          done(error ? toError(error) : undefined),
        )
        .catch((error) => {
          if (!reply.raw.writableEnded) {
            done(toError(error));
          }
        });
    },
  );

  fastify.addHook("onClose", (_instance: unknown, done: FastifyDone) => {
    void bridge
      .close()
      .then(() => done())
      .catch((error) => done(toError(error)));
  });

  return {
    bridge,
    close: async () => {
      await bridge.close();
    },
  };
}
