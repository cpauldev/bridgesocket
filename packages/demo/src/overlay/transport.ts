import type { BridgeSocketBridgeState } from "bridgesocket";

import type { OverlayState } from "./types.js";

export type OverlayTransportState = OverlayState["transportState"];

const DEFAULT_FAILURE_THRESHOLD = 2;

export function resolveBridgeTransportState(
  currentState: OverlayTransportState,
  bridgeState: BridgeSocketBridgeState,
): OverlayTransportState {
  if (
    currentState === "runtime_starting" &&
    bridgeState.runtime.phase !== "running" &&
    bridgeState.runtime.phase !== "error"
  ) {
    return "runtime_starting";
  }
  return bridgeState.transportState;
}

export function resolveFailureTransportState(
  currentState: OverlayTransportState,
  consecutiveFailures: number,
  failureThreshold = DEFAULT_FAILURE_THRESHOLD,
): OverlayTransportState {
  if (consecutiveFailures >= failureThreshold) {
    return "degraded";
  }

  if (currentState === "runtime_starting") {
    return "runtime_starting";
  }

  return "bridge_detecting";
}

export function shouldRetainConnectedStateOnFailure(
  connected: boolean,
  consecutiveFailures: number,
  failureThreshold = DEFAULT_FAILURE_THRESHOLD,
): boolean {
  return connected && consecutiveFailures < failureThreshold;
}
