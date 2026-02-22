import { createUnplugin } from "unplugin";

import {
  type DevSocketAdapterOptions,
  type ViteAdapterServer,
  createBridgeLifecycle,
  resolveAdapterOptions,
} from "./adapter-utils.js";

export type DevSocketPluginOptions = DevSocketAdapterOptions;

const unplugin = createUnplugin<DevSocketPluginOptions | undefined>(
  (options = {}) => {
    const resolvedOptions = resolveAdapterOptions(options);
    const lifecycle = createBridgeLifecycle(resolvedOptions);

    return {
      name: resolvedOptions.adapterName,
      enforce: "pre",
      vite: {
        async configureServer(server: ViteAdapterServer) {
          await lifecycle.setup(server);
        },
      },
    };
  },
);

export const createDevSocketPlugin = unplugin.vite;

export { unplugin as devSocketUnplugin };
