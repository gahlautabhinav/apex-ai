import { Token } from "../tokens";
import { Diagnostic } from "../types";
import { RESERVED, BUILTINS, FIELDS } from "../builtins";

const DECL_KW = new Set(["def", "plot", "input", "rec"]);

// TS004 reserved-as-name, TS005 missing name (errors);
// TS100 unknown function, TS101 declare placement (warnings).
export function checkSemantics(tokens: Token[]): Diagnostic[] {
  const diags: Diagnostic[] = [];
  const sig = tokens.filter((t) => t.kind !== "eof");

  // Pass 1: collect user-defined names (declaration targets + script names).
  const userNames = new Set<string>();
  for (let i = 0; i < sig.length - 1; i++) {
    const t = sig[i];
    const next = sig[i + 1];
    if (
      t.kind === "ident" &&
      (DECL_KW.has(t.value) || t.value === "script") &&
      next.kind === "ident" &&
      !RESERVED.has(next.value)
    ) {
      userNames.add(next.value);
    }
  }

  // Pass 2: rule checks.
  let seenDecl = false;
  for (let i = 0; i < sig.length; i++) {
    const t = sig[i];
    const prev = sig[i - 1];
    const next = sig[i + 1];

    if (t.kind === "ident" && DECL_KW.has(t.value)) {
      seenDecl = true;
      if (!next || next.kind !== "ident") {
        diags.push({
          code: "TS005",
          severity: "error",
          message: `'${t.value}' must be followed by a name.`,
          line: t.line,
          col: t.col,
        });
      } else if (RESERVED.has(next.value)) {
        diags.push({
          code: "TS004",
          severity: "error",
          message: `Reserved word '${next.value}' cannot be used as a name.`,
          line: next.line,
          col: next.col,
        });
      }
    }

    if (t.kind === "ident" && t.value === "declare" && seenDecl) {
      diags.push({
        code: "TS101",
        severity: "warning",
        message: "'declare' should appear at the top, before any def/plot/input/rec.",
        line: t.line,
        col: t.col,
      });
    }

    if (
      t.kind === "ident" &&
      next &&
      next.kind === "punct" &&
      next.value === "(" &&
      !(prev && prev.kind === "punct" && prev.value === ".") && // skip method calls
      !RESERVED.has(t.value) &&
      !BUILTINS.has(t.value) &&
      !FIELDS.has(t.value) &&
      !userNames.has(t.value)
    ) {
      diags.push({
        code: "TS100",
        severity: "warning",
        message: `Unknown function '${t.value}' (not a recognized built-in).`,
        line: t.line,
        col: t.col,
      });
    }
  }

  return diags;
}
