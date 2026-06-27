import {
  generateThinkScript,
  generateScanner,
  type LlmClient,
  type GenerateResult,
} from "@apex/ai-thinkscript";
import type { BenchPrompt } from "./types";
import { score, type ScoreStatus } from "./score";

export interface RunRow {
  id: string;
  category: string;
  mode: string;
  prompt: string;
  status: ScoreStatus;
  missing: string[];
  attempts: number;
  ok: boolean;
  producedCode: boolean;
  code: string;
}

export type ProgressFn = (done: number, total: number, row: RunRow) => void;

// Runs each prompt through the matching surface, scores it, and reports
// progress. Sequential (one `claude` spawn at a time with the real client).
export async function runBenchmark(
  prompts: BenchPrompt[],
  client: LlmClient,
  onProgress?: ProgressFn,
): Promise<RunRow[]> {
  const rows: RunRow[] = [];
  for (const p of prompts) {
    const result: GenerateResult =
      p.mode === "scan"
        ? await generateScanner(p.prompt, client)
        : await generateThinkScript(p.prompt, client);
    const s = score(p, result);
    const row: RunRow = {
      id: p.id,
      category: p.category,
      mode: p.mode,
      prompt: p.prompt,
      status: s.status,
      missing: s.missing,
      attempts: result.attempts,
      ok: result.validation.ok,
      producedCode: result.producedCode,
      code: result.code,
    };
    rows.push(row);
    onProgress?.(rows.length, prompts.length, row);
  }
  return rows;
}
