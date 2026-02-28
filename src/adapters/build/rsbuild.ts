import type { BridgeLifecycle, UniversaAdapterOptions } from "../shared/adapter-utils.js";
import {
  createBuildToolBridgeLifecycle,
  withUniversaBuildTool,
  type BuildToolConfig,
  type BuildToolDevServerLike,
} from "./create-build-adapter.js";

export type RsbuildDevServerLike = BuildToolDevServerLike;
export type RsbuildConfig<TMiddlewares extends unknown[] = unknown[]> =
  BuildToolConfig<TMiddlewares>;

export type RsbuildUniversaOptions = UniversaAdapterOptions;

export function createRsbuildBridgeLifecycle(
  options: RsbuildUniversaOptions = {},
): BridgeLifecycle {
  return createBuildToolBridgeLifecycle(options);
}

export function withUniversaRsbuild<
  TMiddlewares extends unknown[],
  TConfig extends RsbuildConfig<TMiddlewares>,
>(
  config: TConfig,
  options: RsbuildUniversaOptions = {},
): TConfig & RsbuildConfig<TMiddlewares> {
  return withUniversaBuildTool<TMiddlewares, RsbuildDevServerLike, TConfig>(
    config,
    options,
  );
}

