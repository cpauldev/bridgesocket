import type { UniversaBridge } from "../../bridge/bridge.js";
import {
  type BridgeLifecycle,
  type MiddlewareAdapterServer,
  type UniversaAdapterOptions,
  createBridgeLifecycle,
} from "../shared/adapter-utils.js";

export type NodeUniversaOptions = UniversaAdapterOptions;

export interface NodeBridgeHandle {
  bridge: UniversaBridge;
  close: () => Promise<void>;
}

export function createNodeBridgeLifecycle(
  options: NodeUniversaOptions = {},
): BridgeLifecycle {
  return createBridgeLifecycle(options);
}

export async function attachUniversaToNodeServer(
  server: MiddlewareAdapterServer,
  options: NodeUniversaOptions = {},
): Promise<NodeBridgeHandle> {
  const lifecycle = createNodeBridgeLifecycle(options);
  const bridge = await lifecycle.setup(server);
  return {
    bridge,
    close: async () => {
      await lifecycle.teardown();
    },
  };
}
