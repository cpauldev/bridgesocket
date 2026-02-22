import { afterEach, describe, expect, it } from "bun:test";

import { devSocketAstro } from "../adapters/framework/astro.js";
import { withDevSocket } from "../adapters/framework/next.js";
import { defineDevSocketNuxtModule } from "../adapters/framework/nuxt.js";
import {
  devSocketReactRouter,
  devSocketRemix,
} from "../adapters/framework/remix.js";
import { devSocketSvelteKit } from "../adapters/framework/sveltekit.js";
import { DEVSOCKET_NEXT_BRIDGE_GLOBAL_KEY } from "../adapters/shared/adapter-utils.js";
import { createDevSocketPlugin } from "../adapters/shared/plugin.js";
import { createMiddlewareAdapterServerFixture } from "./utils/adapter-server-fixtures.js";

const originalNodeEnv = process.env.NODE_ENV;

async function clearBridgeGlobals(): Promise<void> {
  const bridgeGlobal = globalThis as typeof globalThis & {
    [key: string]: unknown;
  };
  const cleanupTasks: Promise<void>[] = [];

  for (const key of Object.keys(bridgeGlobal)) {
    if (key.startsWith(DEVSOCKET_NEXT_BRIDGE_GLOBAL_KEY)) {
      const bridgePromise = bridgeGlobal[key] as
        | Promise<{ close?: () => Promise<void> }>
        | undefined;
      if (bridgePromise) {
        cleanupTasks.push(
          (async () => {
            try {
              const standalone = await bridgePromise;
              await standalone?.close?.();
            } catch {
              // Ignore bridge teardown failures in test cleanup.
            }
          })(),
        );
      }
      delete bridgeGlobal[key];
    }
  }

  await Promise.all(cleanupTasks);
}

afterEach(async () => {
  process.env.NODE_ENV = originalNodeEnv;
  await clearBridgeGlobals();
});

describe("devsocket adapters", () => {
  it("withDevSocket injects bridge rewrites first", async () => {
    process.env.NODE_ENV = "development";
    const testBridgeKey = `${DEVSOCKET_NEXT_BRIDGE_GLOBAL_KEY}:test-adapters`;
    const bridgeGlobal = globalThis as typeof globalThis & {
      [key: string]: unknown;
    };

    bridgeGlobal[testBridgeKey] = Promise.resolve({
      baseUrl: "http://127.0.0.1:41234",
      bridge: {} as never,
      close: async () => undefined,
    });

    const config = withDevSocket(
      {
        rewrites: async () => [
          {
            source: "/docs/:path*",
            destination: "/docs",
          },
        ],
      },
      { nextBridgeGlobalKey: testBridgeKey },
    );

    const rewrites = await config.rewrites?.();
    if (!rewrites) {
      throw new Error("Expected rewrites to be defined");
    }
    const normalized = Array.isArray(rewrites)
      ? {
          beforeFiles: rewrites,
          afterFiles: [],
          fallback: [],
        }
      : rewrites;

    expect(normalized.beforeFiles[0]).toEqual({
      source: "/__devsocket/:path*",
      destination: "http://127.0.0.1:41234/__devsocket/:path*",
    });
    expect(normalized.beforeFiles[1]).toEqual({
      source: "/docs/:path*",
      destination: "/docs",
    });

    delete bridgeGlobal[testBridgeKey];
  });

  it("withDevSocket is a no-op in production", () => {
    process.env.NODE_ENV = "production";
    const config = { trailingSlash: true };
    const wrapped = withDevSocket(config);
    expect(wrapped).toBe(config);
  });

  it("withDevSocket creates isolated bridge instances by default", async () => {
    process.env.NODE_ENV = "development";
    const passthroughRule = { source: "/noop/:path*", destination: "/noop" };

    const first = withDevSocket({ rewrites: async () => [passthroughRule] });
    const second = withDevSocket({ rewrites: async () => [passthroughRule] });

    const firstRewrites = await first.rewrites?.();
    const secondRewrites = await second.rewrites?.();
    if (!firstRewrites || !secondRewrites) {
      throw new Error("Expected rewrites to be defined");
    }

    const firstNormalized = Array.isArray(firstRewrites)
      ? { beforeFiles: firstRewrites, afterFiles: [], fallback: [] }
      : firstRewrites;
    const secondNormalized = Array.isArray(secondRewrites)
      ? { beforeFiles: secondRewrites, afterFiles: [], fallback: [] }
      : secondRewrites;

    const firstDestination = firstNormalized.beforeFiles[0]?.destination;
    const secondDestination = secondNormalized.beforeFiles[0]?.destination;

    expect(firstDestination).toBeDefined();
    expect(secondDestination).toBeDefined();
    expect(firstDestination).not.toBe(secondDestination);
  });

  it("defineDevSocketNuxtModule injects plugin hook only in dev", () => {
    const module = defineDevSocketNuxtModule();
    const hooks: Record<string, (...args: unknown[]) => void> = {};
    module.setup(
      {},
      {
        options: { dev: true },
        hook: (name: string, listener: (...args: unknown[]) => void) => {
          hooks[name] = listener;
        },
      },
    );

    expect(typeof hooks["vite:extendConfig"]).toBe("function");

    const config: { plugins?: unknown[] } = {};
    hooks["vite:extendConfig"]?.(config);
    expect(Array.isArray(config.plugins)).toBe(true);
    expect((config.plugins?.length || 0) > 0).toBe(true);

    const prodHooks: Record<string, (...args: unknown[]) => void> = {};
    module.setup(
      {},
      {
        options: { dev: false },
        hook: (name: string, listener: (...args: unknown[]) => void) => {
          prodHooks[name] = listener;
        },
      },
    );
    expect(prodHooks["vite:extendConfig"]).toBeUndefined();
  });

  it("devSocketAstro wires setup and teardown hooks", async () => {
    const integration = devSocketAstro({ autoStart: false });
    const fixture = createMiddlewareAdapterServerFixture();

    await (
      integration.hooks["astro:server:setup"] as (context: {
        server: ReturnType<
          typeof createMiddlewareAdapterServerFixture
        >["server"];
      }) => Promise<void>
    )({ server: fixture.server });

    expect(fixture.getMiddlewareCount()).toBe(1);
    expect(fixture.getListenerCount("upgrade")).toBe(1);
    expect(fixture.getListenerCount("close")).toBe(1);

    await (integration.hooks["astro:server:done"] as () => Promise<void>)();
  });

  it("createDevSocketPlugin configures Vite middleware bridge", async () => {
    const plugin = createDevSocketPlugin({ autoStart: false });
    const pluginObject = Array.isArray(plugin) ? plugin[0] : plugin;
    const fixture = createMiddlewareAdapterServerFixture();

    expect(pluginObject?.name).toBe("devsocket-bridge");
    expect(pluginObject?.enforce).toBe("pre");

    await pluginObject?.configureServer?.(fixture.server as never);
    expect(fixture.getMiddlewareCount()).toBe(1);
    expect(fixture.getListenerCount("upgrade")).toBe(1);
    expect(fixture.getListenerCount("close")).toBe(1);

    fixture.emit("close");
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it("devSocketSvelteKit returns a Vite-compatible plugin", async () => {
    const plugin = devSocketSvelteKit({ autoStart: false });
    const pluginObject = Array.isArray(plugin) ? plugin[0] : plugin;
    const fixture = createMiddlewareAdapterServerFixture();

    expect(pluginObject?.name).toBe("devsocket-bridge");
    await pluginObject?.configureServer?.(fixture.server as never);
    expect(fixture.getMiddlewareCount()).toBe(1);
  });

  it("devSocketRemix and devSocketReactRouter return Vite-compatible plugins", async () => {
    const remixPlugin = devSocketRemix({ autoStart: false });
    const reactRouterPlugin = devSocketReactRouter({ autoStart: false });
    const remixObject = Array.isArray(remixPlugin)
      ? remixPlugin[0]
      : remixPlugin;
    const reactRouterObject = Array.isArray(reactRouterPlugin)
      ? reactRouterPlugin[0]
      : reactRouterPlugin;
    const remixFixture = createMiddlewareAdapterServerFixture();
    const reactRouterFixture = createMiddlewareAdapterServerFixture();

    await remixObject?.configureServer?.(remixFixture.server as never);
    await reactRouterObject?.configureServer?.(
      reactRouterFixture.server as never,
    );

    expect(remixFixture.getMiddlewareCount()).toBe(1);
    expect(reactRouterFixture.getMiddlewareCount()).toBe(1);
  });
});
