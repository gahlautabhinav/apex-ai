import type { GenerateResult } from "@apex/ai-thinkscript";
import type { BenchPrompt } from "./types";

export type ScoreStatus = "usable" | "missing_expected" | "invalid" | "no_code";

export interface ScoreDetail {
  status: ScoreStatus;
  missing: string[];
}

export function score(prompt: BenchPrompt, result: GenerateResult): ScoreDetail {
  if (!result.producedCode) {
    return { status: "no_code", missing: [] };
  }
  if (!result.validation.ok) {
    return { status: "invalid", missing: [] };
  }
  const code = result.code.toLowerCase();
  const missing = prompt.expect.filter((e) => !code.includes(e.toLowerCase()));
  return missing.length === 0
    ? { status: "usable", missing: [] }
    : { status: "missing_expected", missing };
}
