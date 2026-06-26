import { describe, it, expect } from "vitest";
import { generateThinkScript } from "@apex/ai-thinkscript";
import { ClaudeCliClient, type CommandRunner } from "../src";

// A fake runner that returns a valid fenced ThinkScript block, exercising the
// whole pipeline: generateThinkScript -> ClaudeCliClient -> runner -> parse ->
// validate, with no real CLI call.
const fencedValid: CommandRunner = async () => ({
  stdout: JSON.stringify({
    type: "result",
    is_error: false,
    result: "```thinkscript\nplot SMA = Average(close, 20);\n```\n\nA 20-period SMA.",
  }),
  stderr: "",
  exitCode: 0,
});

describe("generateThinkScript over ClaudeCliClient (offline)", () => {
  it("produces validated code through the adapter", async () => {
    const client = new ClaudeCliClient({ run: fencedValid });
    const r = await generateThinkScript("20 period sma", client);
    expect(r.producedCode).toBe(true);
    expect(r.validation.ok).toBe(true);
    expect(r.code).toBe("plot SMA = Average(close, 20);");
    expect(r.attempts).toBe(1);
    expect(r.reviewRequired).toBe(true);
  });
});
