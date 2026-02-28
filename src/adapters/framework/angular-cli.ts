import type { StandaloneBridgeServer } from "../../bridge/standalone.js";
import {
  type UniversaAdapterOptions,
  ensureStandaloneBridgeSingleton,
  resolveAdapterOptions,
} from "../shared/adapter-utils.js";

const ANGULAR_CLI_BRIDGE_GLOBAL_KEY_PREFIX = "__UNIVERSA_ANGULAR_CLI_BRIDGE__";
let angularCliBridgeInstanceCounter = 0;

function createDefaultAngularCliBridgeGlobalKey(): string {
  angularCliBridgeInstanceCounter += 1;
  return `${ANGULAR_CLI_BRIDGE_GLOBAL_KEY_PREFIX}:${process.pid}:${angularCliBridgeInstanceCounter}`;
}

function normalizeProxyContext(context: string): string {
  const withLeadingSlash = context.startsWith("/") ? context : `/${context}`;
  return withLeadingSlash.replace(/\/+$/, "");
}

function createProxyTarget(baseUrl: string): AngularCliProxyTarget {
  return {
    target: baseUrl,
    secure: false,
    changeOrigin: false,
    ws: true,
    logLevel: "warn",
  };
}

export interface AngularCliProxyTarget {
  target: string;
  secure: boolean;
  changeOrigin: boolean;
  ws: boolean;
  logLevel: "warn";
}

export type AngularCliUniversaProxyConfig = Record<
  string,
  AngularCliProxyTarget
>;

export interface AngularCliUniversaOptions extends UniversaAdapterOptions {
  angularCliBridgeGlobalKey?: string;
  proxyContext?: string;
}

export async function startUniversaAngularCliBridge(
  options: AngularCliUniversaOptions = {},
): Promise<StandaloneBridgeServer> {
  const { angularCliBridgeGlobalKey, ...adapterOptions } = options;
  const resolvedOptions = resolveAdapterOptions(adapterOptions);
  const standaloneKey =
    angularCliBridgeGlobalKey ?? createDefaultAngularCliBridgeGlobalKey();

  return ensureStandaloneBridgeSingleton({
    ...resolvedOptions,
    nextBridgeGlobalKey: standaloneKey,
  });
}

export async function createUniversaAngularCliProxyConfig(
  options: AngularCliUniversaOptions = {},
): Promise<AngularCliUniversaProxyConfig> {
  const bridge = await startUniversaAngularCliBridge(options);
  const proxyContext = normalizeProxyContext(
    options.proxyContext ?? options.bridgePathPrefix ?? "/__universa",
  );
  const proxyTarget = createProxyTarget(bridge.baseUrl);

  return {
    [proxyContext]: proxyTarget,
    [`${proxyContext}/**`]: proxyTarget,
  };
}

export async function withUniversaAngularCliProxyConfig(
  existingProxyConfig: AngularCliUniversaProxyConfig = {},
  options: AngularCliUniversaOptions = {},
): Promise<AngularCliUniversaProxyConfig> {
  return {
    ...existingProxyConfig,
    ...(await createUniversaAngularCliProxyConfig(options)),
  };
}
