import { describe, it, expect } from "vitest";
import { buildReport, formatReport } from "../src/report";
import type { RunRow } from "../src/runner";

const row = (over: Partial<RunRow>): RunRow => ({
  id: "x", category: "moving-average", mode: "generate", prompt: "p",
  status: "usable", missing: [], attempts: 1, ok: true, producedCode: true, code: "plot X = close;",
  ...over,
});

describe("buildReport", () => {
  it("computes usable and valid rates and per-category breakdown", () => {
    const rows: RunRow[] = [
      row({ id: "a", status: "usable" }),
      row({ id: "b", status: "missing_expected", missing: ["RSI"], ok: true, producedCode: true }),
      row({ id: "c", category: "scanner", status: "invalid", ok: false }),
    ];
    const r = buildReport(rows);
    expect(r.total).toBe(3);
    expect(r.byStatus.usable).toBe(1);
    expect(r.byStatus.missing_expected).toBe(1);
    expect(r.byStatus.invalid).toBe(1);
    expect(r.usableRate).toBeCloseTo(1 / 3);
    expect(r.validRate).toBeCloseTo(2 / 3); // a (usable) + b (produced+ok) are "valid"; c is not
    expect(r.byCategory["moving-average"].total).toBe(2);
    expect(r.byCategory["moving-average"].usable).toBe(1);
    expect(r.failures.map((f) => f.id)).toEqual(["b", "c"]);
  });
});

describe("formatReport", () => {
  it("renders a markdown summary with the usable rate and failures", () => {
    const md = formatReport(buildReport([row({ id: "a", status: "usable" }), row({ id: "b", status: "invalid", ok: false })]));
    expect(md).toContain("Usable rate");
    expect(md).toContain("50.0%");
    expect(md).toContain("Failures");
    expect(md).toContain("b");
  });
});
