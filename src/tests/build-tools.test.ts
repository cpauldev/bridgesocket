import { describe, expect, it } from "bun:test";

import { withUniversaRsbuild } from "../adapters/build/rsbuild.js";
import { withUniversaRspack } from "../adapters/build/rspack.js";
import { createSetupMiddlewaresDevServerFixture } from "./utils/adapter-server-fixtures.js";

describe("build tool adapters", () => {
  it("withUniversaRsbuild wires setupMiddlewares", async () => {
    const fixture = createSetupMiddlewaresDevServerFixture();
    const wrapped = withUniversaRsbuild(
      {
        setupMiddlewares: (middlewares: string[]) => [
          ...middlewares,
          "rsbuild",
        ],
      },
      { autoStart: false },
    );

    const result = wrapped.setupMiddlewares?.(
      ["base"],
      fixture.devServer as never,
    );
    expect(result).toEqual(["base", "rsbuild"]);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fixture.getSetupMiddlewareCount()).toBe(1);
    expect(fixture.getListenerCount("upgrade")).toBe(1);
    expect(fixture.getListenerCount("close")).toBe(1);

    fixture.emit("close");
  });

  it("withUniversaRspack wires setupMiddlewares", async () => {
    const fixture = createSetupMiddlewaresDevServerFixture();
    const wrapped = withUniversaRspack(
      {
        setupMiddlewares: (middlewares: string[]) => [...middlewares, "rspack"],
      },
      { autoStart: false },
    );

    const result = wrapped.setupMiddlewares?.(
      ["base"],
      fixture.devServer as never,
    );
    expect(result).toEqual(["base", "rspack"]);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fixture.getSetupMiddlewareCount()).toBe(1);
    expect(fixture.getListenerCount("upgrade")).toBe(1);
    expect(fixture.getListenerCount("close")).toBe(1);

    fixture.emit("close");
  });
});
