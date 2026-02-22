import type { DevSocketAdapterOptions } from "../shared/adapter-utils.js";
import { createDevSocketPlugin } from "../shared/plugin.js";

export type RemixDevSocketOptions = DevSocketAdapterOptions;
export type ReactRouterDevSocketOptions = DevSocketAdapterOptions;

export function devSocketRemix(options: RemixDevSocketOptions = {}) {
  return createDevSocketPlugin(options);
}

export function devSocketReactRouter(
  options: ReactRouterDevSocketOptions = {},
) {
  return createDevSocketPlugin(options);
}
