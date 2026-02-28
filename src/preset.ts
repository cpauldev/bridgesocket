import {
  type RsbuildConfig,
  type RsbuildUniversaOptions,
  withUniversaRsbuild,
} from "./adapters/build/rsbuild.js";
import {
  type RspackConfig,
  type RspackUniversaOptions,
  withUniversaRspack,
} from "./adapters/build/rspack.js";
import {
  type WebpackDevServerConfig,
  type WebpackUniversaOptions,
  withUniversaWebpackDevServer,
} from "./adapters/build/webpack.js";
import {
  type AngularCliUniversaOptions,
  type AngularCliUniversaProxyConfig,
  createUniversaAngularCliProxyConfig,
  startUniversaAngularCliBridge,
  withUniversaAngularCliProxyConfig,
} from "./adapters/framework/angular-cli.js";
import {
  type AstroUniversaOptions,
  createUniversaAstroIntegration,
} from "./adapters/framework/astro.js";
import {
  type UniversaNextOptions,
  withUniversaNext,
} from "./adapters/framework/next.js";
import {
  type UniversaNuxtOptions,
  createUniversaNuxtModule,
} from "./adapters/framework/nuxt.js";
import {
  type BunBridgeHandle,
  type BunUniversaOptions,
  attachUniversaToBunServe,
} from "./adapters/server/bun.js";
import {
  type FastifyBridgeHandle,
  type FastifyLikeInstance,
  type FastifyUniversaOptions,
  attachUniversaToFastify,
} from "./adapters/server/fastify.js";
import {
  type HonoBridgeHandle,
  type HonoNodeServer,
  type HonoUniversaOptions,
  attachUniversaToHonoNodeServer,
} from "./adapters/server/hono.js";
import {
  type NodeBridgeHandle,
  type NodeUniversaOptions,
  attachUniversaToNodeServer,
} from "./adapters/server/node.js";
import {
  type UniversaVitePluginOptions,
  createUniversaVitePlugin,
} from "./adapters/shared/plugin.js";

export type UniversaToolPresetOptions = UniversaVitePluginOptions;

export interface UniversaToolPreset {
  vite: (
    options?: UniversaVitePluginOptions,
  ) => ReturnType<typeof createUniversaVitePlugin>;
  next: <T extends object>(nextConfig: T, options?: UniversaNextOptions) => T;
  nuxt: (
    options?: UniversaNuxtOptions,
  ) => ReturnType<typeof createUniversaNuxtModule>;
  astro: (
    options?: AstroUniversaOptions,
  ) => ReturnType<typeof createUniversaAstroIntegration>;
  angularCli: {
    startBridge: (
      options?: AngularCliUniversaOptions,
    ) => ReturnType<typeof startUniversaAngularCliBridge>;
    createProxyConfig: (
      options?: AngularCliUniversaOptions,
    ) => ReturnType<typeof createUniversaAngularCliProxyConfig>;
    withProxyConfig: (
      existingProxyConfig?: AngularCliUniversaProxyConfig,
      options?: AngularCliUniversaOptions,
    ) => ReturnType<typeof withUniversaAngularCliProxyConfig>;
  };
  bun: {
    attach: (options?: BunUniversaOptions) => Promise<BunBridgeHandle>;
  };
  node: {
    attach: (
      server: Parameters<typeof attachUniversaToNodeServer>[0],
      options?: NodeUniversaOptions,
    ) => Promise<NodeBridgeHandle>;
  };
  fastify: {
    attach: (
      fastify: FastifyLikeInstance,
      options?: FastifyUniversaOptions,
    ) => Promise<FastifyBridgeHandle>;
  };
  hono: {
    attach: (
      server: HonoNodeServer,
      options?: HonoUniversaOptions,
    ) => Promise<HonoBridgeHandle>;
  };
  webpack: {
    withDevServer: <
      TMiddlewares extends unknown[],
      TConfig extends WebpackDevServerConfig<TMiddlewares>,
    >(
      config: TConfig,
      options?: WebpackUniversaOptions,
    ) => TConfig & WebpackDevServerConfig<TMiddlewares>;
  };
  rsbuild: {
    withDevServer: <
      TMiddlewares extends unknown[],
      TConfig extends RsbuildConfig<TMiddlewares>,
    >(
      config: TConfig,
      options?: RsbuildUniversaOptions,
    ) => TConfig & RsbuildConfig<TMiddlewares>;
  };
  rspack: {
    withDevServer: <
      TMiddlewares extends unknown[],
      TConfig extends RspackConfig<TMiddlewares>,
    >(
      config: TConfig,
      options?: RspackUniversaOptions,
    ) => TConfig & RspackConfig<TMiddlewares>;
  };
}

function mergeOptions<T extends object>(
  baseOptions: UniversaToolPresetOptions,
  options?: T,
): UniversaToolPresetOptions & T {
  return { ...baseOptions, ...(options ?? ({} as T)) };
}

export function createUniversaToolPreset(
  baseOptions: UniversaToolPresetOptions = {},
): UniversaToolPreset {
  return {
    vite: (options = {}) =>
      createUniversaVitePlugin(mergeOptions(baseOptions, options)),
    next<T extends object>(
      nextConfig: T,
      options: UniversaNextOptions = {},
    ): T {
      return withUniversaNext(nextConfig, mergeOptions(baseOptions, options));
    },
    nuxt: (options = {}) =>
      createUniversaNuxtModule(mergeOptions(baseOptions, options)),
    astro: (options = {}) =>
      createUniversaAstroIntegration(mergeOptions(baseOptions, options)),
    angularCli: {
      startBridge: (options = {}) =>
        startUniversaAngularCliBridge(mergeOptions(baseOptions, options)),
      createProxyConfig: (options = {}) =>
        createUniversaAngularCliProxyConfig(mergeOptions(baseOptions, options)),
      withProxyConfig: (existingProxyConfig = {}, options = {}) =>
        withUniversaAngularCliProxyConfig(
          existingProxyConfig,
          mergeOptions(baseOptions, options),
        ),
    },
    bun: {
      attach: (options = {}) =>
        attachUniversaToBunServe(mergeOptions(baseOptions, options)),
    },
    node: {
      attach: (server, options = {}) =>
        attachUniversaToNodeServer(server, mergeOptions(baseOptions, options)),
    },
    fastify: {
      attach: (fastify, options = {}) =>
        attachUniversaToFastify(fastify, mergeOptions(baseOptions, options)),
    },
    hono: {
      attach: (server, options = {}) =>
        attachUniversaToHonoNodeServer(
          server,
          mergeOptions(baseOptions, options),
        ),
    },
    webpack: {
      withDevServer: (config, options = {}) =>
        withUniversaWebpackDevServer(
          config,
          mergeOptions(baseOptions, options),
        ),
    },
    rsbuild: {
      withDevServer: (config, options = {}) =>
        withUniversaRsbuild(config, mergeOptions(baseOptions, options)),
    },
    rspack: {
      withDevServer: (config, options = {}) =>
        withUniversaRspack(config, mergeOptions(baseOptions, options)),
    },
  };
}
