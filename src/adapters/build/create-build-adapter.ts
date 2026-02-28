import type {
  BridgeLifecycle,
  UniversaAdapterOptions,
} from "../shared/adapter-utils.js";
import {
  createSetupMiddlewaresBridgeLifecycle,
  withUniversaSetupMiddlewares,
  type SetupMiddlewaresConfig,
  type SetupMiddlewaresDevServerLike,
} from "./middleware-dev-server.js";

export type BuildToolDevServerLike = SetupMiddlewaresDevServerLike;
export type BuildToolConfig<TMiddlewares extends unknown[] = unknown[]> =
  SetupMiddlewaresConfig<TMiddlewares, BuildToolDevServerLike>;
export type BuildToolUniversaOptions = UniversaAdapterOptions;

export function createBuildToolBridgeLifecycle(
  options: BuildToolUniversaOptions = {},
): BridgeLifecycle {
  return createSetupMiddlewaresBridgeLifecycle(options);
}

export function withUniversaBuildTool<
  TMiddlewares extends unknown[],
  TDevServer extends BuildToolDevServerLike,
  TConfig extends SetupMiddlewaresConfig<TMiddlewares, TDevServer>,
>(
  config: TConfig,
  options: BuildToolUniversaOptions = {},
): TConfig & SetupMiddlewaresConfig<TMiddlewares, TDevServer> {
  return withUniversaSetupMiddlewares<TMiddlewares, TDevServer, TConfig>(
    config,
    options,
  );
}

