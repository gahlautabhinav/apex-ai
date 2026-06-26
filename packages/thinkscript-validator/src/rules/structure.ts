import { Token } from "../tokens";
import { Diagnostic } from "../types";

const MATCHING: Record<string, string> = { "(": ")", "[": "]" };
const CLOSERS = new Set([")", "]"]);

// TS001 delimiters, TS002 braces, TS003 unterminated string.
export function checkStructure(tokens: Token[]): Diagnostic[] {
  const diags: Diagnostic[] = [];
  const stack: Token[] = [];

  for (const t of tokens) {
    if (t.kind === "string" && t.terminated === false) {
      diags.push({
        code: "TS003",
        severity: "error",
        message: "Unterminated string literal.",
        line: t.line,
        col: t.col,
      });
      continue;
    }

    if (t.kind !== "punct") continue;

    if (t.value === "{" || t.value === "}") {
      diags.push({
        code: "TS002",
        severity: "error",
        message: `Invalid brace '${t.value}'. ThinkScript does not use curly braces.`,
        line: t.line,
        col: t.col,
      });
      continue;
    }

    if (t.value === "(" || t.value === "[") {
      stack.push(t);
      continue;
    }

    if (CLOSERS.has(t.value)) {
      const open = stack.pop();
      if (!open) {
        diags.push({
          code: "TS001",
          severity: "error",
          message: `Unmatched closing '${t.value}'.`,
          line: t.line,
          col: t.col,
        });
      } else if (MATCHING[open.value] !== t.value) {
        diags.push({
          code: "TS001",
          severity: "error",
          message: `Mismatched '${open.value}' closed by '${t.value}'.`,
          line: t.line,
          col: t.col,
        });
      }
    }
  }

  for (const open of stack) {
    diags.push({
      code: "TS001",
      severity: "error",
      message: `Unclosed '${open.value}'.`,
      line: open.line,
      col: open.col,
    });
  }

  return diags;
}
