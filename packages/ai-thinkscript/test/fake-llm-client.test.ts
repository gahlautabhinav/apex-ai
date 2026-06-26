import { describe, it, expect } from "vitest";
import { FakeLlmClient } from "../src/fake-llm-client";
import type { LlmRequest } from "../src/llm-client";

const req = (content: string): LlmRequest => ({
  system: "sys",
  messages: [{ role: "user", content }],
  model: "test-model",
});

describe("FakeLlmClient", () => {
  it("returns scripted responses in order", async () => {
    const c = new FakeLlmClient(["a", "b"]);
    expect(await c.complete(req("1"))).toBe("a");
    expect(await c.complete(req("2"))).toBe("b");
  });

  it("repeats the last response once exhausted", async () => {
    const c = new FakeLlmClient(["only"]);
    expect(await c.complete(req("1"))).toBe("only");
    expect(await c.complete(req("2"))).toBe("only");
  });

  it("records every request in calls", async () => {
    const c = new FakeLlmClient(["x"]);
    await c.complete(req("first"));
    await c.complete(req("second"));
    expect(c.calls.length).toBe(2);
    expect(c.calls[0].messages[0].content).toBe("first");
    expect(c.calls[1].messages[0].content).toBe("second");
  });

  it("throws if constructed with no responses", () => {
    expect(() => new FakeLlmClient([])).toThrow();
  });
});
