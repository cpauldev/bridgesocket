import type {
  BridgeSocketBridgeOptions,
  RuntimeHelperOptions,
} from "bridgesocket";
import type { BridgeSocketAdapterOptions } from "bridgesocket/internal";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

export const DEMO_ADAPTER_NAME = "demo-bridge";
export const DEMO_BRIDGE_PATH_PREFIX = "/__demo";
export const DEMO_BRIDGE_REWRITE_SOURCE = "/__demo/:path*";
export const DEMO_NEXT_BRIDGE_GLOBAL_KEY = "__DEMO_NEXT_BRIDGE__";
export const DEMO_RUNTIME_HEALTH_PATH = "/api/version";
export const DEMO_RUNTIME_PORT_ENV_VAR = "DEMO_RUNTIME_PORT";
export const DEMO_RUNTIME_FALLBACK_COMMAND = "demo dev";

function resolveDemoRuntimeScript(): string {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  // From dist/dev/, go up to dist/, then find runtime/server.js
  return join(currentDir, "..", "runtime", "server.js");
}

function resolveCommand(
  command?: string,
  args?: string[],
): { command: string; args: string[] } {
  if (command) {
    return { command, args: args ?? [] };
  }

  return {
    command: "bun",
    args: args ?? [resolveDemoRuntimeScript()],
  };
}

export function resolveDemoRuntimeOptions(
  options: RuntimeHelperOptions = {},
): RuntimeHelperOptions {
  const resolvedCommand = resolveCommand(options.command, options.args);

  return {
    ...options,
    command: resolvedCommand.command,
    args: resolvedCommand.args,
    healthPath: options.healthPath ?? DEMO_RUNTIME_HEALTH_PATH,
    runtimePortEnvVar: options.runtimePortEnvVar ?? DEMO_RUNTIME_PORT_ENV_VAR,
  };
}

export function resolveDemoBridgeOptions(
  options: BridgeSocketBridgeOptions = {},
): BridgeSocketBridgeOptions {
  return {
    ...resolveDemoRuntimeOptions(options),
    bridgePathPrefix: options.bridgePathPrefix ?? DEMO_BRIDGE_PATH_PREFIX,
    fallbackCommand: options.fallbackCommand ?? DEMO_RUNTIME_FALLBACK_COMMAND,
  };
}

export function resolveDemoAdapterOptions(
  options: BridgeSocketAdapterOptions = {},
): BridgeSocketAdapterOptions {
  return {
    ...resolveDemoBridgeOptions(options),
    adapterName: options.adapterName ?? DEMO_ADAPTER_NAME,
    rewriteSource: options.rewriteSource ?? DEMO_BRIDGE_REWRITE_SOURCE,
    nextBridgeGlobalKey:
      options.nextBridgeGlobalKey ?? DEMO_NEXT_BRIDGE_GLOBAL_KEY,
  };
}
