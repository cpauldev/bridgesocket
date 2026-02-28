import {
  type StandaloneBridgeServer,
  UniversaBridge,
  type UniversaBridgeOptions,
  startStandaloneUniversaBridgeServer,
} from "universa-kit";
import { createUniversaToolPreset } from "universa-kit/preset";

import {
  resolveDemoAdapterOptions,
  resolveDemoBridgeOptions,
} from "./defaults.js";

export type DemoBridgeOptions = UniversaBridgeOptions;
export type { StandaloneBridgeServer };

export class DemoBridge extends UniversaBridge {
  constructor(options: DemoBridgeOptions = {}) {
    super(resolveDemoBridgeOptions(options));
  }
}

export function createDemoBridge(options: DemoBridgeOptions = {}): DemoBridge {
  return new DemoBridge(options);
}

export async function startStandaloneDemoBridgeServer(
  options: DemoBridgeOptions = {},
): Promise<StandaloneBridgeServer> {
  return startStandaloneUniversaBridgeServer(resolveDemoBridgeOptions(options));
}

export function createDemoPreset(options = {}) {
  return createUniversaToolPreset(resolveDemoAdapterOptions(options));
}
