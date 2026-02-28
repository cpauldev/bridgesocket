import {
  type UniversaBridge,
  type UniversaBridgeOptions,
  createUniversaBridge,
} from "../../bridge/bridge.js";
import type { BridgeMiddlewareServer } from "../../bridge/server-types.js";
import {
  type StandaloneBridgeServer,
  startStandaloneUniversaBridgeServer,
} from "../../bridge/standalone.js";

export const UNIVERSA_DEV_ADAPTER_NAME = "universa-bridge";
export const UNIVERSA_BRIDGE_PATH_PREFIX = "/__universa";
export const UNIVERSA_BRIDGE_REWRITE_SOURCE = "/__universa/:path*";
export const UNIVERSA_NEXT_BRIDGE_GLOBAL_KEY = "__UNIVERSA_NEXT_BRIDGE__";

export interface UniversaRewriteRule {
  source: string;
  destination: string;
}

export type UniversaRewriteSpec =
  | UniversaRewriteRule[]
  | {
      beforeFiles?: UniversaRewriteRule[];
      afterFiles?: UniversaRewriteRule[];
      fallback?: UniversaRewriteRule[];
    };

export interface UniversaNormalizedRewrites {
  beforeFiles: UniversaRewriteRule[];
  afterFiles: UniversaRewriteRule[];
  fallback: UniversaRewriteRule[];
}

export interface UniversaAdapterOptions extends UniversaBridgeOptions {
  adapterName?: string;
  rewriteSource?: string;
  nextBridgeGlobalKey?: string;
  /** Package specifier for the overlay client module to auto-inject (e.g. "demo/overlay"). */
  overlayModule?: string;
}

interface ResolvedUniversaAdapterOptions extends UniversaBridgeOptions {
  adapterName: string;
  rewriteSource: string;
  nextBridgeGlobalKey?: string;
  overlayModule?: string;
}

export type MiddlewareAdapterServer = BridgeMiddlewareServer;

export interface BridgeLifecycle {
  setup: (server: MiddlewareAdapterServer) => Promise<UniversaBridge>;
  teardown: () => Promise<void>;
  getBridge: () => UniversaBridge | null;
}

export type ViteAdapterServer = MiddlewareAdapterServer;
export type ViteBridgeLifecycle = BridgeLifecycle;

export function resolveAdapterOptions(
  options: UniversaAdapterOptions = {},
): ResolvedUniversaAdapterOptions {
  return {
    ...options,
    adapterName: options.adapterName ?? UNIVERSA_DEV_ADAPTER_NAME,
    bridgePathPrefix: options.bridgePathPrefix ?? UNIVERSA_BRIDGE_PATH_PREFIX,
    rewriteSource: options.rewriteSource ?? UNIVERSA_BRIDGE_REWRITE_SOURCE,
    nextBridgeGlobalKey: options.nextBridgeGlobalKey,
    overlayModule: options.overlayModule,
  };
}

function toBridgeOptions(
  options: UniversaAdapterOptions,
): UniversaBridgeOptions {
  const {
    adapterName: _adapterName,
    rewriteSource: _rewriteSource,
    nextBridgeGlobalKey: _nextBridgeGlobalKey,
    ...bridgeOptions
  } = options;
  return bridgeOptions;
}

export async function attachBridgeToServer(
  server: MiddlewareAdapterServer,
  options: UniversaAdapterOptions,
): Promise<UniversaBridge> {
  const bridge = await createUniversaBridge(toBridgeOptions(options));
  await bridge.attach(server);
  return bridge;
}

export function attachBridgeToViteServer(
  server: ViteAdapterServer,
  options: UniversaAdapterOptions,
): Promise<UniversaBridge> {
  return attachBridgeToServer(server, options);
}

export function createBridgeLifecycle(
  options: UniversaAdapterOptions = {},
): BridgeLifecycle {
  const resolvedOptions = resolveAdapterOptions(options);
  let bridge: UniversaBridge | null = null;
  let setupPromise: Promise<UniversaBridge> | null = null;
  let attachedServers = new WeakSet<MiddlewareAdapterServer>();

  return {
    async setup(server) {
      if (setupPromise) {
        return setupPromise;
      }

      setupPromise = (async () => {
        if (bridge?.isClosed()) {
          bridge = null;
          attachedServers = new WeakSet<MiddlewareAdapterServer>();
        }

        if (!bridge) {
          bridge = await createUniversaBridge(toBridgeOptions(resolvedOptions));
        }

        if (!attachedServers.has(server)) {
          await bridge.attach(server);
          attachedServers.add(server);
        }

        return bridge;
      })();

      try {
        return await setupPromise;
      } finally {
        setupPromise = null;
      }
    },
    async teardown() {
      let currentBridge = bridge;
      if (!currentBridge && setupPromise) {
        try {
          currentBridge = await setupPromise;
        } catch {
          currentBridge = null;
        }
      }

      bridge = null;
      setupPromise = null;
      attachedServers = new WeakSet<MiddlewareAdapterServer>();

      if (currentBridge) {
        await currentBridge.close();
      }
    },
    getBridge() {
      return bridge;
    },
  };
}

export function createViteBridgeLifecycle(
  options: UniversaAdapterOptions = {},
): ViteBridgeLifecycle {
  return createBridgeLifecycle(options);
}

export function ensureStandaloneBridgeSingleton(
  options: UniversaAdapterOptions,
): Promise<StandaloneBridgeServer> {
  const resolvedOptions = resolveAdapterOptions(options);
  const bridgeGlobal = globalThis as typeof globalThis & {
    [key: string]: Promise<StandaloneBridgeServer> | undefined;
  };
  const globalKey =
    resolvedOptions.nextBridgeGlobalKey ?? UNIVERSA_NEXT_BRIDGE_GLOBAL_KEY;

  if (!bridgeGlobal[globalKey]) {
    const startupPromise = startStandaloneUniversaBridgeServer(
      toBridgeOptions(resolvedOptions),
    );
    const guardedPromise = startupPromise.catch((error) => {
      if (bridgeGlobal[globalKey] === guardedPromise) {
        delete bridgeGlobal[globalKey];
      }
      throw error;
    });
    bridgeGlobal[globalKey] = guardedPromise;
  }

  const bridge = bridgeGlobal[globalKey];
  if (!bridge) {
    throw new Error("Failed to initialize standalone universa-kit bridge");
  }

  return bridge;
}

export function normalizeRewrites(
  rewrites: UniversaRewriteSpec | undefined,
): UniversaNormalizedRewrites {
  if (!rewrites) {
    return { beforeFiles: [], afterFiles: [], fallback: [] };
  }

  if (Array.isArray(rewrites)) {
    return { beforeFiles: rewrites, afterFiles: [], fallback: [] };
  }

  return {
    beforeFiles: rewrites.beforeFiles ?? [],
    afterFiles: rewrites.afterFiles ?? [],
    fallback: rewrites.fallback ?? [],
  };
}

export function createBridgeRewriteRoute(
  baseUrl: string,
  rewriteSource = UNIVERSA_BRIDGE_REWRITE_SOURCE,
): UniversaRewriteRule {
  return {
    source: rewriteSource,
    destination: `${baseUrl}${rewriteSource}`,
  };
}

export function appendPlugin<T>(plugins: T[] | undefined, plugin: T): T[] {
  return [...(plugins ?? []), plugin];
}
