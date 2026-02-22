import {
  type DevSocketAdapterOptions,
  appendPlugin,
  resolveAdapterOptions,
} from "../shared/adapter-utils.js";
import { createDevSocketPlugin } from "../shared/plugin.js";

export type NuxtDevSocketOptions = DevSocketAdapterOptions;

export function defineDevSocketNuxtModule(options: NuxtDevSocketOptions = {}) {
  const resolvedOptions = resolveAdapterOptions(options);

  return {
    meta: {
      name: resolvedOptions.adapterName,
      configKey: "devSocket",
    },
    setup: (_moduleOptions: unknown, nuxt: Record<string, unknown>) => {
      const nuxtOptions = (nuxt.options || {}) as { dev?: boolean };
      if (!nuxtOptions.dev) return;

      const hook = (nuxt.hook || (() => undefined)) as (
        name: string,
        callback: (...args: unknown[]) => void,
      ) => void;

      hook("vite:extendConfig", ((config: { plugins?: unknown[] }) => {
        config.plugins = appendPlugin(
          config.plugins,
          createDevSocketPlugin(resolvedOptions),
        );
      }) as (...args: unknown[]) => void);
    },
  };
}
