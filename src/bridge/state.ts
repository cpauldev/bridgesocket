import type {
  UniversaBridgeCapabilities,
  UniversaBridgeState,
  UniversaRuntimeStatus,
} from "../types.js";
import {
  UNIVERSA_PROTOCOL_VERSION,
  UNIVERSA_WS_SUBPROTOCOL,
} from "./constants.js";

export function createCapabilities(
  fallbackCommand: string,
  hasRuntimeControl: boolean,
  commandHost: UniversaBridgeCapabilities["commandHost"],
): UniversaBridgeCapabilities {
  return {
    commandHost,
    hasRuntimeControl,
    canStartRuntime: hasRuntimeControl,
    canRestartRuntime: hasRuntimeControl,
    canStopRuntime: hasRuntimeControl,
    fallbackCommand,
    wsSubprotocol: UNIVERSA_WS_SUBPROTOCOL,
    supportedProtocolVersions: [UNIVERSA_PROTOCOL_VERSION],
  };
}

export function toTransportState(
  runtime: UniversaRuntimeStatus,
): UniversaBridgeState["transportState"] {
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
