import { describe, it, expect } from "vitest";
import {
  debugThinkScript,
  refactorThinkScript,
  generateScanner,
  explainThinkScript,
} from "../src/surfaces";
import { FakeLlmClient } from "../src/fake-llm-client";
import {
  THINKSCRIPT_DEBUG_SYSTEM,
  THINKSCRIPT_REFACTOR_SYSTEM,
  THINKSCRIPT_SCANNER_SYSTEM,
  THINKSCRIPT_EXPLAIN_SYSTEM,
} from "../src/prompts";

const fenced = (code: string) => "```thinkscript\n" + code + "\n```\n\nnote";

describe("debugThinkScript", () => {
  it("uses the debug prompt + complex model and returns validated code", async () => {
    const client = new FakeLlmClient([fenced("plot SMA = Average(close, 20);")]);
    const r = await debugThinkScript("plot SMA = Average(close, 20;", client);
    expect(r.producedCode).toBe(true);
    expect(r.validation.ok).toBe(true);
    expect(client.calls[0].system).toBe(THINKSCRIPT_DEBUG_SYSTEM);
    expect(client.calls[0].model).toBe("claude-sonnet-4-6");
    expect(client.calls[0].messages[0].content).toContain("plot SMA = Average(close, 20;");
  });

  it("includes the platform error in the prompt when provided", async () => {
    const client = new FakeLlmClient([fenced("plot X = close;")]);
    await debugThinkScript("plot X = clse;", client, { error: "Unknown symbol: clse" });
    expect(client.calls[0].messages[0].content).toContain("Unknown symbol: clse");
  });
});

describe("refactorThinkScript", () => {
  it("uses the refactor prompt and includes the goal", async () => {
    const client = new FakeLlmClient([fenced("plot X = close;")]);
    await refactorThinkScript("plot X = close;", client, { goal: "use an input for length" });
    expect(client.calls[0].system).toBe(THINKSCRIPT_REFACTOR_SYSTEM);
    expect(client.calls[0].messages[0].content).toContain("use an input for length");
  });
});

describe("generateScanner", () => {
  it("uses the scanner prompt + complex model and returns validated code", async () => {
    const client = new FakeLlmClient([fenced("plot scan = close > Average(close, 20);")]);
    const r = await generateScanner("price above its 20-day average", client);
    expect(r.producedCode).toBe(true);
    expect(r.validation.ok).toBe(true);
    expect(client.calls[0].system).toBe(THINKSCRIPT_SCANNER_SYSTEM);
    expect(client.calls[0].model).toBe("claude-sonnet-4-6");
  });
});

describe("explainThinkScript", () => {
  it("uses the explain prompt + fast model and returns the prose explanation", async () => {
    const client = new FakeLlmClient(["This plots a 20-period simple moving average of the close."]);
    const r = await explainThinkScript("plot SMA = Average(close, 20);", client);
    expect(r.explanation).toBe("This plots a 20-period simple moving average of the close.");
    expect(client.calls[0].system).toBe(THINKSCRIPT_EXPLAIN_SYSTEM);
    expect(client.calls[0].model).toBe("claude-haiku-4-5");
    expect(client.calls[0].messages[0].content).toBe("plot SMA = Average(close, 20);");
    expect(client.calls.length).toBe(1); // one-shot, no self-correction loop
  });
});
