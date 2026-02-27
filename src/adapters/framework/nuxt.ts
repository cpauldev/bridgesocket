import { isEventsUpgradePath } from "../../bridge/router.js";
import {
  type BridgeSocketAdapterOptions,
  type MiddlewareAdapterServer,
  appendPlugin,
  createBridgeLifecycle,
  resolveAdapterOptions,
} from "../shared/adapter-utils.js";

export type BridgeSocketNuxtOptions = BridgeSocketAdapterOptions;

const OVERLAY_VIRTUAL_ID = "bridgesocket:overlay-init";
const RESOLVED_OVERLAY_VIRTUAL_ID = `\0${OVERLAY_VIRTUAL_ID}`;

export function createBridgeSocketNuxtModule(
  options: BridgeSocketNuxtOptions = {},
) {
  const resolvedOptions = resolveAdapterOptions(options);
  const overlayModule = resolvedOptions.overlayModule;
  const lifecycle = createBridgeLifecycle(resolvedOptions);
  let lastViteServer: MiddlewareAdapterServer | null = null;

  const bridgePlugin = {
    name: resolvedOptions.adapterName,
    enforce: "pre" as const,

    resolveId(id: string) {
      if (overlayModule && id === OVERLAY_VIRTUAL_ID) {
        return RESOLVED_OVERLAY_VIRTUAL_ID;
      }
    },

    load(id: string) {
      if (overlayModule && id === RESOLVED_OVERLAY_VIRTUAL_ID) {
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

    async configureServer(server: MiddlewareAdapterServer) {
      lastViteServer = server;
      await lifecycle.setup(server);
    },
  };

  const meta = {
    name: resolvedOptions.adapterName,
    configKey: "bridgeSocket",
  };

  function hasPluginWithName(
    plugins: unknown[] | undefined,
    name: string,
  ): boolean {
    if (!plugins?.length) return false;
    return plugins.some((plugin) => {
      if (!plugin || typeof plugin !== "object") return false;
      const candidate = plugin as { name?: unknown };
      return typeof candidate.name === "string" && candidate.name === name;
    });
  }

  function setup(_moduleOptions: unknown, nuxt: Record<string, unknown>) {
    const nuxtOptions = (nuxt.options || {}) as {
      dev?: boolean;
      build?: { templates?: unknown[] };
      plugins?: unknown[];
    };
    if (!nuxtOptions.dev) return;

    // Nuxt does not reliably run transformIndexHtml on every navigation path.
    // Register a client plugin to ensure the overlay module is always imported.
    if (overlayModule) {
      const templateFilename = `${resolvedOptions.adapterName}-overlay.client.mjs`;
      const templatePath = `#build/${templateFilename}`;
      const buildTemplates = (nuxtOptions.build ??= {}).templates ?? [];
      (nuxtOptions.build as { templates: unknown[] }).templates =
        buildTemplates;

      const hasTemplate = buildTemplates.some((entry) => {
        if (!entry || typeof entry !== "object") return false;
        const template = entry as { filename?: unknown };
        return template.filename === templateFilename;
      });

      if (!hasTemplate) {
        buildTemplates.push({
          filename: templateFilename,
          write: true,
          getContents: () =>
            `import ${JSON.stringify(overlayModule)};\nexport default () => {};`,
        });
      }

      const plugins = nuxtOptions.plugins ?? [];
      nuxtOptions.plugins = plugins;
      const hasClientPlugin = plugins.some((entry) => {
        if (!entry || typeof entry !== "object") return false;
        const plugin = entry as { src?: unknown };
        return plugin.src === templatePath;
      });
      if (!hasClientPlugin) {
        plugins.push({ src: templatePath, mode: "client" });
      }
    }

    const hook = (nuxt.hook || (() => undefined)) as (
      name: string,
      callback: (...args: unknown[]) => void,
    ) => void;

    hook("vite:extendConfig", ((config: { plugins?: unknown[] }) => {
      if (hasPluginWithName(config.plugins, bridgePlugin.name)) return;
      config.plugins = appendPlugin(config.plugins, bridgePlugin);
    }) as (...args: unknown[]) => void);

    hook("listen", ((listenerServer: {
      on: (
        event: "upgrade" | "close",
        listener: (...args: unknown[]) => void,
      ) => void;
      listeners: (
        event: "upgrade" | "close",
      ) => ((...args: unknown[]) => void)[];
      removeAllListeners: (event: "upgrade" | "close") => void;
      __bridgeSocketAttached?: boolean;
    }) => {
      if (listenerServer.__bridgeSocketAttached) return;
      listenerServer.__bridgeSocketAttached = true;

      if (lastViteServer) {
        void lifecycle.setup(lastViteServer);
      }

      const existingUpgradeListeners = listenerServer.listeners("upgrade");
      listenerServer.removeAllListeners("upgrade");
      listenerServer.on("upgrade", (...args: unknown[]) => {
        const [req, socket, head] = args as [
          import("http").IncomingMessage,
          import("stream").Duplex,
          Buffer,
        ];

        if (
          isEventsUpgradePath(
            req.url || "/",
            resolvedOptions.bridgePathPrefix ?? "/__bridgesocket",
          )
        ) {
          const bridge = lifecycle.getBridge();
          if (!bridge) {
            socket.destroy();
            return;
          }
          bridge.handleUpgrade(req, socket, head);
          return;
        }

        for (const listener of existingUpgradeListeners) {
          listener(req, socket, head);
        }
      });

      listenerServer.on("close", () => {
        void lifecycle.teardown();
      });
    }) as (...args: unknown[]) => void);
  }

  return Object.assign(setup, { meta });
}
