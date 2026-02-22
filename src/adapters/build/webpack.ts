import type {
  BridgeLifecycle,
  DevSocketAdapterOptions,
} from "../shared/adapter-utils.js";
import {
  createSetupMiddlewaresBridgeLifecycle,
  withDevSocketSetupMiddlewares,
  type SetupMiddlewaresApp,
  type SetupMiddlewaresConfig,
  type SetupMiddlewaresDevServerLike,
  type SetupMiddlewaresHttpServer,
} from "./middleware-dev-server.js";

export type WebpackLikeApp = SetupMiddlewaresApp;
export type WebpackLikeHttpServer = SetupMiddlewaresHttpServer;
export type WebpackDevServerLike = SetupMiddlewaresDevServerLike;
export type WebpackDevServerConfig<TMiddlewares extends unknown[] = unknown[]> =
  SetupMiddlewaresConfig<TMiddlewares, WebpackDevServerLike>;

export type WebpackDevSocketOptions = DevSocketAdapterOptions;

export function createWebpackBridgeLifecycle(
  options: WebpackDevSocketOptions = {},
): BridgeLifecycle {
  return createSetupMiddlewaresBridgeLifecycle(options);
}

export function withDevSocketWebpackDevServer<
  TMiddlewares extends unknown[],
  TConfig extends WebpackDevServerConfig<TMiddlewares>,
>(
  config: TConfig,
  options: WebpackDevSocketOptions = {},
): TConfig & WebpackDevServerConfig<TMiddlewares> {
  return withDevSocketSetupMiddlewares<
    TMiddlewares,
    WebpackDevServerLike,
    TConfig
  >(config, options);
}
