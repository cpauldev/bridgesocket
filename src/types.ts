export type DevSocketRuntimePhase =
  | "stopped"
  | "starting"
  | "running"
  | "stopping"
  | "error";

export type DevSocketProtocolVersion = "1";

export interface DevSocketRuntimeStatus {
  phase: DevSocketRuntimePhase;
  url: string | null;
  pid: number | null;
  startedAt: number | null;
  lastError: string | null;
}

export type DevSocketErrorCode =
  | "invalid_request"
  | "route_not_found"
  | "runtime_start_failed"
  | "runtime_control_failed"
  | "runtime_unavailable"
  | "bridge_proxy_failed"
  | "internal_error";

export interface DevSocketErrorPayload {
  code: DevSocketErrorCode;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

export interface DevSocketErrorResponse {
  success: false;
  message: string;
  error: DevSocketErrorPayload;
}

export interface DevSocketBridgeCapabilities {
  commandHost: "host" | "helper" | "hybrid";
  hasRuntimeControl: boolean;
  canStartRuntime: boolean;
  canRestartRuntime: boolean;
  canStopRuntime: boolean;
  fallbackCommand: string;
  wsSubprotocol: string;
  supportedProtocolVersions: DevSocketProtocolVersion[];
}

export interface DevSocketBridgeState {
  protocolVersion: DevSocketProtocolVersion;
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

interface DevSocketBridgeEventBase {
  protocolVersion: DevSocketProtocolVersion;
  eventId: number;
  timestamp: number;
}

export type DevSocketBridgeEvent =
  | (DevSocketBridgeEventBase & {
      type: "runtime-status";
      status: DevSocketRuntimeStatus;
    })
  | (DevSocketBridgeEventBase & {
      type: "runtime-error";
      error: string;
    });
