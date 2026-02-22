import type {
  DevSocketBridgeCapabilities,
  DevSocketBridgeState,
  DevSocketRuntimeStatus,
} from "../types.js";
import {
  DEVSOCKET_PROTOCOL_VERSION,
  DEVSOCKET_WS_SUBPROTOCOL,
} from "./constants.js";

export function createCapabilities(
  fallbackCommand: string,
): DevSocketBridgeCapabilities {
  return {
    commandHost: "hybrid",
    hasRuntimeControl: true,
    canStartRuntime: true,
    canRestartRuntime: true,
    canStopRuntime: true,
    fallbackCommand,
    wsSubprotocol: DEVSOCKET_WS_SUBPROTOCOL,
    supportedProtocolVersions: [DEVSOCKET_PROTOCOL_VERSION],
  };
}

export function toTransportState(
  runtime: DevSocketRuntimeStatus,
): DevSocketBridgeState["transportState"] {
  switch (runtime.phase) {
    case "running":
      return "connected";
    case "starting":
      return "runtime_starting";
    case "error":
      return "degraded";
    case "stopped":
    case "stopping":
    default:
      return "bridge_detecting";
  }
}

export function toRuntimeWebSocketUrl(runtimeUrl: string): string {
  if (runtimeUrl.startsWith("https://")) {
    return `wss://${runtimeUrl.slice("https://".length)}`;
  }
  if (runtimeUrl.startsWith("http://")) {
    return `ws://${runtimeUrl.slice("http://".length)}`;
  }
  return `ws://${runtimeUrl}`;
}
