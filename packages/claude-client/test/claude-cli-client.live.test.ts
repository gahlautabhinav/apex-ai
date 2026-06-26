import { it, expect } from "vitest";
import { generateThinkScript } from "@apex/ai-thinkscript";
import { ClaudeCliClient } from "../src";

// LIVE: runs the real `claude` CLI on your Claude Code subscription.
// Skipped by default. Run with:  APEX_LIVE=1 npm test -- claude-cli-client.live
// (spends a small amount of subscription quota; takes up to ~2 minutes.)
it.skipIf(!process.env.APEX_LIVE)(
  "live: generates a real ThinkScript study via Claude Code",
  async () => {
    const r = await generateThinkScript(
      "a study that plots a 20 period simple moving average of the close",
      new ClaudeCliClient(),
    );
    expect(r.producedCode).toBe(true);
    expect(r.validation.ok).toBe(true);
    expect(r.code.length).toBeGreaterThan(0);
  },
  120_000,
);
