# ThinkScript Static Validator + Correctness Corpus — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the ThinkScript static validator — a lexer + deterministic rule engine that returns structured diagnostics — plus a known-good/known-bad correctness corpus and a regression harness. This is APEX's correctness gate (PRD §13.2, Architecture §8.4, Roadmap §8.1).

**Architecture:** Pure-TypeScript library, no runtime dependencies. `tokenize()` turns ThinkScript source into tokens; `validate()` runs rule functions over the tokens and returns `{ ok, errors, warnings }`. ERRORS are deterministic and precise (unbalanced delimiters, invalid braces, unterminated strings, reserved-word-as-name, empty declaration target). Anything uncertain (unknown function, declare placement) is a WARNING, never an error — so the validator never falsely rejects valid code, and `ok` flips false only on genuine faults. A JSON-manifest corpus drives a Vitest regression test that is the literal definition of "done" for the wedge.

**Tech Stack:** Node 24, TypeScript 5.6, Vitest 2, ESM, npm workspaces. No heavy/native deps. (Rust/Tauri deferred to the desktop-app phase per the Phase-0 stack decision.)

## Global Constraints

- **Runtime:** Node ≥ 24 (installed: v24.13.0). ESM only (`"type": "module"`).
- **Package manager:** npm (installed: 11.6.2). No yarn/pnpm.
- **Test runner:** Vitest 2.x. Tests live in `packages/*/test/**/*.test.ts`.
- **TS config:** `module: ESNext`, `moduleResolution: bundler`, `strict: true`. Import specifiers carry **no** file extension (bundler resolution).
- **Zero runtime dependencies** in the validator package. Dev deps limited to `vitest` + `typescript`.
- **Correctness gate (non-negotiable):** validator ERRORS must be precise — **0 false-positive "valid" passes** on the invalid corpus, and **0 false rejects** on the valid corpus. Uncertain checks are WARNINGS only. (Roadmap §8.9)
- **No placeholders:** every script in the corpus is real, syntactically-faithful ThinkScript.
- **Diagnostic codes:** `TS001` delimiters, `TS002` braces, `TS003` unterminated string, `TS004` reserved-as-name, `TS005` empty declaration target, `TS100` unknown function (warn), `TS101` declare placement (warn).

---

### Task 1: Project scaffold + green test harness

**Files:**
- Create: `.gitignore`
- Create: `package.json` (workspace root)
- Create: `tsconfig.base.json`
- Create: `vitest.config.ts`
- Create: `packages/thinkscript-validator/package.json`
- Create: `packages/thinkscript-validator/tsconfig.json`
- Create: `packages/thinkscript-validator/src/smoke.ts`
- Test: `packages/thinkscript-validator/test/smoke.test.ts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: a working `npm test` (Vitest) harness and the `@apex/thinkscript-validator` workspace package that every later task builds in.

- [ ] **Step 1: Initialize git**

```bash
cd /d/Stock-Project/apex-stock
git init
git checkout -b feat/thinkscript-validator
```

- [ ] **Step 2: Create `.gitignore`**

```
node_modules/
dist/
*.log
.DS_Store
```

- [ ] **Step 3: Create root `package.json`**

```json
{
  "name": "apex",
  "private": true,
  "type": "module",
  "workspaces": ["packages/*"],
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc -p packages/thinkscript-validator/tsconfig.json --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 4: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "outDir": "dist"
  }
}
```

- [ ] **Step 5: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/**/test/**/*.test.ts"],
  },
});
```

- [ ] **Step 6: Create `packages/thinkscript-validator/package.json`**

```json
{
  "name": "@apex/thinkscript-validator",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./src/index.ts"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json"
  }
}
```

- [ ] **Step 7: Create `packages/thinkscript-validator/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 8: Create the smoke source `packages/thinkscript-validator/src/smoke.ts`**

```ts
export const ping = (): string => "pong";
```

- [ ] **Step 9: Write the smoke test `packages/thinkscript-validator/test/smoke.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { ping } from "../src/smoke";

describe("harness", () => {
  it("runs vitest against TypeScript", () => {
    expect(ping()).toBe("pong");
  });
});
```

- [ ] **Step 10: Install deps and run the harness**

Run:
```bash
npm install
npm test
```
Expected: vitest runs, `harness > runs vitest against TypeScript` PASSES (1 passed).

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: scaffold npm workspace + vitest harness for thinkscript-validator"
```

---

### Task 2: Lexer (tokenizer)

**Files:**
- Create: `packages/thinkscript-validator/src/tokens.ts`
- Create: `packages/thinkscript-validator/src/lexer.ts`
- Test: `packages/thinkscript-validator/test/lexer.test.ts`
- Delete: `packages/thinkscript-validator/src/smoke.ts` and `test/smoke.test.ts` (replaced)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type TokenKind = "ident" | "number" | "string" | "punct" | "eof"`
  - `interface Token { kind: TokenKind; value: string; line: number; col: number; terminated?: boolean }`
  - `function tokenize(source: string): Token[]` — always ends with an `eof` token; comments (`#`→EOL) are stripped; strings carry `terminated`.

- [ ] **Step 1: Write the failing test `test/lexer.test.ts`**

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- lexer`
Expected: FAIL — cannot resolve `../src/lexer`.

- [ ] **Step 3: Create `src/tokens.ts`**

```ts
export type TokenKind = "ident" | "number" | "string" | "punct" | "eof";

export interface Token {
  kind: TokenKind;
  value: string;
  line: number; // 1-based
  col: number; // 1-based
  terminated?: boolean; // strings only: false if no closing quote before EOL/EOF
}
```

- [ ] **Step 4: Create `src/lexer.ts`**

```ts
import { Token } from "./tokens";

const isIdentStart = (c: string) => /[A-Za-z_]/.test(c);
const isIdentPart = (c: string) => /[A-Za-z0-9_]/.test(c);
const isDigit = (c: string) => c >= "0" && c <= "9";
const TWO_CHAR = new Set(["==", "!=", ">=", "<="]);

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  const n = source.length;
  let i = 0;
  let line = 1;
  let col = 1;

  const advance = (count = 1): void => {
    for (let k = 0; k < count; k++) {
      if (source[i] === "\n") {
        line++;
        col = 1;
      } else {
        col++;
      }
      i++;
    }
  };

  while (i < n) {
    const c = source[i];

    if (c === " " || c === "\t" || c === "\r" || c === "\n") {
      advance();
      continue;
    }

    // comment: '#' to end of line
    if (c === "#") {
      while (i < n && source[i] !== "\n") advance();
      continue;
    }

    const startLine = line;
    const startCol = col;

    // string literal
    if (c === '"') {
      advance(); // consume opening quote
      let value = "";
      let terminated = false;
      while (i < n) {
        const ch = source[i];
        if (ch === '"') {
          advance();
          terminated = true;
          break;
        }
        if (ch === "\n") break; // unterminated at end of line
        value += ch;
        advance();
      }
      tokens.push({ kind: "string", value, line: startLine, col: startCol, terminated });
      continue;
    }

    // number
    if (isDigit(c) || (c === "." && isDigit(source[i + 1] ?? ""))) {
      let value = "";
      while (i < n && (isDigit(source[i]) || source[i] === ".")) {
        value += source[i];
        advance();
      }
      tokens.push({ kind: "number", value, line: startLine, col: startCol });
      continue;
    }

    // identifier / keyword
    if (isIdentStart(c)) {
      let value = "";
      while (i < n && isIdentPart(source[i])) {
        value += source[i];
        advance();
      }
      tokens.push({ kind: "ident", value, line: startLine, col: startCol });
      continue;
    }

    // two-char punctuation
    const two = source.slice(i, i + 2);
    if (TWO_CHAR.has(two)) {
      tokens.push({ kind: "punct", value: two, line: startLine, col: startCol });
      advance(2);
      continue;
    }

    // single-char punctuation (covers ( ) [ ] { } ; , . = + - * / < > ! etc.)
    tokens.push({ kind: "punct", value: c, line: startLine, col: startCol });
    advance();
  }

  tokens.push({ kind: "eof", value: "", line, col });
  return tokens;
}
```

- [ ] **Step 5: Remove the smoke placeholders**

```bash
git rm packages/thinkscript-validator/src/smoke.ts packages/thinkscript-validator/test/smoke.test.ts
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test -- lexer`
Expected: PASS — all 6 `tokenize` cases green.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(validator): ThinkScript lexer with comment/string/number/ident tokenizing"
```

---

### Task 3: Core types + `validate()` + structure rules (TS001/TS002/TS003)

**Files:**
- Create: `packages/thinkscript-validator/src/types.ts`
- Create: `packages/thinkscript-validator/src/rules/structure.ts`
- Create: `packages/thinkscript-validator/src/validator.ts`
- Create: `packages/thinkscript-validator/src/index.ts`
- Test: `packages/thinkscript-validator/test/structure.test.ts`

**Interfaces:**
- Consumes: `tokenize` and `Token` from Task 2.
- Produces:
  - `type Severity = "error" | "warning"`
  - `interface Diagnostic { code: string; message: string; severity: Severity; line: number; col: number }`
  - `interface ValidationResult { ok: boolean; errors: Diagnostic[]; warnings: Diagnostic[] }`
  - `function checkStructure(tokens: Token[]): Diagnostic[]`
  - `function validate(source: string): ValidationResult` — `ok === (errors.length === 0)`. Exported from `index.ts`.

- [ ] **Step 1: Write the failing test `test/structure.test.ts`**

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- structure`
Expected: FAIL — cannot resolve `../src/index`.

- [ ] **Step 3: Create `src/types.ts`**

```ts
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
```

- [ ] **Step 4: Create `src/rules/structure.ts`**

```ts
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
```

- [ ] **Step 5: Create `src/validator.ts`**

```ts
import { tokenize } from "./lexer";
import { Diagnostic, ValidationResult } from "./types";
import { checkStructure } from "./rules/structure";

export function validate(source: string): ValidationResult {
  const tokens = tokenize(source);
  const diags: Diagnostic[] = [...checkStructure(tokens)];

  const errors = diags.filter((d) => d.severity === "error");
  const warnings = diags.filter((d) => d.severity === "warning");
  return { ok: errors.length === 0, errors, warnings };
}
```

- [ ] **Step 6: Create `src/index.ts`**

```ts
export { validate } from "./validator";
export type { Diagnostic, Severity, ValidationResult } from "./types";
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm test -- structure`
Expected: PASS — all 5 structure cases green.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(validator): validate() + structure rules (TS001/TS002/TS003)"
```

---

### Task 4: Built-in tables + semantic rules (TS004/TS005 errors, TS100/TS101 warnings)

**Files:**
- Create: `packages/thinkscript-validator/src/builtins.ts`
- Create: `packages/thinkscript-validator/src/rules/semantics.ts`
- Modify: `packages/thinkscript-validator/src/validator.ts`
- Test: `packages/thinkscript-validator/test/semantics.test.ts`

**Interfaces:**
- Consumes: `Token` (Task 2), `Diagnostic` (Task 3).
- Produces:
  - `RESERVED`, `BUILTINS`, `FIELDS: Set<string>` from `builtins.ts`.
  - `function checkSemantics(tokens: Token[]): Diagnostic[]` — TS004 (reserved-as-name), TS005 (missing declaration name) as errors; TS100 (unknown function call) and TS101 (declare not at top) as warnings. Method calls (preceded by `.`) are exempt from TS100.

- [ ] **Step 1: Write the failing test `test/semantics.test.ts`**

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- semantics`
Expected: FAIL — TS004/TS005/TS100/TS101 not produced (semantics rule not wired yet).

- [ ] **Step 3: Create `src/builtins.ts`**

```ts
// Reserved words / keywords that cannot be used as identifier names.
export const RESERVED = new Set<string>([
  "def", "plot", "input", "rec", "declare", "script",
  "if", "then", "else", "do", "while", "switch", "case", "default",
  "and", "or", "not", "fold", "with", "from", "to",
  "yes", "no", "plotwidth", "reference",
]);

// Curated, intentionally INCOMPLETE set of known built-in functions.
// Unknown calls are warnings (TS100), never errors — list completeness is not guaranteed.
export const BUILTINS = new Set<string>([
  "Average", "SimpleMovingAvg", "ExpAverage", "MovingAverage", "WMA", "HullMovingAvg",
  "RSI", "MACD", "Stochastic", "StochasticFull", "BollingerBands", "ATR", "TrueRange",
  "Highest", "Lowest", "sum", "fold", "Crosses", "CompoundValue", "Min", "Max",
  "Abs", "AbsValue", "Round", "Floor", "Ceil", "Power", "Sqrt", "Log", "Sign", "IsNaN",
  "HighestAll", "LowestAll", "GetTime", "SecondsFromTime", "SecondsTillTime", "BarNumber",
  "AddLabel", "AddOrder", "Alert", "AddChartBubble", "AddVerticalLine", "AddCloud",
  "vwap", "VWAP",
]);

// Price/data fields treated as known value identifiers (not function calls).
export const FIELDS = new Set<string>([
  "open", "high", "low", "close", "volume", "hl2", "hlc3", "ohlc4",
]);
```

- [ ] **Step 4: Create `src/rules/semantics.ts`**

```ts
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
```

- [ ] **Step 5: Wire `checkSemantics` into `src/validator.ts`**

Replace the contents of `src/validator.ts` with:

```ts
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
```

- [ ] **Step 6: Run the tests to verify everything passes**

Run: `npm test`
Expected: PASS — lexer, structure, and semantics suites all green (no regressions).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(validator): semantic rules (TS004/TS005 errors, TS100/TS101 warnings)"
```

---

### Task 5: Correctness corpus + regression harness (the gate)

**Files:**
- Create: `corpus/thinkscript/valid/sma.tsc`
- Create: `corpus/thinkscript/valid/ema-cross.tsc`
- Create: `corpus/thinkscript/valid/rsi-lower.tsc`
- Create: `corpus/thinkscript/valid/volume-color.tsc`
- Create: `corpus/thinkscript/valid/vwap-plot.tsc`
- Create: `corpus/thinkscript/valid/highest-channel.tsc`
- Create: `corpus/thinkscript/valid/atr-label.tsc`
- Create: `corpus/thinkscript/valid/scanner-cross.tsc`
- Create: `corpus/thinkscript/invalid/unbalanced-paren.tsc`
- Create: `corpus/thinkscript/invalid/mismatched-bracket.tsc`
- Create: `corpus/thinkscript/invalid/curly-brace.tsc`
- Create: `corpus/thinkscript/invalid/unterminated-string.tsc`
- Create: `corpus/thinkscript/invalid/reserved-name.tsc`
- Create: `corpus/thinkscript/invalid/empty-target.tsc`
- Create: `corpus/thinkscript/manifest.json`
- Test: `packages/thinkscript-validator/test/corpus.test.ts`

**Interfaces:**
- Consumes: `validate` from `index.ts` (Task 3/4).
- Produces: the regression gate. `manifest.json` shape:
  `{ valid: string[]; invalid: { file: string; expect: string }[] }` (paths relative to `corpus/thinkscript/`).

- [ ] **Step 1: Create the 8 valid corpus files**

`corpus/thinkscript/valid/sma.tsc`:
```
# Simple moving average study
input length = 20;
plot SMA = Average(close, length);
SMA.SetDefaultColor(Color.CYAN);
```

`corpus/thinkscript/valid/ema-cross.tsc`:
```
input fast = 9;
input slow = 21;
def emaFast = ExpAverage(close, fast);
def emaSlow = ExpAverage(close, slow);
plot CrossUp = Crosses(emaFast, emaSlow, CrossingDirection.ABOVE);
CrossUp.SetPaintingStrategy(PaintingStrategy.BOOLEAN_ARROW_UP);
```

`corpus/thinkscript/valid/rsi-lower.tsc`:
```
declare lower;
input length = 14;
plot RSILine = RSI(length);
plot OverBought = 70;
plot OverSold = 30;
OverBought.SetDefaultColor(Color.RED);
OverSold.SetDefaultColor(Color.GREEN);
```

`corpus/thinkscript/valid/volume-color.tsc`:
```
input length = 20;
def avgVol = Average(volume, length);
plot Vol = volume;
Vol.AssignValueColor(if volume > avgVol then Color.GREEN else Color.GRAY);
Vol.SetPaintingStrategy(PaintingStrategy.HISTOGRAM);
```

`corpus/thinkscript/valid/vwap-plot.tsc`:
```
plot VWAPLine = vwap;
VWAPLine.SetDefaultColor(Color.YELLOW);
```

`corpus/thinkscript/valid/highest-channel.tsc`:
```
input length = 20;
plot Hi = Highest(high, length);
plot Lo = Lowest(low, length);
Hi.SetDefaultColor(Color.GREEN);
Lo.SetDefaultColor(Color.RED);
```

`corpus/thinkscript/valid/atr-label.tsc`:
```
input length = 14;
def a = ATR(length);
AddLabel(yes, "ATR: " + Round(a, 2), Color.WHITE);
```

`corpus/thinkscript/valid/scanner-cross.tsc`:
```
# Scanner: price above a rising 20-period EMA
input length = 20;
def ema = ExpAverage(close, length);
plot scan = close > ema and ema > ema[1];
```

- [ ] **Step 2: Create the 6 invalid corpus files**

`corpus/thinkscript/invalid/unbalanced-paren.tsc`:
```
plot SMA = Average(close, 20;
```

`corpus/thinkscript/invalid/mismatched-bracket.tsc`:
```
plot X = close[1);
```

`corpus/thinkscript/invalid/curly-brace.tsc`:
```
def x = { close };
```

`corpus/thinkscript/invalid/unterminated-string.tsc`:
```
AddLabel(yes, "missing quote);
```

`corpus/thinkscript/invalid/reserved-name.tsc`:
```
def plot = close;
```

`corpus/thinkscript/invalid/empty-target.tsc`:
```
def = close;
```

- [ ] **Step 3: Create `corpus/thinkscript/manifest.json`**

```json
{
  "valid": [
    "valid/sma.tsc",
    "valid/ema-cross.tsc",
    "valid/rsi-lower.tsc",
    "valid/volume-color.tsc",
    "valid/vwap-plot.tsc",
    "valid/highest-channel.tsc",
    "valid/atr-label.tsc",
    "valid/scanner-cross.tsc"
  ],
  "invalid": [
    { "file": "invalid/unbalanced-paren.tsc", "expect": "TS001" },
    { "file": "invalid/mismatched-bracket.tsc", "expect": "TS001" },
    { "file": "invalid/curly-brace.tsc", "expect": "TS002" },
    { "file": "invalid/unterminated-string.tsc", "expect": "TS003" },
    { "file": "invalid/reserved-name.tsc", "expect": "TS004" },
    { "file": "invalid/empty-target.tsc", "expect": "TS005" }
  ]
}
```

- [ ] **Step 4: Write the corpus regression test `test/corpus.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { validate } from "../src/index";

const here = dirname(fileURLToPath(import.meta.url));
const corpusDir = resolve(here, "../../../corpus/thinkscript");

interface Manifest {
  valid: string[];
  invalid: { file: string; expect: string }[];
}

const manifest: Manifest = JSON.parse(
  readFileSync(resolve(corpusDir, "manifest.json"), "utf8"),
);

const read = (rel: string) => readFileSync(resolve(corpusDir, rel), "utf8");

describe("ThinkScript correctness corpus", () => {
  for (const file of manifest.valid) {
    it(`valid: ${file} passes with zero errors`, () => {
      const res = validate(read(file));
      expect(res.errors, JSON.stringify(res.errors)).toEqual([]);
      expect(res.ok).toBe(true);
    });
  }

  for (const { file, expect: code } of manifest.invalid) {
    it(`invalid: ${file} is rejected with ${code}`, () => {
      const res = validate(read(file));
      expect(res.ok).toBe(false);
      expect(res.errors.some((e) => e.code === code)).toBe(true);
    });
  }
});
```

- [ ] **Step 5: Run the corpus test**

Run: `npm test -- corpus`
Expected: PASS — all 8 valid files report zero errors; all 6 invalid files are rejected with the expected code. (Gate: 0 false rejects, 0 false-positive passes.)

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS — lexer + structure + semantics + corpus all green.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "test(validator): correctness corpus + regression gate (8 valid, 6 invalid)"
```

---

### Task 6: Typecheck, build, and package README

**Files:**
- Create: `packages/thinkscript-validator/README.md`
- Modify: `.gitignore` (already ignores `dist/` — verify)

**Interfaces:**
- Consumes: the full package.
- Produces: a clean `tsc` build (`dist/`) and `npm run typecheck` green — proof the package is consumable by later packages (AI layer, web tool).

- [ ] **Step 1: Run the typecheck**

Run: `npm run typecheck`
Expected: PASS — no type errors.

- [ ] **Step 2: Run the build**

Run: `npm run build --workspace @apex/thinkscript-validator`
Expected: emits `packages/thinkscript-validator/dist/index.js` + `index.d.ts` with no errors.

- [ ] **Step 3: Create `packages/thinkscript-validator/README.md`**

````markdown
# @apex/thinkscript-validator

Static validator for ThinkScript. Lexes source and runs deterministic rules,
returning structured diagnostics. This is APEX's correctness gate: generated
ThinkScript must pass `validate()` (no error-severity diagnostics) before it
is shown to a user. (See `docs/02-ARCHITECTURE.md` §8.4.)

## Usage

```ts
import { validate } from "@apex/thinkscript-validator";

const res = validate("plot SMA = Average(close, 20);");
// res.ok === true, res.errors === [], res.warnings === []
```

## Diagnostic codes

| Code  | Severity | Meaning |
|-------|----------|---------|
| TS001 | error    | Unbalanced / mismatched `()` or `[]` |
| TS002 | error    | Curly braces (invalid in ThinkScript) |
| TS003 | error    | Unterminated string literal |
| TS004 | error    | Reserved word used as a declaration name |
| TS005 | error    | Declaration (`def`/`plot`/`input`/`rec`) with no name |
| TS100 | warning  | Unknown function call (built-in list is intentionally incomplete) |
| TS101 | warning  | `declare` not at the top of the script |

`ok === (errors.length === 0)`. Warnings never flip `ok`. The built-in list is
intentionally incomplete, so unknown functions warn rather than error — the
validator never falsely rejects valid code.

## Test / build

```bash
npm test          # vitest (lexer, rules, corpus regression gate)
npm run typecheck
npm run build --workspace @apex/thinkscript-validator
```
````

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs(validator): README + verified tsc build"
```

---

## Self-Review

**Spec coverage** (against Architecture §8.4 / Roadmap §8.1):
- Static syntax validation (balanced structure, valid declarations, reserved-word misuse) → Tasks 3, 4. ✅
- "0 false-positive validated passes" on known-bad set → Task 5 invalid corpus + gate. ✅
- Regression harness for every change → Task 5 `corpus.test.ts`. ✅
- Self-correction loop & model routing → **out of scope here** (next plan: AI generation layer); the validator is the dependency that loop will call. Documented, not a gap.
- "Review before use" labeling → UI concern, next plans. Not this package.

**Placeholder scan:** every code/step block contains complete, runnable content. No TBD/TODO. ✅

**Type consistency:** `Token`/`TokenKind` (Task 2) → consumed unchanged in Tasks 3–4. `Diagnostic`/`Severity`/`ValidationResult` (Task 3) → consumed unchanged in Task 4 and tests. `validate`, `checkStructure`, `checkSemantics` signatures match across producer/consumer blocks. Manifest shape in Task 5 test matches the JSON in Task 5 Step 3. ✅

**Known limitation (by design):** statement-termination (missing `;`) is **not** an error rule — it cannot be detected without a fuller parser and would risk false rejects, violating the gate. Deferred to a future parser upgrade; noted so the next plan's self-correction loop doesn't assume it.

---

## Execution Handoff

Two execution options:

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — execute tasks in this session via executing-plans, batch with checkpoints.
