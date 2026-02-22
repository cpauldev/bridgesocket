import { afterEach, describe, expect, it } from "bun:test";

import { DevSocketBridge } from "../bridge/bridge.js";
import { DEVSOCKET_WS_SUBPROTOCOL } from "../bridge/constants.js";
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
      protocolVersion: string;
      runtime: { phase: string; lastError: string | null };
      transportState: string;
    }>(server.baseUrl, "/__devsocket/state");

    expect(stateBeforeStop.protocolVersion).toBe("1");
    expect(stateBeforeStop.runtime.phase).toBe("error");
    expect(stateBeforeStop.transportState).toBe("degraded");
    expect(typeof stateBeforeStop.runtime.lastError).toBe("string");

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
      runtime: { phase: string; lastError: string | null };
      transportState: string;
    }>(server.baseUrl, "/__devsocket/state");
    const elapsedMs = Date.now() - startedAt;

    expect(stateAfterStop.runtime.phase).toBe("stopped");
    expect(stateAfterStop.transportState).toBe("bridge_detecting");
    expect(stateAfterStop.runtime.lastError).toBeNull();
    expect(elapsedMs).toBeLessThan(150);
  });

  it("returns 426 response for unsupported websocket subprotocol", () => {
    const bridge = new DevSocketBridge({ autoStart: false });
    bridges.push(bridge);

    let responseText = "";
    let destroyed = false;

    const socket = {
      end: (chunk?: string | Buffer) => {
        responseText =
          typeof chunk === "string"
            ? chunk
            : chunk
              ? chunk.toString("utf8")
              : "";
      },
      destroy: () => {
        destroyed = true;
      },
    } as unknown as import("stream").Duplex;

    const request = {
      url: "/__devsocket/events",
      headers: {
        "sec-websocket-protocol": "devsocket.v999+json",
      },
    } as unknown as import("http").IncomingMessage;

    bridge.handleUpgrade(request, socket, Buffer.alloc(0));

    expect(responseText).toContain("HTTP/1.1 426 Upgrade Required");
    const payload = responseText.split("\r\n\r\n")[1];
    const parsed = JSON.parse(payload) as {
      success: boolean;
      error: {
        code: string;
        details?: {
          wsSubprotocol?: string;
        };
      };
    };
    expect(parsed.success).toBe(false);
    expect(parsed.error.code).toBe("invalid_request");
    expect(parsed.error.details?.wsSubprotocol).toBe(DEVSOCKET_WS_SUBPROTOCOL);
    expect(destroyed).toBe(false);
  });
});
