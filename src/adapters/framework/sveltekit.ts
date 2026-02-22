import type { DevSocketAdapterOptions } from "../shared/adapter-utils.js";
import { createDevSocketPlugin } from "../shared/plugin.js";

export type SvelteKitDevSocketOptions = DevSocketAdapterOptions;

export function devSocketSvelteKit(options: SvelteKitDevSocketOptions = {}) {
  return createDevSocketPlugin(options);
}
