import type {
  BridgeLifecycle,
  DevSocketAdapterOptions,
} from "../shared/adapter-utils.js";
import {
  createSetupMiddlewaresBridgeLifecycle,
  withDevSocketSetupMiddlewares,
  type SetupMiddlewaresConfig,
  type SetupMiddlewaresDevServerLike,
} from "./middleware-dev-server.js";

export type RspackDevServerLike = SetupMiddlewaresDevServerLike;
export type RspackConfig<TMiddlewares extends unknown[] = unknown[]> =
  SetupMiddlewaresConfig<TMiddlewares, RspackDevServerLike>;

export type RspackDevSocketOptions = DevSocketAdapterOptions;

export function createRspackBridgeLifecycle(
  options: RspackDevSocketOptions = {},
): BridgeLifecycle {
  return createSetupMiddlewaresBridgeLifecycle(options);
}

export function withDevSocketRspack<
  TMiddlewares extends unknown[],
  TConfig extends RspackConfig<TMiddlewares>,
>(
  config: TConfig,
  options: RspackDevSocketOptions = {},
): TConfig & RspackConfig<TMiddlewares> {
  return withDevSocketSetupMiddlewares<
    TMiddlewares,
    RspackDevServerLike,
    TConfig
  >(config, options);
}
