# Universa Integration Guide

This guide shows how to ship a tool package that exposes one integration API and works across frameworks via UniversaKit.

## 1) Build a runtime command

Your tool runtime should listen on the port provided by `UNIVERSA_RUNTIME_PORT` (default env var used by UniversaKit).

```js
// runtime/dev-server.mjs
import { createServer } from "node:http";

const port = Number(process.env.UNIVERSA_RUNTIME_PORT ?? 3456);

const server = createServer((req, res) => {
  if (req.url === "/api/version") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ version: "0.1.0" }));
    return;
  }

  if (req.url === "/api/status") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, tool: "acmetool" }));
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "not_found" }));
});

server.listen(port, "127.0.0.1", () => {
  console.log(`[acmetool] runtime listening on http://127.0.0.1:${port}`);
});
```

```js
#!/usr/bin/env node
// bin/acmetool.mjs
const command = process.argv[2];

if (command === "dev") {
  await import("../runtime/dev-server.mjs");
} else if (command === "setup") {
  console.log("acmetool setup: write project config files here.");
} else {
  console.log("Usage: acmetool <setup|dev>");
  process.exit(1);
}
```

## 2) Export a preset (recommended)

```ts
// src/index.ts
import { createUniversaPreset } from "universa-kit/preset";

export function acmetool() {
  return createUniversaPreset({
    identity: { packageName: "acmetool" },
    command: "acmetool",
    args: ["dev"],
    fallbackCommand: "acmetool dev",
    client: {
      module: "acmetool/overlay",
      autoMount: true,
    },
  });
}
```

Why presets are recommended:

- users import from one place (`acmetool`)
- namespace + bridge prefix are derived automatically
- framework adapters can compose safely when multiple presets are present

## 3) User integration examples

### Next.js

```ts
// next.config.ts
import { acmetool } from "acmetool";

export default acmetool().next({});
```

### Vite

```ts
// vite.config.ts
import { acmetool } from "acmetool";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [acmetool().vite()],
});
```

Then users run their normal app dev command.

## 4) Bridge routes users get

Preset integrations are namespaced:

- `GET /__universa/acmetool/health`
- `GET /__universa/acmetool/state`
- `WS /__universa/acmetool/events`
- `ANY /__universa/acmetool/api/*`

## 5) Optional browser overlay client

```ts
import { createUniversaClient } from "universa-kit/client";

const client = createUniversaClient({ namespaceId: "acmetool" });
const state = await client.getState();
console.log(state.runtime.phase);

const unsubscribe = client.subscribeEvents((event) => {
  if (event.type === "runtime-status") {
    console.log(event.status.phase);
  }
});

window.addEventListener("beforeunload", () => unsubscribe());
```

## 6) Important notes

- If `command` is omitted, `start`/`restart` runtime controls are unavailable by design.
- `stop` remains idempotent.
- `bridgePathPrefix` is normalized under `/__universa`.
- Keep your public API stable (`acmetool().vite()`, `acmetool().next(...)`, etc.).


## 7) Adapter-specific notes (when presets are not your integration surface)

If you expose framework-specific APIs instead of a preset, keep these behaviors documented for users.

### Next.js bridge keying

`withUniversaNext` creates isolated bridge keys by default. You can set `nextBridgeGlobalKey` for deterministic keying.

```ts
import { withUniversaNext } from "universa-kit/next";

export default withUniversaNext(
  {},
  {
    nextBridgeGlobalKey: "__UNIVERSA_NEXT_BRIDGE__:workspace-a",
  },
);
```

### Bun.serve integration

```ts
import {
  attachUniversaToBunServe,
  withUniversaBunServeFetch,
  withUniversaBunServeWebSocketHandlers,
} from "universa-kit/bun";

const universa = await attachUniversaToBunServe({
  command: "acmetool",
  args: ["dev"],
});

const server = Bun.serve({
  fetch: withUniversaBunServeFetch((request) => new Response("ok"), universa),
  websocket: withUniversaBunServeWebSocketHandlers(universa),
});

// cleanup
await universa.close();
server.stop();
```

### Node server integration

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
  {
    command: "acmetool",
    args: ["dev"],
  },
);
```

### webpack-dev-server integration

```ts
import { withUniversaWebpackDevServer } from "universa-kit/webpack";

export default {
  devServer: withUniversaWebpackDevServer({
    setupMiddlewares: (middlewares) => middlewares,
  }),
};
```


### Fastify integration

```ts
import Fastify from "fastify";
import { attachUniversaToFastify } from "universa-kit/fastify";

const fastify = Fastify();

await attachUniversaToFastify(fastify, {
  command: "acmetool",
  args: ["dev"],
});
```

### Hono (Node server) integration

`attachUniversaToHonoNodeServer` uses the same Node-style server surface as `attachUniversaToNodeServer`.

```ts
import { attachUniversaToHonoNodeServer } from "universa-kit/hono";

await attachUniversaToHonoNodeServer(
  {
    middlewares: {
      use: (handler) => {
        // register the handler on your Node HTTP middleware chain
      },
    },
    httpServer,
  },
  {
    command: "acmetool",
    args: ["dev"],
  },
);
```

### Rsbuild and Rspack integration

```ts
import { withUniversaRsbuild } from "universa-kit/rsbuild";
import { withUniversaRspack } from "universa-kit/rspack";

export const rsbuildConfig = withUniversaRsbuild({});
export const rspackConfig = withUniversaRspack({});
```

### Astro and Nuxt integration

```ts
import { defineConfig as defineAstroConfig } from "astro/config";
import { createUniversaAstroIntegration } from "universa-kit/astro";

export default defineAstroConfig({
  integrations: [createUniversaAstroIntegration()],
});
```

```ts
import { defineNuxtConfig } from "nuxt/config";
import { createUniversaNuxtModule } from "universa-kit/nuxt";

export default defineNuxtConfig({
  modules: [createUniversaNuxtModule()],
});
```

### Angular CLI proxy integration

```ts
import { createUniversaAngularCliProxyConfig } from "universa-kit/angular/cli";

const proxyConfig = await createUniversaAngularCliProxyConfig({
  command: "acmetool",
  args: ["dev"],
});
```

### Standalone bridge (tooling/tests)

```ts
import { startStandaloneUniversaBridgeServer } from "universa-kit";

const standalone = await startStandaloneUniversaBridgeServer({
  command: "acmetool",
  args: ["dev"],
});

console.log(standalone.baseUrl);
await standalone.close();
```
