import { createBridgeSocketToolPreset } from "bridgesocket/preset";

import { resolveDemoAdapterOptions } from "./defaults.js";

export function createDemoPreset(options = {}) {
  return createBridgeSocketToolPreset(resolveDemoAdapterOptions(options));
}
