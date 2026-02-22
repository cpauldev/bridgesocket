export type DevSocketRuntimePhase =
  | "stopped"
  | "starting"
  | "running"
  | "stopping"
  | "error";

export interface DevSocketRuntimeStatus {
  phase: DevSocketRuntimePhase;
  url: string | null;
  pid: number | null;
  startedAt: number | null;
  lastError: string | null;
}

export interface DevSocketBridgeCapabilities {
  commandHost: "host" | "helper" | "hybrid";
  hasRuntimeControl: boolean;
  canStartRuntime: boolean;
  canRestartRuntime: boolean;
  canStopRuntime: boolean;
  fallbackCommand: string;
}

export interface DevSocketBridgeState {
  transportState:
    | "disconnected"
    | "bridge_detecting"
    | "runtime_starting"
    | "connected"
    | "degraded";
  runtime: DevSocketRuntimeStatus;
  capabilities: DevSocketBridgeCapabilities;
}

export interface DevSocketCommandRequest {
  command:
    | "sync"
    | "login"
    | "logout"
    | "translate"
    | "translate-hashes"
    | "open-file"
    | "save-file"
    | "update-translation";
  payload?: Record<string, unknown>;
}

export interface DevSocketCommandResult {
  success: boolean;
  message?: string;
  operationId?: string;
  data?: Record<string, unknown>;
}

export type DevSocketBridgeEvent =
  | {
      type: "runtime-status";
      timestamp: number;
      status: DevSocketRuntimeStatus;
    }
  | {
      type: "runtime-error";
      timestamp: number;
      error: string;
    };
