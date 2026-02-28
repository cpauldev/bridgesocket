import type { BridgeLifecycle, UniversaAdapterOptions } from "../shared/adapter-utils.js";
import {
  createBuildToolBridgeLifecycle,
  withUniversaBuildTool,
  type BuildToolConfig,
  type BuildToolDevServerLike,
} from "./create-build-adapter.js";

export type RspackDevServerLike = BuildToolDevServerLike;
export type RspackConfig<TMiddlewares extends unknown[] = unknown[]> =
  BuildToolConfig<TMiddlewares>;

export type RspackUniversaOptions = UniversaAdapterOptions;

export function createRspackBridgeLifecycle(
  options: RspackUniversaOptions = {},
): BridgeLifecycle {
  return createBuildToolBridgeLifecycle(options);
}

export function withUniversaRspack<
  TMiddlewares extends unknown[],
  TConfig extends RspackConfig<TMiddlewares>,
>(
  config: TConfig,
  options: RspackUniversaOptions = {},
): TConfig & RspackConfig<TMiddlewares> {
  return withUniversaBuildTool<TMiddlewares, RspackDevServerLike, TConfig>(
    config,
    options,
  );
}

