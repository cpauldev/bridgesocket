import {
  BridgeSocketBridge,
  type BridgeSocketBridgeOptions,
  type StandaloneBridgeServer,
  startStandaloneBridgeSocketBridgeServer,
} from "bridgesocket";

import { resolveDemoBridgeOptions } from "./defaults.js";

export type DemoBridgeOptions = BridgeSocketBridgeOptions;
export type { StandaloneBridgeServer };

export class DemoBridge extends BridgeSocketBridge {
  constructor(options: DemoBridgeOptions = {}) {
    super(resolveDemoBridgeOptions(options));
  }
}

export async function createDemoBridge(
  options: DemoBridgeOptions = {},
): Promise<DemoBridge> {
  return new DemoBridge(options);
}

export async function startStandaloneDemoBridgeServer(
  options: DemoBridgeOptions = {},
): Promise<StandaloneBridgeServer> {
  return startStandaloneBridgeSocketBridgeServer(
    resolveDemoBridgeOptions(options),
  );
}
