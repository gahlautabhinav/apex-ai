import { describe, it, expect } from "vitest";
import { validate } from "../src/index";

describe("structure rules", () => {
  it("accepts balanced delimiters", () => {
    const res = validate("plot X = Average(close, 20);");
    expect(res.errors).toEqual([]);
    expect(res.ok).toBe(true);
  });

  it("flags unbalanced parentheses as TS001", () => {
    const res = validate("plot X = Average(close, 20;");
    expect(res.ok).toBe(false);
    expect(res.errors.some((e) => e.code === "TS001")).toBe(true);
  });

  it("flags a mismatched bracket as TS001", () => {
    const res = validate("plot X = close[1);");
    expect(res.errors.some((e) => e.code === "TS001")).toBe(true);
  });

  it("flags curly braces as TS002", () => {
    const res = validate("def x = { close };");
    expect(res.errors.some((e) => e.code === "TS002")).toBe(true);
  });

  it("flags an unterminated string as TS003", () => {
    const res = validate('AddLabel(yes, "hello);');
    expect(res.errors.some((e) => e.code === "TS003")).toBe(true);
  });
});
