import { describe, expect, it } from "bun:test";

import { createBridgeLifecycle } from "../adapters/shared/adapter-utils.js";
import { createMiddlewareAdapterServerFixture } from "./utils/adapter-server-fixtures.js";

describe("createBridgeLifecycle", () => {
  it("sets up and tears down a bridge", async () => {
    const lifecycle = createBridgeLifecycle({ autoStart: false });
    const fixture = createMiddlewareAdapterServerFixture();

    await lifecycle.setup(fixture.server);

    expect(fixture.getMiddlewareCount()).toBe(1);
    expect(fixture.getListenerCount("upgrade")).toBe(1);
    expect(fixture.getListenerCount("close")).toBe(1);
    expect(lifecycle.getBridge()).not.toBeNull();

    await lifecycle.teardown();
    expect(lifecycle.getBridge()).toBeNull();
  });

  it("reuses the same bridge on repeated setup calls", async () => {
    const lifecycle = createBridgeLifecycle({ autoStart: false });
    const firstFixture = createMiddlewareAdapterServerFixture();
    const secondFixture = createMiddlewareAdapterServerFixture();

    const firstBridge = await lifecycle.setup(firstFixture.server);
    const secondBridge = await lifecycle.setup(secondFixture.server);

    expect(secondBridge).toBe(firstBridge);
    expect(firstFixture.getMiddlewareCount()).toBe(1);
    expect(secondFixture.getMiddlewareCount()).toBe(0);

    await lifecycle.teardown();
  });
});
