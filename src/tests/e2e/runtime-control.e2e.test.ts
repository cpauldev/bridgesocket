import { afterEach, describe, expect, it } from "bun:test";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

import {
  type StandaloneBridgeServer,
  startStandaloneDevSocketBridgeServer,
} from "../../bridge/standalone.js";

const fixtureRuntimeScript = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/runtime-e2e-server.cjs",
);

const standaloneServers = new Set<StandaloneBridgeServer>();

afterEach(async () => {
  await Promise.all(
    [...standaloneServers].map(async (server) => {
      await server.close();
    }),
  );
  standaloneServers.clear();
});

describe("runtime control e2e", () => {
  it("starts, restarts, stops runtime and proxies API calls", async () => {
    const server = await startStandaloneDevSocketBridgeServer({
      autoStart: false,
      command: process.execPath,
      args: [fixtureRuntimeScript],
      startTimeoutMs: 5000,
    });
    standaloneServers.add(server);

    const initialStatus = (await (
      await fetch(`${server.baseUrl}/__devsocket/runtime/status`)
    ).json()) as { phase: string };
    expect(initialStatus.phase).toBe("stopped");

    const startResult = (await (
      await fetch(`${server.baseUrl}/__devsocket/runtime/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      })
    ).json()) as {
      success: boolean;
      runtime: { phase: string; pid: number | null };
    };
    expect(startResult.success).toBe(true);
    expect(startResult.runtime.phase).toBe("running");
    expect(typeof startResult.runtime.pid).toBe("number");

    const versionResponse = await fetch(
      `${server.baseUrl}/__devsocket/api/version`,
    );
    expect(versionResponse.ok).toBe(true);
    const versionPayload = (await versionResponse.json()) as {
      ok: boolean;
      runtime: string;
    };
    expect(versionPayload.ok).toBe(true);
    expect(versionPayload.runtime).toBe("e2e");

    const echoResponse = await fetch(`${server.baseUrl}/__devsocket/api/echo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "hello" }),
    });
    expect(echoResponse.ok).toBe(true);
    const echoPayload = (await echoResponse.json()) as {
      method: string;
      body: string;
    };
    expect(echoPayload.method).toBe("POST");
    expect(echoPayload.body).toBe(JSON.stringify({ message: "hello" }));

    const restartResult = (await (
      await fetch(`${server.baseUrl}/__devsocket/runtime/restart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      })
    ).json()) as {
      success: boolean;
      runtime: { phase: string };
    };
    expect(restartResult.success).toBe(true);
    expect(restartResult.runtime.phase).toBe("running");

    const stopResult = (await (
      await fetch(`${server.baseUrl}/__devsocket/runtime/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      })
    ).json()) as {
      success: boolean;
      runtime: { phase: string };
    };
    expect(stopResult.success).toBe(true);
    expect(stopResult.runtime.phase).toBe("stopped");

    const proxyAfterStop = await fetch(
      `${server.baseUrl}/__devsocket/api/version`,
    );
    expect(proxyAfterStop.status).toBe(503);
  });
});
