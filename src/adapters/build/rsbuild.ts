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

export type RsbuildDevServerLike = SetupMiddlewaresDevServerLike;
export type RsbuildConfig<TMiddlewares extends unknown[] = unknown[]> =
  SetupMiddlewaresConfig<TMiddlewares, RsbuildDevServerLike>;

export type RsbuildDevSocketOptions = DevSocketAdapterOptions;

export function createRsbuildBridgeLifecycle(
  options: RsbuildDevSocketOptions = {},
): BridgeLifecycle {
  return createSetupMiddlewaresBridgeLifecycle(options);
}

export function withDevSocketRsbuild<
  TMiddlewares extends unknown[],
  TConfig extends RsbuildConfig<TMiddlewares>,
>(
  config: TConfig,
  options: RsbuildDevSocketOptions = {},
): TConfig & RsbuildConfig<TMiddlewares> {
  return withDevSocketSetupMiddlewares<
    TMiddlewares,
    RsbuildDevServerLike,
    TConfig
  >(config, options);
}
