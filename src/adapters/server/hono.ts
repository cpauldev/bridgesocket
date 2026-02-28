import type { MiddlewareAdapterServer } from "../shared/adapter-utils.js";
import {
  type NodeBridgeHandle,
  type NodeUniversaOptions,
  attachUniversaToNodeServer,
  createNodeBridgeLifecycle,
} from "./node.js";

export type HonoNodeServer = MiddlewareAdapterServer;
export type HonoUniversaOptions = NodeUniversaOptions;
export type HonoBridgeHandle = NodeBridgeHandle;

export const createHonoBridgeLifecycle = createNodeBridgeLifecycle;

export function attachUniversaToHonoNodeServer(
  server: HonoNodeServer,
  options: HonoUniversaOptions = {},
): Promise<HonoBridgeHandle> {
  return attachUniversaToNodeServer(server, options);
}
