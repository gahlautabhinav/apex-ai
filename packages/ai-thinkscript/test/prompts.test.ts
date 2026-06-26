import { describe, it, expect } from "vitest";
import { THINKSCRIPT_GENERATE_SYSTEM } from "../src/prompts";

describe("generation system prompt", () => {
  it("carries the non-advisory guardrail", () => {
    expect(THINKSCRIPT_GENERATE_SYSTEM.toLowerCase()).toContain("never give financial advice");
  });

  it("instructs a single fenced thinkscript block", () => {
    expect(THINKSCRIPT_GENERATE_SYSTEM).toContain("thinkscript");
  });

  it("states that generated code must be reviewed before use", () => {
    expect(THINKSCRIPT_GENERATE_SYSTEM.toLowerCase()).toContain("review");
  });
});
