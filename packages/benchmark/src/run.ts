import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ClaudeCliClient } from "@apex/claude-client";
import type { BenchPrompt } from "./types";
import { runBenchmark } from "./runner";
import { buildReport, formatReport } from "./report";

const here = dirname(fileURLToPath(import.meta.url));
const prompts: BenchPrompt[] = JSON.parse(
  readFileSync(join(here, "../data/prompts.json"), "utf8"),
);

const client = new ClaudeCliClient();

console.log(
  `Running ${prompts.length} prompts on the Claude Code subscription (~20s each; this takes a while)…`,
);

const rows = await runBenchmark(prompts, client, (done, total, row) => {
  const tag = row.status === "usable" ? "ok " : row.status;
  console.log(`[${done}/${total}] ${row.id} → ${tag} (attempts ${row.attempts})`);
});

const report = buildReport(rows);
const md = formatReport(report);

const outDir = join(here, "../results");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "latest.md"), md, "utf8");
writeFileSync(join(outDir, "latest.json"), JSON.stringify({ report, rows }, null, 2), "utf8");

console.log("\n" + md);
console.log("\nWrote packages/benchmark/results/latest.md and latest.json");
