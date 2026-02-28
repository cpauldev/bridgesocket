# UniversaKit 🪼

<p align="center">
  <img src="assets/jellyfishy.png" alt="Universa jellyfish mascot" width="80" style="vertical-align: middle;" />
  <img src="assets/universa-logo.png" alt="Universa logo" width="480" style="vertical-align: middle;" />
</p>

<p align="center">
  <a href="https://github.com/cpauldev/universa-kit/actions/workflows/ci.yml"><img alt="build" src="https://img.shields.io/github/actions/workflow/status/cpauldev/universa-kit/ci.yml?branch=main&style=for-the-badge&label=build" height="28" style="vertical-align: middle;" /></a>
  <a href="https://github.com/cpauldev/universa-kit/releases"><img alt="release" src="https://img.shields.io/github/v/release/cpauldev/universa-kit?style=for-the-badge&label=release" height="28" style="vertical-align: middle;" /></a>
  <a href="LICENSE"><img alt="license" src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" height="28" style="vertical-align: middle;" /></a>
</p>

**Universa** allows developers to build cross-framework companion applications that run locally during development as overlays, sidebars, and panels. Users can install your package, start their project's dev server, and get the same experience across Next.js, Angular, Vue, Solid, Astro, Nuxt, SvelteKit, TanStack Start, Remix, Vinext, and more.

Every web framework ships its own dev server with different middleware APIs, plugin systems, and configuration hooks. There has been no standard way to mount a companion application at the same origin across all of them — so tools built for Next.js don't work in Vite, tools built for Vite don't work in Angular, and so on.

Universa is a universal bridge that mounts a same-origin control plane (`/__universa/*`) on your host dev server. This lets browser UIs and local clients read state, stream events, control the runtime lifecycle, and proxy runtime APIs consistently across frameworks. Businesses can now offer richer service experiences as web applications while reaching as many developers as possible.

_Universa primarily targets browser-based dev UIs, but the same bridge also works for non-UI local clients such as scripts and CLIs. Universa is compatible with tunnels like Cloudflare Tunnel._

## Who Should Use This

| You are...                                                | Should you use Universa directly? | Why                                                                                         |
| --------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------- |
| Building a developer tool (overlay/sidebar/control panel) | Yes                               | Universa provides framework adapters, bridge routes, runtime control, and event streaming.  |
| Building custom internal developer tooling                | Yes                               | Use Universa directly to mount same-origin bridge APIs and optional runtime control in dev. |
| Using a tool that already ships Universa integration      | No                                | Follow that tool's setup instructions; the integration is already handled.                  |

## Table Of Contents

- [What It Provides](#what-it-provides)
- [Use Cases](#use-cases)
- [Install](#install)
- [Quick Start](#quick-start)
- [Integration Surfaces](#integration-surfaces)
- [API Naming Patterns](#api-naming-patterns)
- [Configuration](#configuration)
- [Bridge Routes](#bridge-routes)
- [Bridge Events](#bridge-events)
- [Client API (`universa-kit/client`)](#client-api-universa-kitclient)
- [Adapter Examples](#adapter-examples) (Next.js, Vinext, Astro, Nuxt, Angular CLI, Bun.serve, Node, Webpack)
- [Examples](#examples)
- [Next.js Bridge Keys](#nextjs-bridge-keys)
- [Compatibility](#compatibility)
- [Documentation](#documentation)
- [Packaging](#packaging)

## What It Provides

- same-origin bridge routes (default prefix: `/__universa`)
- runtime lifecycle control (`start`, `restart` require `command`; `stop` is idempotent)
- runtime status state for UI and automation
- versioned bridge contract (`protocolVersion: "1"`)
- websocket event stream (`/__universa/events`) with ordered event IDs
- API proxying from host origin to runtime origin (`/__universa/api/*`)
- binary proxy fidelity and multi-value `Set-Cookie` forwarding
- typed client helpers via `universa-kit/client`
- framework/server/build-tool adapters

Universa does not include a first-party UI, app scaffolding, or hosted cloud services.

## Use Cases

- Cross-framework SaaS services with auth and subscription flows
- AI code-assistance overlays with page annotations
- Extension marketplaces for local development apps
- UI component-library drag-and-drop and page editing tools
- Error triage, debugging, and AI-assisted remediation workflows
- Localization and internationalization management systems

## Install

```bash
npm i universa-kit
```

```bash
pnpm add universa-kit
```

```bash
yarn add universa-kit
```

```bash
bun add universa-kit
```

## Quick Start

```ts
// vite.config.ts
import { createUniversaVitePlugin } from "universa-kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    createUniversaVitePlugin({
      command: "node",
      args: ["./scripts/dev-runtime.js"],
    }),
  ],
});
```

If your package wraps this integration, your end users typically only install your package and run their usual `dev` command.

## Integration Surfaces

| Host setup                                                                                                      | Import path                | Use when                                         |
| --------------------------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------ |
| Vite-based framework (React, Vue, Solid, SvelteKit, TanStack Start, Remix, React Router, Angular Vite pipeline) | `universa-kit/vite`        | You want one Vite plugin path.                   |
| Vinext (Vite-based Next.js)                                                                                     | `universa-kit/vite`        | Vinext uses the Vite plugin path directly.       |
| Next.js                                                                                                         | `universa-kit/next`        | You want a Next config wrapper and rewrite flow. |
| Nuxt                                                                                                            | `universa-kit/nuxt`        | You want a Nuxt module integration.              |
| Astro                                                                                                           | `universa-kit/astro`       | You want Astro integration hooks.                |
| Angular CLI (non-Vite pipeline)                                                                                 | `universa-kit/angular/cli` | You need generated proxy config for `ng serve`.  |
| `Bun.serve`                                                                                                     | `universa-kit/bun`         | You need Bun-native fetch/websocket handlers.    |
| Node middleware + HTTP server                                                                                   | `universa-kit/node`        | You want direct server attachment.               |
| Fastify                                                                                                         | `universa-kit/fastify`     | You want Fastify hook-based integration.         |
| Hono on Node server                                                                                             | `universa-kit/hono`        | You want Hono Node server attachment.            |
| webpack-dev-server                                                                                              | `universa-kit/webpack`     | You want build-tool level middleware wiring.     |
| Rsbuild                                                                                                         | `universa-kit/rsbuild`     | You want build-tool level middleware wiring.     |
| Rspack                                                                                                          | `universa-kit/rspack`      | You want build-tool level middleware wiring.     |

Runtime note:

- `universa-kit/node` refers to a Node-style server interface, not Node-only runtime.
- for `Bun.serve`, use `universa-kit/bun`.
- Universa supports Node and Bun runtimes.

## API Naming Patterns

| Pattern             | Meaning                                                    |
| ------------------- | ---------------------------------------------------------- |
| `createUniversa*`   | Create a plugin/module/integration value.                  |
| `withUniversa*`     | Wrap and return an updated config object.                  |
| `attachUniversaTo*` | Imperatively attach Universa to a running server instance. |
| `startUniversa*`    | Start a standalone bridge/helper and return a handle.      |

Common APIs:

| API                                   | Import path                |
| ------------------------------------- | -------------------------- |
| `createUniversaToolPreset`            | `universa-kit/preset`      |
| `createUniversaVitePlugin`            | `universa-kit/vite`        |
| `withUniversaNext`                    | `universa-kit/next`        |
| `createUniversaAstroIntegration`      | `universa-kit/astro`       |
| `createUniversaNuxtModule`            | `universa-kit/nuxt`        |
| `createUniversaAngularCliProxyConfig` | `universa-kit/angular/cli` |
| `startUniversaAngularCliBridge`       | `universa-kit/angular/cli` |
| `withUniversaAngularCliProxyConfig`   | `universa-kit/angular/cli` |
| `attachUniversaToBunServe`            | `universa-kit/bun`         |
| `attachUniversaToNodeServer`          | `universa-kit/node`        |
| `attachUniversaToFastify`             | `universa-kit/fastify`     |
| `attachUniversaToHonoNodeServer`      | `universa-kit/hono`        |
| `withUniversaWebpackDevServer`        | `universa-kit/webpack`     |
| `withUniversaRsbuild`                 | `universa-kit/rsbuild`     |
| `withUniversaRspack`                  | `universa-kit/rspack`      |

Preset helper (for tool packages that want one unified export):

```ts
import { createUniversaToolPreset } from "universa-kit/preset";

export const myTool = createUniversaToolPreset({
  command: "mytool",
  args: ["dev"],
  fallbackCommand: "mytool dev",
});
```

## Configuration

All adapters accept `UniversaAdapterOptions`, which extends bridge/runtime options.

Core options:

| Option                     | Type                                  | Default                   | Notes                                                                                                                                               |
| -------------------------- | ------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `autoStart`                | `boolean`                             | `true`                    | Auto-start runtime on state/proxy/event paths.                                                                                                      |
| `bridgePathPrefix`         | `string`                              | `"/__universa"`           | Route prefix for bridge endpoints.                                                                                                                  |
| `fallbackCommand`          | `string`                              | `"universa dev"`          | Returned in error payloads for recovery UX.                                                                                                         |
| `command`                  | `string`                              | none                      | Required for managed runtime lifecycle.                                                                                                             |
| `args`                     | `string[]`                            | `[]`                      | Runtime process args.                                                                                                                               |
| `cwd`                      | `string`                              | `process.cwd()`           | Runtime working directory.                                                                                                                          |
| `env`                      | `Record<string, string \| undefined>` | none                      | Extra runtime env vars.                                                                                                                             |
| `host`                     | `string`                              | `"127.0.0.1"`             | Runtime host binding.                                                                                                                               |
| `healthPath`               | `string`                              | `"/api/version"`          | Health probe path used after spawn.                                                                                                                 |
| `startTimeoutMs`           | `number`                              | `15000`                   | Runtime health timeout.                                                                                                                             |
| `runtimePortEnvVar`        | `string`                              | `"UNIVERSA_RUNTIME_PORT"` | Env var populated with allocated port.                                                                                                              |
| `eventHeartbeatIntervalMs` | `number`                              | `30000`                   | Ping interval for stale WS client cleanup.                                                                                                          |
| `proxyRuntimeWebSocket`    | `boolean`                             | `true`                    | Proxy runtime WebSocket messages over the bridge events socket. Set to `false` to keep the events socket open without forwarding runtime WS frames. |
| `instance`                 | `{ id: string; label?: string }`      | none                      | Optional identifier included in bridge state and health responses, useful when multiple bridges share a prefix.                                     |
| `overlayModule`            | `string`                              | none                      | Package specifier auto-injected as a dev-only side-effect import (e.g. `"mypkg/overlay"`). Supported by Vite, Next.js, Nuxt, and Astro adapters.    |

Adapter-specific options:

| Option                | Type     | Default                        | Notes                                              |
| --------------------- | -------- | ------------------------------ | -------------------------------------------------- |
| `adapterName`         | `string` | `"universa-bridge"`            | Plugin/module name where applicable.               |
| `rewriteSource`       | `string` | `"/__universa/:path*"`         | Rewrite pattern used by Next wrapper.              |
| `nextBridgeGlobalKey` | `string` | auto-generated in Next wrapper | Override for deterministic Next standalone keying. |

## Bridge Routes

With default prefix `/__universa`:

- `GET /__universa/health`
- `GET /__universa/state`
- `GET /__universa/runtime/status`
- `POST /__universa/runtime/start`
- `POST /__universa/runtime/restart`
- `POST /__universa/runtime/stop`
- `WS /__universa/events`
- `ANY /__universa/api/*` (proxied to runtime as `/api/*`)

Notes:

- `GET /state` may auto-start runtime when `autoStart` is enabled.
- bridge routes are query-safe (for example `GET /__universa/state?source=ui`).
- `POST /runtime/stop` disables auto-start until `start` or `restart` is called.
- bridge-generated errors use envelope shape: `{ success: false, message, error: { code, message, retryable, details? } }`.
- proxied `/api/*` responses pass through upstream status/body/headers and are not envelope-wrapped by default.

## Bridge Events

Current event union:

- `runtime-status`
- `runtime-error`

Bridge-emitted events include:

- `protocolVersion` (`"1"`)
- `eventId` (monotonic per bridge instance)
- `timestamp` (epoch milliseconds)

WebSocket subprotocol:

- supported: `universa.v1+json`
- if a client sends `Sec-WebSocket-Protocol`, the offered list must include `universa.v1+json`; otherwise the bridge rejects with `426`
- when accepted, the bridge negotiates `universa.v1+json`

Type source: `src/types.ts` (`UniversaBridgeEvent`).

## Client API (`universa-kit/client`)

```ts
import { createUniversaClient } from "universa-kit/client";

const client = createUniversaClient({
  baseUrl: "http://127.0.0.1:3000",
});

const health = await client.getHealth();
const state = await client.getState();
const runtime = await client.startRuntime();

const unsubscribe = client.subscribeEvents((event) => {
  console.log(event.type, event.eventId);
});

unsubscribe();
```

In Node environments, pass a WebSocket implementation with `webSocketFactory` when needed.

## Adapter Examples

### Next.js

```ts
// next.config.ts
import { withUniversaNext } from "universa-kit/next";

export default withUniversaNext(
  { reactStrictMode: true },
  {
    command: "node",
    args: ["./scripts/dev-runtime.js"],
  },
);
```

### Vinext

Vinext is a Vite-based reimplementation of the Next.js API surface. Because it uses a Vite dev server, it uses the Vite adapter directly. Place `createUniversaVitePlugin` before the `vinext()` plugin.

```ts
// vite.config.ts
import { createUniversaVitePlugin } from "universa-kit/vite";
import vinext from "vinext";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    createUniversaVitePlugin({
      command: "node",
      args: ["./scripts/dev-runtime.js"],
    }),
    vinext(),
  ],
  resolve: {
    // Prevent duplicate React instances in Bun workspaces (mirrors vinext CLI auto-config).
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
  },
  optimizeDeps: {
    // react-server-dom-webpack ships CJS only. Force pre-bundling so Vite
    // can serve it as ESM rather than a raw @fs/ path.
    include: ["react-server-dom-webpack/client.browser"],
  },
});
```

Unlike `withUniversaNext`, no config wrapper or rewrite setup is needed — the Vite plugin attaches the bridge directly to Vinext's dev server.

### Astro

```ts
// astro.config.ts
import { defineConfig } from "astro/config";
import { createUniversaAstroIntegration } from "universa-kit/astro";

export default defineConfig({
  integrations: [createUniversaAstroIntegration()],
});
```

### Nuxt

```ts
// nuxt.config.ts
import { defineNuxtConfig } from "nuxt/config";
import { createUniversaNuxtModule } from "universa-kit/nuxt";

export default defineNuxtConfig({
  modules: [createUniversaNuxtModule()],
});
```

### Angular CLI (Proxy Config)

```ts
// universa-kit.proxy.mjs
import { writeFile } from "node:fs/promises";
import { createUniversaAngularCliProxyConfig } from "universa-kit/angular/cli";

const proxyConfig = await createUniversaAngularCliProxyConfig();
await writeFile(
  new URL("./proxy.universa-kit.json", import.meta.url),
  JSON.stringify(proxyConfig, null, 2),
);
```

Then:

```bash
node universa-kit.proxy.mjs
ng serve --proxy-config proxy.universa-kit.json
```

### Bun.serve

```ts
import {
  attachUniversaToBunServe,
  withUniversaBunServeFetch,
  withUniversaBunServeWebSocketHandlers,
} from "universa-kit/bun";

const universa-kit = await attachUniversaToBunServe({
  command: "node",
  args: ["./scripts/dev-runtime.js"],
});

const server = Bun.serve({
  fetch: withUniversaBunServeFetch(
    (request) => new Response(`route: ${new URL(request.url).pathname}`),
    universa-kit,
  ),
  websocket: withUniversaBunServeWebSocketHandlers(universa-kit),
});

await universa-kit.close();
server.stop();
```

### Node Server

```ts
import express from "express";
import http from "node:http";
import { attachUniversaToNodeServer } from "universa-kit/node";

const app = express();
const server = http.createServer(app);

await attachUniversaToNodeServer(
  {
    middlewares: { use: app.use.bind(app) },
    httpServer: server,
  },
  { command: "node", args: ["./scripts/dev-runtime.js"] },
);
```

### Webpack Dev Server

```ts
import { withUniversaWebpackDevServer } from "universa-kit/webpack";

export default {
  devServer: withUniversaWebpackDevServer({
    setupMiddlewares: (middlewares) => middlewares,
  }),
};
```

## Next.js Bridge Keys

`withUniversaNext(nextConfig, options)` uses a standalone bridge behind rewrites in development.

Default behavior:

- each wrapper call gets a unique per-instance key
- this avoids collisions when multiple Next servers run in the same process

Optional override:

- set `nextBridgeGlobalKey` when you need deterministic keying or intentionally shared bridge state

```ts
import { withUniversaNext } from "universa-kit/next";

export default withUniversaNext(
  { reactStrictMode: true },
  {
    nextBridgeGlobalKey: "__UNIVERSA_NEXT_BRIDGE__:workspace-a",
  },
);
```

## Compatibility

- runtime support target: Node.js and Bun
- module format: ESM package (`"type": "module"`)
- CI matrix: Node `20.x`, Node `22.x`, Bun `1.3.9`
- validated by:
  - unit tests
  - adapter integration tests
  - e2e runtime control tests
  - e2e bridge event flow tests

## Documentation

- `README.md`: product overview, installation, and integration entrypoints
- `INTEGRATION_GUIDE.md`: end-to-end example for building a CLI-style tool package and user project setup
- `PROTOCOL.md`: normative bridge contract (routes, events, errors, versioning)
- `ARCHITECTURE.md`: internal component boundaries and data flow
- `EXAMPLES.md`: setup and usage guide for the framework examples

Guardrails:

- `bun run docs:lint` validates markdown docs
- `bun run docs:check` enforces docs synchronization for protocol/API-impacting source changes

## Examples

See [`EXAMPLES.md`](EXAMPLES.md) for full setup and usage instructions.

Quick start:

```bash
bun run examples:setup  # install deps and build packages (once)
bun run examples        # start all nine framework examples
```

Available example IDs: `react`, `vue`, `sveltekit`, `solid`, `astro`, `nextjs`, `nuxt`, `vanilla`, `vinext`.

## Packaging

Published artifacts are built from `src/` into `dist/` with declaration files:

- runtime JS and `.d.ts` output in `dist`
- package includes `README.md`, `PROTOCOL.md`, `ARCHITECTURE.md`, and `LICENSE`
- release guard via `prepublishOnly`: build + test + typecheck
