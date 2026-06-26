import { describe, it, expect } from "vitest";
import { flattenMessages, mapModel, extractResult } from "../src/helpers";

describe("flattenMessages", () => {
  it("labels a single user message", () => {
    expect(flattenMessages([{ role: "user", content: "hi" }])).toBe("User: hi");
  });

  it("labels and joins a multi-turn conversation", () => {
    const out = flattenMessages([
      { role: "user", content: "a" },
      { role: "assistant", content: "b" },
      { role: "user", content: "c" },
    ]);
    expect(out).toBe("User: a\n\nAssistant: b\n\nUser: c");
  });
});

describe("mapModel", () => {
  it("maps known ids to CLI aliases", () => {
    expect(mapModel("claude-sonnet-4-6")).toBe("sonnet");
    expect(mapModel("claude-haiku-4-5")).toBe("haiku");
  });
  it("passes an unknown id through unchanged", () => {
    expect(mapModel("claude-opus-4-8")).toBe("claude-opus-4-8");
  });
});

describe("extractResult", () => {
  it("returns the result text from success JSON", () => {
    const json = JSON.stringify({ type: "result", is_error: false, result: "plot X = close;" });
    expect(extractResult(json)).toBe("plot X = close;");
  });
  it("throws on is_error JSON", () => {
    const json = JSON.stringify({ is_error: true, result: "boom" });
    expect(() => extractResult(json)).toThrow(/boom/);
  });
  it("throws on non-JSON output", () => {
    expect(() => extractResult("not json at all")).toThrow(/non-JSON/);
  });
  it("throws when result is missing", () => {
    expect(() => extractResult(JSON.stringify({ type: "result" }))).toThrow(/result/);
  });
  it("throws on bare null JSON", () => {
    expect(() => extractResult("null")).toThrow(/non-object/);
  });
});
