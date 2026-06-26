import { tokenize } from "./lexer";
import { Diagnostic, ValidationResult } from "./types";
import { checkStructure } from "./rules/structure";
import { checkSemantics } from "./rules/semantics";

export function validate(source: string): ValidationResult {
  const tokens = tokenize(source);
  const diags: Diagnostic[] = [
    ...checkStructure(tokens),
    ...checkSemantics(tokens),
  ];

  const errors = diags.filter((d) => d.severity === "error");
  const warnings = diags.filter((d) => d.severity === "warning");
  return { ok: errors.length === 0, errors, warnings };
}
