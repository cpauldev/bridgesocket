import type { OverlaySeverity, OverlayState } from "./types.js";

interface StatusCopy {
  title: string;
  detail: string;
}

export function resolveOverlaySeverity(state: OverlayState): OverlaySeverity {
  if (state.errorMessage) return "error";
  if (state.transportState === "degraded") return "error";

  if (
    (state.transportState === "bridge_detecting" ||
      state.transportState === "runtime_starting") &&
    state.hasBootstrapped
  ) {
    return "loading";
  }

  if (!state.connected && state.hasBootstrapped) return "error";
  if (state.loadingAction) return "loading";

  const runtimePhase = state.bridgeState?.runtime.phase;
  if (runtimePhase === "running") return "success";
  if (runtimePhase === "error") return "error";
  if (runtimePhase === "starting" || runtimePhase === "stopping")
    return "loading";

  return "info";
}

export function resolveStatusCopy(state: OverlayState): StatusCopy {
  const severity = resolveOverlaySeverity(state);
  const fallbackCommand =
    state.bridgeState?.capabilities?.fallbackCommand || "demo dev";

  if (severity === "error") {
    if (state.transportState === "degraded") {
      return {
        title: "Runtime Unavailable",
        detail: `Start the runtime with \`${fallbackCommand}\``,
      };
    }
    if (!state.connected) {
      return {
        title: "Disconnected",
        detail: state.errorMessage || "Dev server unavailable",
      };
    }
    return {
      title: "Error",
      detail: state.errorMessage || "Unexpected overlay error",
    };
  }

  if (severity === "loading") {
    if (state.transportState === "bridge_detecting") {
      return { title: "Detecting Bridge", detail: "Checking for demo bridge" };
    }
    if (state.transportState === "runtime_starting") {
      return { title: "Starting Runtime", detail: "Booting the demo runtime" };
    }
    return {
      title: "Working",
      detail: state.loadingAction || "Processing...",
    };
  }

  if (severity === "success") {
    const phase = state.bridgeState?.runtime.phase;
    if (phase === "running") {
      return { title: "Running", detail: "Runtime is active" };
    }
    return { title: "Ready", detail: "Demo connected" };
  }

  const runtimePhase = state.bridgeState?.runtime.phase;
  if (runtimePhase === "stopped") {
    return { title: "Stopped", detail: "Runtime is not running" };
  }

  return { title: "Connected", detail: "Demo overlay active" };
}
