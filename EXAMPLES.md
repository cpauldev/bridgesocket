# BridgeSocket Examples

## Document Meta

- Purpose: Explain how to set up and run the BridgeSocket framework examples.
- Audience: Contributors and maintainers working on BridgeSocket internals.
- Status: Active

## Overview

The `examples/` directory contains eight framework examples that each demonstrate a working BridgeSocket integration with the `demo` overlay package. Each example starts its own dev server with the demo bridge mounted, so the overlay appears in the browser and connects to a local demo runtime.

| ID          | Framework  | Default port |
| ----------- | ---------- | ------------ |
| `react`     | React      | 5173         |
| `vue`       | Vue        | 5174         |
| `sveltekit` | SvelteKit  | 5175         |
| `astro`     | Astro      | 4321         |
| `nextjs`    | Next.js    | 3000         |
| `nuxt`      | Nuxt       | 3001         |
| `vanilla`   | Vanilla JS | 5176         |
| `vinext`    | Vinext     | 5177         |

If a port is already in use the runner searches upward automatically.

## Prerequisites

- [Bun](https://bun.sh) — used for the workspace, scripts, and running examples
- Node.js 20 or 22 — required by some framework dev servers

## First-Time Setup

Run the setup script once from the repository root. It installs workspace dependencies and builds the `bridgesocket` and `demo` packages that the examples depend on.

```bash
bun run examples:setup
```

This runs three steps in order:

1. `bun install` — installs all workspace dependencies
2. `bun run build` — builds the `bridgesocket` package
3. `bun run build` in `packages/demo` — builds the `demo` overlay package

After setup completes, no further build steps are needed to run examples unless source files change (see [Rebuilding after source changes](#rebuilding-after-source-changes)).

## Running Examples

### All examples

```bash
bun run examples
```

Starts all eight framework dev servers concurrently. URLs are printed to the terminal as each server becomes ready. Browser tabs open automatically.

### Specific examples

```bash
bun run examples react nextjs
bun run examples vinext
bun run examples vue sveltekit astro
```

Pass one or more example IDs (from the table above) as arguments. Only the specified servers start.

### Without opening browser tabs

```bash
bun run examples --no-open
bun run examples react nextjs --no-open
```

Servers start normally but no browser tabs are opened.

## Verifying Examples

```bash
bun run verify:examples
```

Checks each example's health and bridge state endpoints (`/__demo/health` and `/__demo/state`) and reports pass/fail per example. Requires all examples to be running.

## Rebuilding after source changes

When `src/` (BridgeSocket core) or `packages/demo/src/` (demo overlay) changes, rebuild before running examples:

```bash
# Rebuild bridgesocket
bun run build

# Rebuild demo overlay
bun run build --filter=demo

# Or run setup again to rebuild both
bun run examples:setup
```

Individual examples do not need rebuilding — they import the packages directly from the workspace.

## Example Structure

Each example lives under `examples/<id>/` and follows the same pattern:

- Standard framework project (Next.js app router, SvelteKit, Astro, etc.)
- `demo` package wired in via the appropriate adapter (`demo.vite()`, `demo.next()`, `demo.astro()`, `demo.nuxt()`)
- `demo/overlay` imported in the root layout or entry point to mount the overlay
- Shared UI components from `examples/shared/ui/` (`example-ui` workspace package)

### Vinext note

Vinext uses the Vite adapter (`demo.vite()`) rather than the Next.js adapter, because Vinext runs a Vite dev server directly. The `vite.config.ts` also includes `resolve.dedupe` for React packages and `optimizeDeps.include` for `react-server-dom-webpack` to prevent Bun workspace resolution issues. See `examples/vinext/vite.config.ts`.

## Shared UI package

`examples/shared/ui/` is the `example-ui` workspace package. It exports:

- `example-ui/styles.css` — base page styles
- `example-ui/theme` — `getInitialTheme`, `applyTheme`, `toggleTheme`
- `example-ui/bridge` — `phaseBadgeClass`, `transportBadgeClass` badge helpers

## Notes

- The Nuxt example sets `NUXT_SOCKET=0` to work around an ECONNRESET issue on Windows when running all examples simultaneously ([nuxt/cli#994](https://github.com/nuxt/cli/issues/994)).
- The `--port` flag is passed automatically by the runner; examples do not need to hard-code ports.
- Press `Ctrl+C` to stop all running servers.
