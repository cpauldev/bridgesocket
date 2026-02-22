import { afterEach, describe, expect, it } from "bun:test";

import { DevSocketBridge } from "../bridge/bridge.js";
import {
  type StandaloneBridgeServer,
  startStandaloneDevSocketBridgeServer,
} from "../bridge/standalone.js";

const bridges: DevSocketBridge[] = [];
const standaloneServers: StandaloneBridgeServer[] = [];

async function requestJson<T>(
  baseUrl: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, init);
  const payload = (await response.json()) as T;
  expect(response.ok).toBe(true);
  return payload;
}

afterEach(async () => {
  await Promise.all(
    standaloneServers.map(async (server) => {
      await server.close();
    }),
  );
  standaloneServers.length = 0;

  await Promise.all(
    bridges.map(async (bridge) => {
      await bridge.close();
    }),
  );
  bridges.length = 0;
});

describe("DevSocketBridge", () => {
  it("exposes runtime control capabilities", () => {
    const bridge = new DevSocketBridge({ autoStart: false });
    bridges.push(bridge);

    const state = bridge.getState();
    expect(state.capabilities.hasRuntimeControl).toBe(true);
    expect(state.capabilities.commandHost).toBe("hybrid");
    expect(state.runtime.phase).toBe("stopped");
    expect(state.transportState).toBe("bridge_detecting");
  });

  it("disables auto-start after explicit stop", async () => {
    const server = await startStandaloneDevSocketBridgeServer({
      autoStart: true,
      command: process.execPath,
      args: ["-e", "setTimeout(() => process.exit(1), 10)"],
      startTimeoutMs: 250,
    });
    standaloneServers.push(server);

    const stateBeforeStop = await requestJson<{
      runtime: { phase: string };
      transportState: string;
      error?: string;
    }>(server.baseUrl, "/__devsocket/state");

    expect(stateBeforeStop.runtime.phase).toBe("error");
    expect(stateBeforeStop.transportState).toBe("degraded");
    expect(typeof stateBeforeStop.error).toBe("string");

    const stopResult = await requestJson<{
      success: boolean;
      runtime: { phase: string };
    }>(server.baseUrl, "/__devsocket/runtime/stop", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    expect(stopResult.success).toBe(true);
    expect(stopResult.runtime.phase).toBe("stopped");

    const startedAt = Date.now();
    const stateAfterStop = await requestJson<{
      runtime: { phase: string };
      transportState: string;
      error?: string;
    }>(server.baseUrl, "/__devsocket/state");
    const elapsedMs = Date.now() - startedAt;

    expect(stateAfterStop.runtime.phase).toBe("stopped");
    expect(stateAfterStop.transportState).toBe("bridge_detecting");
    expect(stateAfterStop.error).toBeUndefined();
    expect(elapsedMs).toBeLessThan(150);
  });
});
