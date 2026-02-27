import { createDemoPreset } from "./dev/preset.js";

export { createDemoPreset } from "./dev/preset.js";
export { DemoBridge } from "./dev/bridge.js";
export * as dashboard from "./dashboard/index.js";

const demo = createDemoPreset();
export default demo;
