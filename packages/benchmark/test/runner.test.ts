import { describe, it, expect } from "vitest";
import { runBenchmark } from "../src/runner";
import { FakeLlmClient } from "@apex/ai-thinkscript";
import { THINKSCRIPT_SCANNER_SYSTEM } from "@apex/ai-thinkscript";
import type { BenchPrompt } from "../src/types";

const fenced = (code: string) => "```thinkscript\n" + code + "\n```\n\nnote";

const prompts: BenchPrompt[] = [
  { id: "g", category: "moving-average", mode: "generate", prompt: "20 sma", expect: ["Average", "20"] },
  { id: "s", category: "scanner", mode: "scan", prompt: "above 20 sma", expect: ["plot scan", "Average"] },
];

describe("runBenchmark", () => {
  it("runs each prompt, scores it, and reports progress", async () => {
    const client = new FakeLlmClient([
      fenced("plot SMA = Average(close, 20);"),
      fenced("plot scan = close > Average(close, 20);"),
    ]);
    const seen: string[] = [];
    const rows = await runBenchmark(prompts, client, (_d, _t, row) => seen.push(row.id));
    expect(rows.length).toBe(2);
    expect(rows[0].status).toBe("usable");
    expect(rows[1].status).toBe("usable");
    expect(seen).toEqual(["g", "s"]);
  });

  it("routes scan prompts through the scanner surface", async () => {
    const client = new FakeLlmClient([fenced("plot scan = close > Average(close, 20);")]);
    await runBenchmark([prompts[1]], client);
    expect(client.calls[0].system).toBe(THINKSCRIPT_SCANNER_SYSTEM);
  });
});
