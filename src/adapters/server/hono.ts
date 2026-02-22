import type { MiddlewareAdapterServer } from "../shared/adapter-utils.js";
import {
  type NodeBridgeHandle,
  type NodeDevSocketOptions,
  attachDevSocketToNodeServer,
  createNodeBridgeLifecycle,
} from "./node.js";

export type HonoNodeServer = MiddlewareAdapterServer;
export type HonoDevSocketOptions = NodeDevSocketOptions;
export type HonoBridgeHandle = NodeBridgeHandle;

export const createHonoBridgeLifecycle = createNodeBridgeLifecycle;

export function attachDevSocketToHonoNodeServer(
  server: HonoNodeServer,
  options: HonoDevSocketOptions = {},
): Promise<HonoBridgeHandle> {
  return attachDevSocketToNodeServer(server, options);
}
