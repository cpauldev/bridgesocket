import type { RuntimeHelperOptions } from "../runtime/runtime-helper.js";
import type { UniversaBridgeInstance } from "../types.js";
import {
  BRIDGE_PREFIX_DEFAULT,
  DEFAULT_FALLBACK_COMMAND,
  WS_HEARTBEAT_INTERVAL_MS_DEFAULT,
} from "./constants.js";

export interface UniversaBridgeOptions extends RuntimeHelperOptions {
  autoStart?: boolean;
  bridgePathPrefix?: string;
  fallbackCommand?: string;
  eventHeartbeatIntervalMs?: number;
  proxyRuntimeWebSocket?: boolean;
  instance?: UniversaBridgeInstance;
}

export type ResolvedBridgeOptions = Required<
  Pick<
    UniversaBridgeOptions,
    | "autoStart"
    | "bridgePathPrefix"
    | "fallbackCommand"
    | "eventHeartbeatIntervalMs"
    | "proxyRuntimeWebSocket"
  >
> &
  Omit<
    UniversaBridgeOptions,
    | "autoStart"
    | "bridgePathPrefix"
    | "fallbackCommand"
    | "eventHeartbeatIntervalMs"
    | "proxyRuntimeWebSocket"
  >;

export function resolveBridgeOptions(
  options: UniversaBridgeOptions,
): ResolvedBridgeOptions {
  return {
    autoStart: options.autoStart ?? true,
    bridgePathPrefix: options.bridgePathPrefix ?? BRIDGE_PREFIX_DEFAULT,
    fallbackCommand: options.fallbackCommand ?? DEFAULT_FALLBACK_COMMAND,
    eventHeartbeatIntervalMs:
      options.eventHeartbeatIntervalMs ?? WS_HEARTBEAT_INTERVAL_MS_DEFAULT,
    proxyRuntimeWebSocket: options.proxyRuntimeWebSocket ?? true,
    ...options,
  };
}
