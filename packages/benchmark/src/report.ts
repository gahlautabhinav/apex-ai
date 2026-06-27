import type { RunRow } from "./runner";
import type { ScoreStatus } from "./score";

export interface Report {
  total: number;
  validRate: number; // producedCode && ok (objective: syntactically valid code produced)
  usableRate: number; // status === "usable" (valid AND matched the expected built-ins)
  byStatus: Record<ScoreStatus, number>;
  byCategory: Record<string, { total: number; usable: number; rate: number }>;
  failures: RunRow[];
}

export function buildReport(rows: RunRow[]): Report {
  const total = rows.length;
  const byStatus: Record<ScoreStatus, number> = {
    usable: 0,
    missing_expected: 0,
    invalid: 0,
    no_code: 0,
  };
  const byCategory: Record<string, { total: number; usable: number; rate: number }> = {};
  let usable = 0;
  let valid = 0;

  for (const r of rows) {
    byStatus[r.status]++;
    if (r.status === "usable") usable++;
    if (r.producedCode && r.ok) valid++;
    const c = (byCategory[r.category] ??= { total: 0, usable: 0, rate: 0 });
    c.total++;
    if (r.status === "usable") c.usable++;
  }
  for (const c of Object.values(byCategory)) {
    c.rate = c.total ? c.usable / c.total : 0;
  }

  return {
    total,
    validRate: total ? valid / total : 0,
    usableRate: total ? usable / total : 0,
    byStatus,
    byCategory,
    failures: rows.filter((r) => r.status !== "usable"),
  };
}

export function formatReport(report: Report): string {
  const pct = (n: number) => (n * 100).toFixed(1) + "%";
  const lines: string[] = [];
  lines.push("# ThinkScript Generation Benchmark");
  lines.push("");
  lines.push(`Total prompts: ${report.total}`);
  lines.push(`Usable rate (valid + matched expected built-ins): **${pct(report.usableRate)}**`);
  lines.push(`Valid rate (produced code + passed validator): ${pct(report.validRate)}`);
  lines.push("");
  lines.push(
    `Status counts — usable: ${report.byStatus.usable}, missing_expected: ${report.byStatus.missing_expected}, invalid: ${report.byStatus.invalid}, no_code: ${report.byStatus.no_code}`,
  );
  lines.push("");
  lines.push("> `invalid`/`no_code` are objective (validator-authoritative). `missing_expected` is a heuristic (the expected built-ins were absent) — review those before trusting them as failures.");
  lines.push("");
  lines.push("## By category");
  for (const [cat, c] of Object.entries(report.byCategory)) {
    lines.push(`- ${cat}: ${pct(c.rate)} (${c.usable}/${c.total})`);
  }
  if (report.failures.length) {
    lines.push("");
    lines.push("## Failures (review)");
    for (const f of report.failures) {
      const reason = f.status === "missing_expected" ? `missing: ${f.missing.join(", ")}` : f.status;
      lines.push(`- [${f.status}] \`${f.id}\` (${f.mode}) — ${reason}`);
      lines.push(`  prompt: ${f.prompt}`);
    }
  }
  return lines.join("\n");
}
