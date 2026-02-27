import {
  type BridgeSocketAdapterOptions,
  type MiddlewareAdapterServer,
  createBridgeLifecycle,
  resolveAdapterOptions,
} from "../shared/adapter-utils.js";

export type AstroBridgeSocketOptions = BridgeSocketAdapterOptions;

export function createBridgeSocketAstroIntegration(
  options: AstroBridgeSocketOptions = {},
) {
  const resolvedOptions = resolveAdapterOptions(options);
  const lifecycle = createBridgeLifecycle(resolvedOptions);
  const overlayModule = resolvedOptions.overlayModule;

  return {
    name: resolvedOptions.adapterName,
    hooks: {
      "astro:config:setup": ({
        command,
        injectScript,
      }: {
        command?: string;
        injectScript?: (stage: string, content: string) => void;
      }) => {
        if (overlayModule && command === "dev" && injectScript) {
          injectScript("page", `import ${JSON.stringify(overlayModule)};`);
        }
      },
      "astro:server:setup": async ({
        server,
      }: {
        server: MiddlewareAdapterServer;
      }) => {
        await lifecycle.setup(server);
      },
      "astro:server:done": async () => {
        await lifecycle.teardown();
      },
    },
  };
}
