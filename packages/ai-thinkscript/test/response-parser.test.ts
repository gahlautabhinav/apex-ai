import { describe, it, expect } from "vitest";
import { parseResponse } from "../src/response-parser";

describe("parseResponse", () => {
  it("extracts a fenced thinkscript block and the surrounding explanation", () => {
    const text =
      "Here is a moving average study.\n\n" +
      "```thinkscript\nplot SMA = Average(close, 20);\n```\n\n" +
      "It plots a 20-period simple moving average.";
    const r = parseResponse(text);
    expect(r.code).toBe("plot SMA = Average(close, 20);");
    expect(r.explanation).toContain("20-period simple moving average");
    expect(r.explanation).toContain("Here is a moving average study.");
    expect(r.code).not.toContain("```");
    expect(r.code).not.toContain("thinkscript");
  });

  it("treats the whole text as code when there is no fence", () => {
    const r = parseResponse("plot X = close;");
    expect(r.code).toBe("plot X = close;");
    expect(r.explanation).toBe("");
  });

  it("takes the first block when multiple are present", () => {
    const text = "```thinkscript\nplot A = close;\n```\nthen\n```thinkscript\nplot B = open;\n```";
    expect(parseResponse(text).code).toBe("plot A = close;");
  });

  it("handles a multi-line code block", () => {
    const text = "```thinkscript\ninput length = 20;\nplot SMA = Average(close, length);\n```";
    expect(parseResponse(text).code).toBe("input length = 20;\nplot SMA = Average(close, length);");
  });
});
