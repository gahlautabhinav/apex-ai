import { describe, it, expect } from "vitest";
import { routeModel, type TaskClass } from "../src/model-router";

describe("routeModel", () => {
  it("routes generation to the complex model", () => {
    expect(routeModel("generate")).toBe("claude-sonnet-4-6");
  });

  it("routes debug/refactor/refine to the complex model", () => {
    expect(routeModel("debug")).toBe("claude-sonnet-4-6");
    expect(routeModel("refactor")).toBe("claude-sonnet-4-6");
    expect(routeModel("refine")).toBe("claude-sonnet-4-6");
  });

  it("routes explanation to the fast model", () => {
    expect(routeModel("explain")).toBe("claude-haiku-4-5");
  });

  it("routes scanner generation to the complex model", () => {
    expect(routeModel("scanner")).toBe("claude-sonnet-4-6");
  });

  it("maps every TaskClass to a known model id", () => {
    const all: TaskClass[] = ["generate", "explain", "debug", "refactor", "refine", "scanner"];
    const known = new Set(["claude-sonnet-4-6", "claude-haiku-4-5"]);
    for (const t of all) {
      expect(known.has(routeModel(t))).toBe(true);
    }
  });
});
