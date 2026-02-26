import { OVERLAY_DISABLE_KEY } from "./constants.js";
import { isBrowserRuntime, isDevLikeEnvironment } from "./mount-policy.js";
import { DemoOverlay } from "./overlay.js";
import type { OverlayMountOptions } from "./types.js";

interface OverlayInstanceLike {
  mount(): void;
  destroy(): void;
}

declare global {
  interface Window {
    __DEMO_OVERLAY_DISABLED__?: boolean;
    __DEMO_OVERLAY_ENABLED__?: boolean;
    __DEMO_OVERLAY_STYLE_NONCE__?: string;
    __DEMO_OVERLAY_INSTANCE__?: OverlayInstanceLike | null;
  }
}

let overlayInstance: DemoOverlay | null = null;

function getGlobalOverlayInstance(): OverlayInstanceLike | null {
  if (!isBrowserRuntime()) return overlayInstance;

  const globalInstance = window.__DEMO_OVERLAY_INSTANCE__ ?? null;
  if (globalInstance && !overlayInstance) {
    overlayInstance = globalInstance as DemoOverlay;
  }
  return globalInstance;
}

function setGlobalOverlayInstance(instance: OverlayInstanceLike | null): void {
  if (isBrowserRuntime()) {
    window.__DEMO_OVERLAY_INSTANCE__ = instance;
  }
  overlayInstance = instance as DemoOverlay | null;
}

export function shouldMountOverlay(force = false): boolean {
  if (!isBrowserRuntime()) return false;
  if (force) return true;

  if (window.__DEMO_OVERLAY_DISABLED__) return false;
  if (window.__DEMO_OVERLAY_ENABLED__ === true) return true;

  try {
    if (localStorage.getItem(OVERLAY_DISABLE_KEY) === "true") return false;
  } catch {
    // Ignore localStorage failures.
  }

  return isDevLikeEnvironment();
}

export function mountOverlay(
  options: OverlayMountOptions = {},
): DemoOverlay | null {
  if (!shouldMountOverlay(options.force)) return null;

  const existing = getGlobalOverlayInstance();
  if (existing) {
    existing.mount();
    return existing as DemoOverlay;
  }

  const instance = new DemoOverlay({
    baseUrl: options.baseUrl,
    styleNonce: options.styleNonce,
    force: options.force,
  });
  instance.mount();
  setGlobalOverlayInstance(instance);

  return instance;
}

export function unmountOverlay(): void {
  const existing = getGlobalOverlayInstance();
  existing?.destroy();
  setGlobalOverlayInstance(null);
}

export { DemoOverlay };
export { createDemoApi } from "./api.js";
export type { DemoApi } from "./api.js";
export type { OverlayMountOptions };
export type {
  BridgeSocketBridgeState,
  BridgeSocketRuntimeStatus,
} from "./types.js";

// ============================================================================
// AUTO-INITIALIZATION
// ============================================================================

// Auto-mount the overlay in development environments
if (isBrowserRuntime() && shouldMountOverlay()) {
  try {
    mountOverlay();
  } catch {
    // Ignore overlay bootstrap failures to keep runtime resilient.
  }
}
