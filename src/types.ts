export type UniversaRuntimePhase =
  | "stopped"
  | "starting"
  | "running"
  | "stopping"
  | "error";

export type UniversaProtocolVersion = "1";

export interface UniversaRuntimeStatus {
  phase: UniversaRuntimePhase;
  url: string | null;
  pid: number | null;
  startedAt: number | null;
  lastError: string | null;
}

export type UniversaErrorCode =
  | "invalid_request"
  | "route_not_found"
  | "runtime_start_failed"
  | "runtime_control_failed"
  | "runtime_unavailable"
  | "bridge_proxy_failed"
  | "internal_error";

export interface UniversaErrorPayload {
  code: UniversaErrorCode;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

export interface UniversaErrorResponse {
  success: false;
  message: string;
  error: UniversaErrorPayload;
}

export interface UniversaBridgeCapabilities {
  commandHost: "host" | "helper" | "hybrid";
  hasRuntimeControl: boolean;
  canStartRuntime: boolean;
  canRestartRuntime: boolean;
  canStopRuntime: boolean;
  fallbackCommand: string;
  wsSubprotocol: string;
  supportedProtocolVersions: UniversaProtocolVersion[];
}

export interface UniversaBridgeInstance {
  id: string;
  label?: string;
}

export interface UniversaBridgeState {
  protocolVersion: UniversaProtocolVersion;
  transportState:
    | "disconnected"
    | "bridge_detecting"
    | "runtime_starting"
    | "connected"
    | "degraded";
  runtime: UniversaRuntimeStatus;
  capabilities: UniversaBridgeCapabilities;
  instance?: UniversaBridgeInstance;
  error?: string;
}

export interface UniversaCommandRequest {
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

export interface UniversaCommandResult {
  success: boolean;
  message?: string;
  operationId?: string;
  data?: Record<string, unknown>;
}

interface UniversaBridgeEventBase {
  protocolVersion: UniversaProtocolVersion;
  eventId: number;
  timestamp: number;
}

export type UniversaBridgeEvent =
  | (UniversaBridgeEventBase & {
      type: "runtime-status";
      status: UniversaRuntimeStatus;
    })
  | (UniversaBridgeEventBase & {
      type: "runtime-error";
      error: string;
    });
