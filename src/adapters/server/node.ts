import type { DevSocketBridge } from "../../bridge/bridge.js";
import {
  type BridgeLifecycle,
  type DevSocketAdapterOptions,
  type MiddlewareAdapterServer,
  createBridgeLifecycle,
} from "../shared/adapter-utils.js";

export type NodeDevSocketOptions = DevSocketAdapterOptions;

export interface NodeBridgeHandle {
  bridge: DevSocketBridge;
  close: () => Promise<void>;
}

export function createNodeBridgeLifecycle(
  options: NodeDevSocketOptions = {},
): BridgeLifecycle {
  return createBridgeLifecycle(options);
}

export async function attachDevSocketToNodeServer(
  server: MiddlewareAdapterServer,
  options: NodeDevSocketOptions = {},
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
