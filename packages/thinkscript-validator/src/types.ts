export type Severity = "error" | "warning";

export interface Diagnostic {
  code: string; // e.g. "TS001"
  message: string;
  severity: Severity;
  line: number; // 1-based
  col: number; // 1-based
}

export interface ValidationResult {
  ok: boolean; // true iff there are no error-severity diagnostics
  errors: Diagnostic[];
  warnings: Diagnostic[];
}
