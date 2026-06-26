import { describe, it, expect } from "vitest";
import { handleGenerate } from "../src/handler";
import { FakeLlmClient } from "@apex/ai-thinkscript";

const fenced = (code: string) => "```thinkscript\n" + code + "\n```\n\nexplanation";
const GOOD = fenced("plot SMA = Average(close, 20);");
const BROKEN = fenced("plot SMA = Average(close, 20;"); // TS001

describe("handleGenerate", () => {
  it("returns 200 with validated code for a good generation", async () => {
    const res = await handleGenerate(JSON.stringify({ intent: "20 period sma" }), new FakeLlmClient([GOOD]));
    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect(body.code).toBe("plot SMA = Average(close, 20);");
    expect(body.ok).toBe(true);
    expect(body.producedCode).toBe(true);
    expect(body.reviewRequired).toBe(true);
  });

  it("returns the code with ok=false and errors when generation stays invalid", async () => {
    const res = await handleGenerate(JSON.stringify({ intent: "x" }), new FakeLlmClient([BROKEN]));
    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect(body.ok).toBe(false);
    expect(Array.isArray(body.errors)).toBe(true);
    expect((body.errors as unknown[]).length).toBeGreaterThan(0);
  });

  it("returns 400 for a non-JSON body", async () => {
    const res = await handleGenerate("not json", new FakeLlmClient([GOOD]));
    expect(res.status).toBe(400);
  });

  it("returns 400 for a missing or empty intent", async () => {
    expect((await handleGenerate(JSON.stringify({}), new FakeLlmClient([GOOD]))).status).toBe(400);
    expect((await handleGenerate(JSON.stringify({ intent: "   " }), new FakeLlmClient([GOOD]))).status).toBe(400);
  });

  it("returns 400 for an over-long intent", async () => {
    const long = "a".repeat(2001);
    const res = await handleGenerate(JSON.stringify({ intent: long }), new FakeLlmClient([GOOD]));
    expect(res.status).toBe(400);
  });
});
