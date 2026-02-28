export {
  createUniversaBridge,
  UniversaBridge,
  type UniversaBridgeOptions,
} from "./bridge/bridge.js";
export {
  UNIVERSA_PROTOCOL_VERSION,
  UNIVERSA_WS_SUBPROTOCOL,
} from "./bridge/constants.js";
export {
  startStandaloneUniversaBridgeServer,
  type StandaloneBridgeServer,
} from "./bridge/standalone.js";
export {
  createUniversaVitePlugin,
  type UniversaVitePluginOptions,
} from "./adapters/shared/plugin.js";
export {
  withUniversaNext,
  type UniversaNextOptions,
} from "./adapters/framework/next.js";
export {
  createUniversaAstroIntegration,
  type AstroUniversaOptions,
} from "./adapters/framework/astro.js";
export {
  createUniversaAngularCliProxyConfig,
  startUniversaAngularCliBridge,
  withUniversaAngularCliProxyConfig,
  type AngularCliUniversaOptions,
  type AngularCliUniversaProxyConfig,
  type AngularCliProxyTarget,
} from "./adapters/framework/angular-cli.js";
export {
  createUniversaNuxtModule,
  type UniversaNuxtOptions,
} from "./adapters/framework/nuxt.js";
export {
  attachUniversaToBunServe,
  withUniversaBunServeFetch,
  withUniversaBunServeWebSocketHandlers,
  type BunBridgeHandle,
  type BunUniversaOptions,
  type BunServeFetchHandler,
  type BunServeLikeServer,
  type BunServeLikeWebSocket,
  type BunServeNextFetchHandler,
  type BunServeWebSocketHandlers,
} from "./adapters/server/bun.js";
export {
  attachUniversaToNodeServer,
  createNodeBridgeLifecycle,
  type NodeBridgeHandle,
  type NodeUniversaOptions,
} from "./adapters/server/node.js";
export {
  attachUniversaToFastify,
  type FastifyBridgeHandle,
  type FastifyUniversaOptions,
  type FastifyLikeInstance,
  type FastifyLikeReply,
  type FastifyLikeRequest,
} from "./adapters/server/fastify.js";
export {
  attachUniversaToHonoNodeServer,
  createHonoBridgeLifecycle,
  type HonoBridgeHandle,
  type HonoUniversaOptions,
  type HonoNodeServer,
} from "./adapters/server/hono.js";
export {
  createWebpackBridgeLifecycle,
  withUniversaWebpackDevServer,
  type WebpackDevServerConfig,
  type WebpackDevServerLike,
  type WebpackUniversaOptions,
  type WebpackLikeApp,
  type WebpackLikeHttpServer,
} from "./adapters/build/webpack.js";
export {
  createRsbuildBridgeLifecycle,
  withUniversaRsbuild,
  type RsbuildConfig,
  type RsbuildDevServerLike,
  type RsbuildUniversaOptions,
} from "./adapters/build/rsbuild.js";
export {
  createRspackBridgeLifecycle,
  withUniversaRspack,
  type RspackConfig,
  type RspackDevServerLike,
  type RspackUniversaOptions,
} from "./adapters/build/rspack.js";
export {
  RuntimeHelper,
  type RuntimeHelperOptions,
  type RuntimeControlSupport,
} from "./runtime/runtime-helper.js";
export {
  UniversaClientError,
  createUniversaClient,
  type UniversaBridgeHealth,
  type UniversaClient,
  type UniversaClientOptions,
  type UniversaEventsSubscriptionOptions,
  type UniversaWebSocketLike,
} from "./client/client.js";
export type {
  UniversaBridgeCapabilities,
  UniversaBridgeEvent,
  UniversaBridgeInstance,
  UniversaBridgeState,
  UniversaCommandRequest,
  UniversaCommandResult,
  UniversaErrorCode,
  UniversaErrorPayload,
  UniversaErrorResponse,
  UniversaProtocolVersion,
  UniversaRuntimePhase,
  UniversaRuntimeStatus,
} from "./types.js";
