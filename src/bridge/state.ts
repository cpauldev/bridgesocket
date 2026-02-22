import type {
  DevSocketBridgeCapabilities,
  DevSocketBridgeState,
  DevSocketRuntimeStatus,
} from "../types.js";

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
