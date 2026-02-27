import {
  type BridgeSocketAdapterOptions,
  type ViteAdapterServer,
  createBridgeLifecycle,
  resolveAdapterOptions,
} from "./adapter-utils.js";

const OVERLAY_VIRTUAL_ID = "bridgesocket:overlay-init";
const RESOLVED_OVERLAY_VIRTUAL_ID = `\0${OVERLAY_VIRTUAL_ID}`;

export type BridgeSocketVitePluginOptions = BridgeSocketAdapterOptions;
export function createBridgeSocketVitePlugin(
  options: BridgeSocketVitePluginOptions = {},
) {
  const resolvedOptions = resolveAdapterOptions(options);
  const lifecycle = createBridgeLifecycle(resolvedOptions);
  const overlayModule = resolvedOptions.overlayModule;

  return {
    name: resolvedOptions.adapterName,
    enforce: "pre" as const,

    resolveId(id: string) {
      if (overlayModule && id === OVERLAY_VIRTUAL_ID) {
        return RESOLVED_OVERLAY_VIRTUAL_ID;
      }
    },

    load(id: string) {
      if (overlayModule && id === RESOLVED_OVERLAY_VIRTUAL_ID) {
        // import.meta.hot.accept prevents HMR from propagating up to a
        // full-page reload when RSC plugins invalidate the module graph.
        // The empty callback means: accept the update silently (no-op).
        return [
          `import ${JSON.stringify(overlayModule)};`,
          `if (import.meta.hot) { import.meta.hot.accept(() => {}); }`,
        ].join("\n");
      }
    },

    transformIndexHtml: {
      order: "pre" as const,
      handler(_html: string, ctx: { server?: unknown }) {
        if (!overlayModule || !ctx.server) return [];
        return [
          {
            tag: "script",
            attrs: { type: "module", src: `/@id/${OVERLAY_VIRTUAL_ID}` },
            injectTo: "head-prepend" as const,
          },
        ];
      },
    },

    async configureServer(server: ViteAdapterServer) {
      await lifecycle.setup(server);
    },
  };
}
