import { describe, it, expect } from "vitest";
import { tokenize } from "../src/lexer";

describe("tokenize", () => {
  it("strips # comments to end of line", () => {
    const toks = tokenize("# hello\nclose");
    expect(toks.map((t) => t.value)).toEqual(["close", ""]);
  });

  it("reads a terminated string", () => {
    const s = tokenize('"hi"')[0];
    expect(s.kind).toBe("string");
    expect(s.value).toBe("hi");
    expect(s.terminated).toBe(true);
  });

  it("flags an unterminated string at end of line", () => {
    const s = tokenize('"hi\n')[0];
    expect(s.kind).toBe("string");
    expect(s.terminated).toBe(false);
  });

  it("tokenizes a declaration statement", () => {
    const toks = tokenize("plot SMA = Average(close, 20);").filter((t) => t.kind !== "eof");
    expect(toks.map((t) => t.value)).toEqual([
      "plot", "SMA", "=", "Average", "(", "close", ",", "20", ")", ";",
    ]);
  });

  it("recognizes two-char operators", () => {
    const toks = tokenize("close >= open").filter((t) => t.kind !== "eof");
    expect(toks.map((t) => t.value)).toEqual(["close", ">=", "open"]);
  });

  it("tracks line numbers", () => {
    const toks = tokenize("close\nvolume");
    expect(toks[0].line).toBe(1);
    expect(toks[1].line).toBe(2);
  });
});
