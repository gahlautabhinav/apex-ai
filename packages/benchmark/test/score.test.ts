import { describe, it, expect } from "vitest";
import { score } from "../src/score";
import type { BenchPrompt } from "../src/types";
import type { GenerateResult } from "@apex/ai-thinkscript";

const prompt: BenchPrompt = {
  id: "t", category: "c", mode: "generate", prompt: "p",
  expect: ["ExpAverage", "20"],
};

const result = (over: Partial<GenerateResult>): GenerateResult => ({
  code: "",
  explanation: "",
  validation: { ok: true, errors: [], warnings: [] },
  producedCode: true,
  attempts: 1,
  reviewRequired: true,
  ...over,
});

describe("score", () => {
  it("usable when produced, valid, and all expects present", () => {
    const r = result({ code: "plot X = ExpAverage(close, 20);" });
    expect(score(prompt, r).status).toBe("usable");
  });

  it("no_code when nothing was produced", () => {
    const r = result({ producedCode: false, code: "" });
    expect(score(prompt, r).status).toBe("no_code");
  });

  it("invalid when the validator failed", () => {
    const r = result({ code: "plot X = ExpAverage(close, 20;", validation: { ok: false, errors: [{ code: "TS001", message: "x", severity: "error", line: 1, col: 1 }], warnings: [] } });
    expect(score(prompt, r).status).toBe("invalid");
  });

  it("missing_expected (case-insensitive) lists the absent expects", () => {
    const r = result({ code: "plot X = Average(close, 50);" }); // no ExpAverage, no 20
    const s = score(prompt, r);
    expect(s.status).toBe("missing_expected");
    expect(s.missing).toEqual(["ExpAverage", "20"]);
  });
});
