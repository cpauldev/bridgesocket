export {
  DEVSOCKET_BRIDGE_PATH_PREFIX,
  DEVSOCKET_BRIDGE_REWRITE_SOURCE,
  DEVSOCKET_DEV_ADAPTER_NAME,
  DEVSOCKET_NEXT_BRIDGE_GLOBAL_KEY,
  appendPlugin,
  attachBridgeToServer,
  attachBridgeToViteServer,
  createBridgeRewriteRoute,
  createBridgeLifecycle,
  createViteBridgeLifecycle,
  ensureStandaloneBridgeSingleton,
  normalizeRewrites,
  resolveAdapterOptions,
  type BridgeLifecycle,
  type DevSocketAdapterOptions,
  type DevSocketNormalizedRewrites,
  type DevSocketRewriteRule,
  type DevSocketRewriteSpec,
  type MiddlewareAdapterServer,
  type ViteAdapterServer,
  type ViteBridgeLifecycle,
} from "./adapters/shared/adapter-utils.js";
export {
  createSetupMiddlewaresBridgeLifecycle,
  withDevSocketSetupMiddlewares,
} from "./adapters/build/middleware-dev-server.js";
export type {
  SetupMiddlewaresApp,
  SetupMiddlewaresConfig,
  SetupMiddlewaresDevServerLike,
  SetupMiddlewaresHttpServer,
} from "./adapters/build/middleware-dev-server.js";
