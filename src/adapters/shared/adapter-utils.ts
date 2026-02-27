import {
  type BridgeSocketBridge,
  type BridgeSocketBridgeOptions,
  createBridgeSocketBridge,
} from "../../bridge/bridge.js";
import type { BridgeMiddlewareServer } from "../../bridge/server-types.js";
import {
  type StandaloneBridgeServer,
  startStandaloneBridgeSocketBridgeServer,
} from "../../bridge/standalone.js";

export const BRIDGESOCKET_DEV_ADAPTER_NAME = "bridgesocket-bridge";
export const BRIDGESOCKET_BRIDGE_PATH_PREFIX = "/__bridgesocket";
export const BRIDGESOCKET_BRIDGE_REWRITE_SOURCE = "/__bridgesocket/:path*";
export const BRIDGESOCKET_NEXT_BRIDGE_GLOBAL_KEY =
  "__BRIDGESOCKET_NEXT_BRIDGE__";

export interface BridgeSocketRewriteRule {
  source: string;
  destination: string;
}

export type BridgeSocketRewriteSpec =
  | BridgeSocketRewriteRule[]
  | {
      beforeFiles?: BridgeSocketRewriteRule[];
      afterFiles?: BridgeSocketRewriteRule[];
      fallback?: BridgeSocketRewriteRule[];
    };

export interface BridgeSocketNormalizedRewrites {
  beforeFiles: BridgeSocketRewriteRule[];
  afterFiles: BridgeSocketRewriteRule[];
  fallback: BridgeSocketRewriteRule[];
}

export interface BridgeSocketAdapterOptions extends BridgeSocketBridgeOptions {
  adapterName?: string;
  rewriteSource?: string;
  nextBridgeGlobalKey?: string;
  /** Package specifier for the overlay client module to auto-inject (e.g. "demo/overlay"). */
  overlayModule?: string;
}

interface ResolvedBridgeSocketAdapterOptions extends BridgeSocketBridgeOptions {
  adapterName: string;
  rewriteSource: string;
  nextBridgeGlobalKey?: string;
  overlayModule?: string;
}

export type MiddlewareAdapterServer = BridgeMiddlewareServer;

export interface BridgeLifecycle {
  setup: (server: MiddlewareAdapterServer) => Promise<BridgeSocketBridge>;
  teardown: () => Promise<void>;
  getBridge: () => BridgeSocketBridge | null;
}

export type ViteAdapterServer = MiddlewareAdapterServer;
export type ViteBridgeLifecycle = BridgeLifecycle;

export function resolveAdapterOptions(
  options: BridgeSocketAdapterOptions = {},
): ResolvedBridgeSocketAdapterOptions {
  return {
    ...options,
    adapterName: options.adapterName ?? BRIDGESOCKET_DEV_ADAPTER_NAME,
    bridgePathPrefix:
      options.bridgePathPrefix ?? BRIDGESOCKET_BRIDGE_PATH_PREFIX,
    rewriteSource: options.rewriteSource ?? BRIDGESOCKET_BRIDGE_REWRITE_SOURCE,
    nextBridgeGlobalKey: options.nextBridgeGlobalKey,
    overlayModule: options.overlayModule,
  };
}

function toBridgeOptions(
  options: BridgeSocketAdapterOptions,
): BridgeSocketBridgeOptions {
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
  options: BridgeSocketAdapterOptions,
): Promise<BridgeSocketBridge> {
  const bridge = await createBridgeSocketBridge(toBridgeOptions(options));
  await bridge.attach(server);
  return bridge;
}

export function attachBridgeToViteServer(
  server: ViteAdapterServer,
  options: BridgeSocketAdapterOptions,
): Promise<BridgeSocketBridge> {
  return attachBridgeToServer(server, options);
}

export function createBridgeLifecycle(
  options: BridgeSocketAdapterOptions = {},
): BridgeLifecycle {
  const resolvedOptions = resolveAdapterOptions(options);
  let bridge: BridgeSocketBridge | null = null;
  let setupPromise: Promise<BridgeSocketBridge> | null = null;
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
          bridge = await createBridgeSocketBridge(
            toBridgeOptions(resolvedOptions),
          );
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
  options: BridgeSocketAdapterOptions = {},
): ViteBridgeLifecycle {
  return createBridgeLifecycle(options);
}

export function ensureStandaloneBridgeSingleton(
  options: BridgeSocketAdapterOptions,
): Promise<StandaloneBridgeServer> {
  const resolvedOptions = resolveAdapterOptions(options);
  const bridgeGlobal = globalThis as typeof globalThis & {
    [key: string]: Promise<StandaloneBridgeServer> | undefined;
  };
  const globalKey =
    resolvedOptions.nextBridgeGlobalKey ?? BRIDGESOCKET_NEXT_BRIDGE_GLOBAL_KEY;

  if (!bridgeGlobal[globalKey]) {
    const startupPromise = startStandaloneBridgeSocketBridgeServer(
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
    throw new Error("Failed to initialize standalone bridgesocket bridge");
  }

  return bridge;
}

export function normalizeRewrites(
  rewrites: BridgeSocketRewriteSpec | undefined,
): BridgeSocketNormalizedRewrites {
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
  rewriteSource = BRIDGESOCKET_BRIDGE_REWRITE_SOURCE,
): BridgeSocketRewriteRule {
  return {
    source: rewriteSource,
    destination: `${baseUrl}${rewriteSource}`,
  };
}

export function appendPlugin<T>(plugins: T[] | undefined, plugin: T): T[] {
  return [...(plugins ?? []), plugin];
}
