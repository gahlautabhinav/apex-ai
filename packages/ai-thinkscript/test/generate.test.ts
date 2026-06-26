import { describe, it, expect } from "vitest";
import { generateThinkScript, correctionPrompt } from "../src/generate";
import { FakeLlmClient } from "../src/fake-llm-client";
import { validate } from "@apex/thinkscript-validator";

const block = (code: string, note = "explanation") =>
  "```thinkscript\n" + code + "\n```\n\n" + note;

const GOOD = block("plot SMA = Average(close, 20);");
const BROKEN = block("plot SMA = Average(close, 20;"); // TS001 unbalanced paren

describe("generateThinkScript", () => {
  it("returns valid code on the first attempt", async () => {
    const client = new FakeLlmClient([GOOD]);
    const r = await generateThinkScript("20 period sma", client);
    expect(r.attempts).toBe(1);
    expect(r.validation.ok).toBe(true);
    expect(r.code).toBe("plot SMA = Average(close, 20);");
    expect(r.explanation).toContain("explanation");
    expect(r.reviewRequired).toBe(true);
    expect(client.calls.length).toBe(1);
  });

  it("uses the routed complex model by default", async () => {
    const client = new FakeLlmClient([GOOD]);
    await generateThinkScript("x", client);
    expect(client.calls[0].model).toBe("claude-sonnet-4-6");
  });

  it("sends the non-advisory system prompt", async () => {
    const client = new FakeLlmClient([GOOD]);
    await generateThinkScript("x", client);
    expect(client.calls[0].system.toLowerCase()).toContain("never give financial advice");
  });

  it("self-corrects: feeds validation errors back and recovers", async () => {
    const client = new FakeLlmClient([BROKEN, GOOD]);
    const r = await generateThinkScript("x", client);
    expect(r.attempts).toBe(2);
    expect(r.validation.ok).toBe(true);
    expect(r.code).toBe("plot SMA = Average(close, 20);");
    // second call carries the original intent, the broken assistant reply, and a correction
    expect(client.calls[1].messages.length).toBe(3);
    expect(client.calls[1].messages[2].content).toContain("TS001");
  });

  it("returns best-effort with validation.ok=false when attempts are exhausted", async () => {
    const client = new FakeLlmClient([BROKEN]); // always broken
    const r = await generateThinkScript("x", client, { maxAttempts: 2 });
    expect(r.attempts).toBe(2);
    expect(r.validation.ok).toBe(false);
    expect(r.reviewRequired).toBe(true);
    expect(client.calls.length).toBe(2);
  });

  it("clamps maxAttempts to at least 1", async () => {
    const client = new FakeLlmClient([GOOD]);
    const r = await generateThinkScript("x", client, { maxAttempts: 0 });
    expect(r.attempts).toBe(1);
    expect(client.calls.length).toBe(1);
  });
});

describe("correctionPrompt", () => {
  it("names the failing diagnostic codes", () => {
    const v = validate("plot SMA = Average(close, 20;");
    expect(v.ok).toBe(false);
    expect(correctionPrompt(v)).toContain("TS001");
  });
});
