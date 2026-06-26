import { describe, it, expect } from "vitest";
import { validate } from "../src/index";

describe("semantic rules", () => {
  it("flags a reserved word used as a name (TS004)", () => {
    const res = validate("def plot = close;");
    expect(res.ok).toBe(false);
    expect(res.errors.some((e) => e.code === "TS004")).toBe(true);
  });

  it("flags an empty declaration target (TS005)", () => {
    const res = validate("def = close;");
    expect(res.ok).toBe(false);
    expect(res.errors.some((e) => e.code === "TS005")).toBe(true);
  });

  it("warns on an unknown function but does not fail (TS100)", () => {
    const res = validate("plot X = Frobnicate(close);");
    expect(res.ok).toBe(true);
    expect(res.warnings.some((w) => w.code === "TS100")).toBe(true);
  });

  it("does not warn on known builtins or method calls", () => {
    const res = validate('plot X = Average(close, 20);\nX.SetDefaultColor(Color.CYAN);');
    expect(res.warnings.filter((w) => w.code === "TS100")).toEqual([]);
  });

  it("warns when declare is not at the top (TS101)", () => {
    const res = validate("plot X = close;\ndeclare lower;");
    expect(res.ok).toBe(true);
    expect(res.warnings.some((w) => w.code === "TS101")).toBe(true);
  });
});
