import type { BridgeLifecycle, UniversaAdapterOptions } from "../shared/adapter-utils.js";
import {
  createBuildToolBridgeLifecycle,
  withUniversaBuildTool,
  type BuildToolConfig,
  type BuildToolDevServerLike,
} from "./create-build-adapter.js";
import type {
  SetupMiddlewaresApp,
  SetupMiddlewaresHttpServer,
} from "./middleware-dev-server.js";

export type WebpackLikeApp = SetupMiddlewaresApp;
export type WebpackLikeHttpServer = SetupMiddlewaresHttpServer;
export type WebpackDevServerLike = BuildToolDevServerLike;
export type WebpackDevServerConfig<TMiddlewares extends unknown[] = unknown[]> =
  BuildToolConfig<TMiddlewares>;

export type WebpackUniversaOptions = UniversaAdapterOptions;

export function createWebpackBridgeLifecycle(
  options: WebpackUniversaOptions = {},
): BridgeLifecycle {
  return createBuildToolBridgeLifecycle(options);
}

export function withUniversaWebpackDevServer<
  TMiddlewares extends unknown[],
  TConfig extends WebpackDevServerConfig<TMiddlewares>,
>(
  config: TConfig,
  options: WebpackUniversaOptions = {},
): TConfig & WebpackDevServerConfig<TMiddlewares> {
  return withUniversaBuildTool<TMiddlewares, WebpackDevServerLike, TConfig>(
    config,
    options,
  );
}

