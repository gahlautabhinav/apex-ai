import { describe, it, expect } from "vitest";
import { THINKSCRIPT_GENERATE_SYSTEM, THINKSCRIPT_REFACTOR_SYSTEM, THINKSCRIPT_SCANNER_SYSTEM } from "../src/prompts";

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

describe("refactor and scanner prompts", () => {
  it("refactor prompt preserves behavior and carries the guardrail", () => {
    expect(THINKSCRIPT_REFACTOR_SYSTEM.toLowerCase()).toContain("preserv");
    expect(THINKSCRIPT_REFACTOR_SYSTEM.toLowerCase()).toContain("never give financial advice");
  });
  it("scanner prompt requires a boolean scan plot and carries the guardrail", () => {
    expect(THINKSCRIPT_SCANNER_SYSTEM).toContain("plot scan");
    expect(THINKSCRIPT_SCANNER_SYSTEM.toLowerCase()).toContain("never give financial advice");
  });
});
