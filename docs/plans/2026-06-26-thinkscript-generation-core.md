# ThinkScript Generation Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Project git workflow (controller-managed):** one branch per task → review → merge to `main` → push → next task. The `git commit` steps below commit on the current (task) branch; the controller creates the branch and handles merge/push.

**Goal:** Build the provider-agnostic ThinkScript generation engine — English intent → Claude → parsed code + explanation → validate (via `@apex/thinkscript-validator`) → self-correct on validation failure → return a review-required result. Fully testable against a fake LLM client; no SDK and no network.

**Architecture:** A small pipeline behind an `LlmClient` interface. `generateThinkScript(intent, client, opts)` assembles a feature system prompt + messages, calls the injected client, parses the fenced code block out of the response, runs the validator, and on validation errors feeds the errors back to the model for a bounded number of retries. The real Anthropic-SDK client is a **separate later plan**; here every test injects a `FakeLlmClient` with scripted responses, so the orchestration, routing, parsing, and self-correction loop are deterministic and offline.

**Tech Stack:** Node 24, TypeScript 5.6, Vitest 2, ESM, npm workspaces. New package `@apex/ai-thinkscript` depending on the existing `@apex/thinkscript-validator` workspace package. No external runtime dependencies.

## Global Constraints

- **Runtime:** Node ≥ 24. ESM only (`"type": "module"`). npm workspaces; no yarn/pnpm.
- **Test runner:** Vitest 2.x. Tests in `packages/ai-thinkscript/test/**/*.test.ts` (already matched by the root `vitest.config.ts` glob — do not edit it).
- **TS config:** extend `tsconfig.base.json` (`module: ESNext`, `moduleResolution: bundler`, `strict: true`). Import specifiers carry **no** file extension.
- **Dependencies:** the package's only runtime dependency is the workspace package `@apex/thinkscript-validator`. **No external runtime deps** — the Anthropic SDK belongs to the next plan. Dev deps come from the workspace root (vitest, typescript); do not add any.
- **Model IDs (exact, no date suffix):** complex tasks → `claude-sonnet-4-6`; fast tasks → `claude-haiku-4-5`. These are config strings only (no API calls in this plan).
- **Non-advisory guardrail (regulatory):** the generation system prompt MUST instruct the model to never give financial advice, buy/sell signals, or price predictions. (PRD §16.)
- **Review-required labeling:** every generation result carries `reviewRequired: true`. Generated code is never presented as verified — only review-ready. (Architecture §8.4.)
- **Never throw on bad model output:** if generation can't produce valid code within the attempt budget, return the best-effort result with `validation.ok === false` — callers decide. The loop is bounded (default 3 total model calls).
- **Provider-agnostic:** depend on the `LlmClient` interface, never on a concrete SDK.

---

### Task 1: Package scaffold + LlmClient interface + FakeLlmClient

**Files:**
- Create: `packages/ai-thinkscript/package.json`
- Create: `packages/ai-thinkscript/tsconfig.json`
- Create: `packages/ai-thinkscript/src/llm-client.ts`
- Create: `packages/ai-thinkscript/src/fake-llm-client.ts`
- Test: `packages/ai-thinkscript/test/fake-llm-client.test.ts`

**Interfaces:**
- Consumes: the workspace root (vitest harness) and `@apex/thinkscript-validator` (declared as a dependency now; first imported in Task 4).
- Produces:
  - `interface LlmMessage { role: "user" | "assistant"; content: string }`
  - `interface LlmRequest { system: string; messages: LlmMessage[]; model: string; maxTokens?: number }`
  - `interface LlmClient { complete(req: LlmRequest): Promise<string> }`
  - `class FakeLlmClient implements LlmClient` — constructed with a non-empty `string[]` of scripted responses; returns them in order, repeating the last once exhausted; records every request in a public `calls: LlmRequest[]`.

- [ ] **Step 1: Create `packages/ai-thinkscript/package.json`**

```json
{
  "name": "@apex/ai-thinkscript",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "import": "./src/index.ts"
    }
  },
  "dependencies": {
    "@apex/thinkscript-validator": "*"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json"
  }
}
```

- [ ] **Step 2: Create `packages/ai-thinkscript/tsconfig.json`**

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

- [ ] **Step 3: Install so the workspace links `@apex/thinkscript-validator`**

Run (from repo root `D:\Stock-Project\apex-stock`): `npm install`
Expected: completes; `node_modules/@apex/thinkscript-validator` is a symlink to `packages/thinkscript-validator`.

- [ ] **Step 4: Write the failing test `test/fake-llm-client.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { FakeLlmClient } from "../src/fake-llm-client";
import type { LlmRequest } from "../src/llm-client";

const req = (content: string): LlmRequest => ({
  system: "sys",
  messages: [{ role: "user", content }],
  model: "test-model",
});

describe("FakeLlmClient", () => {
  it("returns scripted responses in order", async () => {
    const c = new FakeLlmClient(["a", "b"]);
    expect(await c.complete(req("1"))).toBe("a");
    expect(await c.complete(req("2"))).toBe("b");
  });

  it("repeats the last response once exhausted", async () => {
    const c = new FakeLlmClient(["only"]);
    expect(await c.complete(req("1"))).toBe("only");
    expect(await c.complete(req("2"))).toBe("only");
  });

  it("records every request in calls", async () => {
    const c = new FakeLlmClient(["x"]);
    await c.complete(req("first"));
    await c.complete(req("second"));
    expect(c.calls.length).toBe(2);
    expect(c.calls[0].messages[0].content).toBe("first");
    expect(c.calls[1].messages[0].content).toBe("second");
  });

  it("throws if constructed with no responses", () => {
    expect(() => new FakeLlmClient([])).toThrow();
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `npm test -- fake-llm-client`
Expected: FAIL — cannot resolve `../src/fake-llm-client`.

- [ ] **Step 6: Create `src/llm-client.ts`**

```ts
export interface LlmMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LlmRequest {
  system: string;
  messages: LlmMessage[];
  model: string;
  maxTokens?: number;
}

export interface LlmClient {
  complete(req: LlmRequest): Promise<string>;
}
```

- [ ] **Step 7: Create `src/fake-llm-client.ts`**

```ts
import { LlmClient, LlmRequest } from "./llm-client";

// Testing/dev double for LlmClient. Returns scripted responses in order and
// repeats the last one once exhausted, so a self-correction loop that keeps
// failing terminates on a stable response. Records every request in `calls`.
export class FakeLlmClient implements LlmClient {
  readonly calls: LlmRequest[] = [];
  private index = 0;

  constructor(private readonly responses: string[]) {
    if (responses.length === 0) {
      throw new Error("FakeLlmClient requires at least one response");
    }
  }

  async complete(req: LlmRequest): Promise<string> {
    this.calls.push(req);
    const i = Math.min(this.index, this.responses.length - 1);
    this.index++;
    return this.responses[i];
  }
}
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npm test -- fake-llm-client`
Expected: PASS — all 4 cases green.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(ai): scaffold @apex/ai-thinkscript + LlmClient interface + FakeLlmClient

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Model router

**Files:**
- Create: `packages/ai-thinkscript/src/model-router.ts`
- Test: `packages/ai-thinkscript/test/model-router.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type TaskClass = "generate" | "explain" | "debug" | "refactor" | "refine"`
  - `function routeModel(task: TaskClass): string` — maps complex tasks (generate/debug/refactor/refine) → `"claude-sonnet-4-6"` and fast tasks (explain) → `"claude-haiku-4-5"`.

- [ ] **Step 1: Write the failing test `test/model-router.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { routeModel, type TaskClass } from "../src/model-router";

describe("routeModel", () => {
  it("routes generation to the complex model", () => {
    expect(routeModel("generate")).toBe("claude-sonnet-4-6");
  });

  it("routes debug/refactor/refine to the complex model", () => {
    expect(routeModel("debug")).toBe("claude-sonnet-4-6");
    expect(routeModel("refactor")).toBe("claude-sonnet-4-6");
    expect(routeModel("refine")).toBe("claude-sonnet-4-6");
  });

  it("routes explanation to the fast model", () => {
    expect(routeModel("explain")).toBe("claude-haiku-4-5");
  });

  it("maps every TaskClass to a known model id", () => {
    const all: TaskClass[] = ["generate", "explain", "debug", "refactor", "refine"];
    const known = new Set(["claude-sonnet-4-6", "claude-haiku-4-5"]);
    for (const t of all) {
      expect(known.has(routeModel(t))).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- model-router`
Expected: FAIL — cannot resolve `../src/model-router`.

- [ ] **Step 3: Create `src/model-router.ts`**

```ts
export type TaskClass = "generate" | "explain" | "debug" | "refactor" | "refine";

// Exact model ids — no date suffixes. Complex reasoning/codegen -> Sonnet;
// fast/cheap completions -> Haiku. Routing is the only place model ids live.
const COMPLEX_MODEL = "claude-sonnet-4-6";
const FAST_MODEL = "claude-haiku-4-5";

const ROUTING: Record<TaskClass, string> = {
  generate: COMPLEX_MODEL,
  debug: COMPLEX_MODEL,
  refactor: COMPLEX_MODEL,
  refine: COMPLEX_MODEL,
  explain: FAST_MODEL,
};

export function routeModel(task: TaskClass): string {
  return ROUTING[task];
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- model-router`
Expected: PASS — all 4 cases green.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ai): model router (task class -> model id)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Response parser

**Files:**
- Create: `packages/ai-thinkscript/src/response-parser.ts`
- Test: `packages/ai-thinkscript/test/response-parser.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface ParsedResponse { code: string; explanation: string }`
  - `function parseResponse(text: string): ParsedResponse` — extracts the FIRST fenced code block (any language tag) as `code` (trimmed, fence + tag line stripped); the text outside the block (before + after, concatenated) is `explanation` (trimmed). If there is no fenced block, `code` is the whole text trimmed and `explanation` is `""`.

- [ ] **Step 1: Write the failing test `test/response-parser.test.ts`**

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- response-parser`
Expected: FAIL — cannot resolve `../src/response-parser`.

- [ ] **Step 3: Create `src/response-parser.ts`**

```ts
export interface ParsedResponse {
  code: string;
  explanation: string;
}

// First fenced block: ``` optionally followed by a language tag on the same
// line, then the body (lazy) up to the closing ```.
const FENCE = /```[^\n]*\n([\s\S]*?)```/;

export function parseResponse(text: string): ParsedResponse {
  const match = text.match(FENCE);
  if (!match || match.index === undefined) {
    return { code: text.trim(), explanation: "" };
  }
  const code = match[1].trim();
  const before = text.slice(0, match.index);
  const after = text.slice(match.index + match[0].length);
  const explanation = (before + after).trim();
  return { code, explanation };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- response-parser`
Expected: PASS — all 4 cases green.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ai): response parser (extract fenced code + explanation)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Generation orchestrator + self-correction loop + prompts + barrel

**Files:**
- Create: `packages/ai-thinkscript/src/prompts.ts`
- Create: `packages/ai-thinkscript/src/generate.ts`
- Create: `packages/ai-thinkscript/src/index.ts`
- Test: `packages/ai-thinkscript/test/prompts.test.ts`
- Test: `packages/ai-thinkscript/test/generate.test.ts`

**Interfaces:**
- Consumes: `validate`, `ValidationResult` from `@apex/thinkscript-validator`; `LlmClient`, `LlmMessage` (Task 1); `parseResponse` (Task 3); `routeModel` (Task 2).
- Produces:
  - `const THINKSCRIPT_GENERATE_SYSTEM: string`, `const THINKSCRIPT_EXPLAIN_SYSTEM: string`, `const THINKSCRIPT_DEBUG_SYSTEM: string`
  - `interface GenerateOptions { maxAttempts?: number; model?: string }`
  - `interface GenerateResult { code: string; explanation: string; validation: ValidationResult; attempts: number; reviewRequired: true }`
  - `function correctionPrompt(validation: ValidationResult): string`
  - `function generateThinkScript(intent: string, client: LlmClient, options?: GenerateOptions): Promise<GenerateResult>`
  - `src/index.ts` re-exports the public surface of all four source files.

- [ ] **Step 1: Write the failing prompts test `test/prompts.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { THINKSCRIPT_GENERATE_SYSTEM } from "../src/prompts";

describe("generation system prompt", () => {
  it("carries the non-advisory guardrail", () => {
    expect(THINKSCRIPT_GENERATE_SYSTEM.toLowerCase()).toContain("never give financial advice");
  });

  it("instructs a single fenced thinkscript block", () => {
    expect(THINKSCRIPT_GENERATE_SYSTEM).toContain("thinkscript");
  });

  it("states that generated code must be reviewed before use", () => {
    expect(THINKSCRIPT_GENERATE_SYSTEM.toLowerCase()).toContain("review");
  });
});
```

- [ ] **Step 2: Write the failing generate test `test/generate.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { generateThinkScript, correctionPrompt } from "../src/generate";
import { FakeLlmClient } from "../src/fake-llm-client";
import { validate } from "@apex/thinkscript-validator";

const block = (code: string, note = "explanation") =>
  "```thinkscript\n" + code + "\n```\n\n" + note;

const GOOD = block("plot SMA = Average(close, 20);");
const BROKEN = block("plot SMA = Average(close, 20;"); // TS001 unbalanced paren

describe("generateThinkScript", () => {
  it("returns valid code on the first attempt", async () => {
    const client = new FakeLlmClient([GOOD]);
    const r = await generateThinkScript("20 period sma", client);
    expect(r.attempts).toBe(1);
    expect(r.validation.ok).toBe(true);
    expect(r.code).toBe("plot SMA = Average(close, 20);");
    expect(r.explanation).toContain("explanation");
    expect(r.reviewRequired).toBe(true);
    expect(client.calls.length).toBe(1);
  });

  it("uses the routed complex model by default", async () => {
    const client = new FakeLlmClient([GOOD]);
    await generateThinkScript("x", client);
    expect(client.calls[0].model).toBe("claude-sonnet-4-6");
  });

  it("sends the non-advisory system prompt", async () => {
    const client = new FakeLlmClient([GOOD]);
    await generateThinkScript("x", client);
    expect(client.calls[0].system.toLowerCase()).toContain("never give financial advice");
  });

  it("self-corrects: feeds validation errors back and recovers", async () => {
    const client = new FakeLlmClient([BROKEN, GOOD]);
    const r = await generateThinkScript("x", client);
    expect(r.attempts).toBe(2);
    expect(r.validation.ok).toBe(true);
    expect(r.code).toBe("plot SMA = Average(close, 20);");
    // second call carries the original intent, the broken assistant reply, and a correction
    expect(client.calls[1].messages.length).toBe(3);
    expect(client.calls[1].messages[2].content).toContain("TS001");
  });

  it("returns best-effort with validation.ok=false when attempts are exhausted", async () => {
    const client = new FakeLlmClient([BROKEN]); // always broken
    const r = await generateThinkScript("x", client, { maxAttempts: 2 });
    expect(r.attempts).toBe(2);
    expect(r.validation.ok).toBe(false);
    expect(r.reviewRequired).toBe(true);
    expect(client.calls.length).toBe(2);
  });

  it("clamps maxAttempts to at least 1", async () => {
    const client = new FakeLlmClient([GOOD]);
    const r = await generateThinkScript("x", client, { maxAttempts: 0 });
    expect(r.attempts).toBe(1);
    expect(client.calls.length).toBe(1);
  });
});

describe("correctionPrompt", () => {
  it("names the failing diagnostic codes", () => {
    const v = validate("plot SMA = Average(close, 20;");
    expect(v.ok).toBe(false);
    expect(correctionPrompt(v)).toContain("TS001");
  });
});
```

- [ ] **Step 3: Run both tests to verify they fail**

Run: `npm test -- prompts generate`
Expected: FAIL — cannot resolve `../src/prompts` / `../src/generate`.

- [ ] **Step 4: Create `src/prompts.ts`**

```ts
// Feature system prompts. Each encodes the non-advisory guardrail (PRD §16),
// the always-explain rule, density, and the output contract. These are the
// versioned prompt registry for the ThinkScript surfaces.

export const THINKSCRIPT_GENERATE_SYSTEM = `You are an expert ThinkScript engineer for the thinkorswim platform.

Output contract:
- Output exactly ONE fenced code block tagged \`thinkscript\` containing the complete script.
- After the block, add a brief plain-English explanation: what it does, the key assumption, and one risk to check. Keep it dense — a few lines, not paragraphs.

Rules:
- ThinkScript only — never Pine Script, Python, or pseudocode. Use ThinkScript syntax: def/plot/input/rec declarations, # comments, [n] historical offset, and built-ins such as Average, ExpAverage, RSI, Crosses.
- Be correct and conservative. If the request is ambiguous, choose the simplest valid interpretation and state that assumption in the explanation.
- NEVER give financial advice, buy/sell signals, or price predictions. You produce indicator and scanner code and analysis only.

The generated code is NOT verified. The user must review it before use.`;

export const THINKSCRIPT_EXPLAIN_SYSTEM = `You are an expert ThinkScript engineer for the thinkorswim platform.

Given a ThinkScript snippet, explain in plain English what it does: the inputs, the calculation, what is plotted, and any assumptions. Be dense and precise. Group the explanation by logical sections rather than line by line.

NEVER give financial advice, buy/sell signals, or price predictions — explain the code only.`;

export const THINKSCRIPT_DEBUG_SYSTEM = `You are an expert ThinkScript engineer for the thinkorswim platform.

Given a ThinkScript snippet (and optionally an error message), identify the fault, explain its cause briefly, and return a corrected version.

Output contract:
- Output exactly ONE fenced code block tagged \`thinkscript\` with the corrected script.
- After the block, briefly explain the cause of the error and what you changed.

Rules:
- ThinkScript only. Preserve the original intent; make the smallest correct change.
- NEVER give financial advice, buy/sell signals, or price predictions.

The corrected code is NOT verified. The user must review it before use.`;
```

- [ ] **Step 5: Create `src/generate.ts`**

```ts
import { validate, ValidationResult } from "@apex/thinkscript-validator";
import { LlmClient, LlmMessage } from "./llm-client";
import { parseResponse } from "./response-parser";
import { routeModel } from "./model-router";
import { THINKSCRIPT_GENERATE_SYSTEM } from "./prompts";

export interface GenerateOptions {
  // Total model calls (1 initial + retries). Clamped to >= 1. Default 3.
  maxAttempts?: number;
  // Override the routed model id.
  model?: string;
}

export interface GenerateResult {
  code: string;
  explanation: string;
  validation: ValidationResult;
  attempts: number;
  reviewRequired: true; // always — generated code is never presented as verified
}

// Builds the user turn that feeds validation errors back to the model.
export function correctionPrompt(validation: ValidationResult): string {
  const errs = validation.errors
    .map((e) => `${e.code} (line ${e.line}): ${e.message}`)
    .join("; ");
  return `The script failed static validation with these errors: ${errs}. Return a corrected version as a single fenced \`thinkscript\` block, then a brief explanation of the fix.`;
}

export async function generateThinkScript(
  intent: string,
  client: LlmClient,
  options: GenerateOptions = {},
): Promise<GenerateResult> {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  const model = options.model ?? routeModel("generate");
  const messages: LlmMessage[] = [{ role: "user", content: intent }];

  let parsed = { code: "", explanation: "" };
  let validation = validate("");
  let attempts = 0;

  while (attempts < maxAttempts) {
    const text = await client.complete({
      system: THINKSCRIPT_GENERATE_SYSTEM,
      messages,
      model,
    });
    attempts++;
    parsed = parseResponse(text);
    validation = validate(parsed.code);
    if (validation.ok) break;

    // Self-correct: keep the broken reply in context and ask for a fix.
    messages.push({ role: "assistant", content: text });
    messages.push({ role: "user", content: correctionPrompt(validation) });
  }

  return {
    code: parsed.code,
    explanation: parsed.explanation,
    validation,
    attempts,
    reviewRequired: true,
  };
}
```

- [ ] **Step 6: Create `src/index.ts`**

```ts
export type { LlmClient, LlmMessage, LlmRequest } from "./llm-client";
export { FakeLlmClient } from "./fake-llm-client";
export type { TaskClass } from "./model-router";
export { routeModel } from "./model-router";
export type { ParsedResponse } from "./response-parser";
export { parseResponse } from "./response-parser";
export {
  THINKSCRIPT_GENERATE_SYSTEM,
  THINKSCRIPT_EXPLAIN_SYSTEM,
  THINKSCRIPT_DEBUG_SYSTEM,
} from "./prompts";
export { generateThinkScript, correctionPrompt } from "./generate";
export type { GenerateOptions, GenerateResult } from "./generate";
```

- [ ] **Step 7: Run the full suite to verify everything passes**

Run: `npm test`
Expected: PASS — ai-thinkscript suites (fake-llm-client, model-router, response-parser, prompts, generate) all green, and the existing thinkscript-validator suites still green (no regressions).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(ai): generateThinkScript with validator-backed self-correction loop + prompts

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Typecheck, build, and package README

**Files:**
- Create: `packages/ai-thinkscript/README.md`

**Interfaces:**
- Consumes: the full package.
- Produces: a clean `tsc` typecheck/build (proof the package — including the cross-package `@apex/thinkscript-validator` import — is consumable) and a README documenting the public API.

- [ ] **Step 1: Run the typecheck**

Run: `npx tsc -p packages/ai-thinkscript/tsconfig.json --noEmit`
Expected: PASS — no type errors (the `@apex/thinkscript-validator` import resolves via the workspace symlink + its source exports).

- [ ] **Step 2: Run the build**

Run: `npm run build --workspace @apex/ai-thinkscript`
Expected: emits `packages/ai-thinkscript/dist/index.js` + `dist/index.d.ts` with no errors.

- [ ] **Step 3: Create `packages/ai-thinkscript/README.md`**

````markdown
# @apex/ai-thinkscript

Provider-agnostic ThinkScript generation engine. English intent → Claude →
parsed code + explanation → validated by `@apex/thinkscript-validator` →
self-corrected on validation failure. The LLM is injected via the `LlmClient`
interface, so the engine is fully testable offline (see `FakeLlmClient`). The
concrete Anthropic-SDK client is a separate package/plan.

## Usage

```ts
import { generateThinkScript, type LlmClient } from "@apex/ai-thinkscript";

declare const client: LlmClient; // a real Anthropic-backed client, or FakeLlmClient in tests
const result = await generateThinkScript("20 period simple moving average", client);

result.code;           // generated ThinkScript
result.explanation;    // plain-English explanation
result.validation.ok;  // passed static validation (no error-severity diagnostics)
result.attempts;       // model calls made (1 + self-correction retries)
result.reviewRequired; // always true — never present generated code as verified
```

## Pieces

| Export | Purpose |
|---|---|
| `LlmClient` / `LlmRequest` / `LlmMessage` | The provider interface the engine depends on |
| `FakeLlmClient` | Scripted test/dev double — returns canned responses in order |
| `routeModel(task)` | Task class → model id (`claude-sonnet-4-6` / `claude-haiku-4-5`) |
| `parseResponse(text)` | Extract the fenced code block + surrounding explanation |
| `THINKSCRIPT_GENERATE_SYSTEM` etc. | Versioned feature system prompts (carry the non-advisory guardrail) |
| `generateThinkScript(intent, client, opts?)` | The orchestrator with the validator-backed self-correction loop |

## Self-correction loop

`generateThinkScript` calls the client, parses the code, and runs `validate()`.
If validation fails, it appends the model's reply and a `correctionPrompt`
(naming the diagnostic codes) and retries, up to `maxAttempts` (default 3, min
1). If the budget is exhausted it returns the best-effort result with
`validation.ok === false` — it never throws on bad model output.

## Test / build

```bash
npm test            # vitest (fake client, router, parser, prompts, generate loop)
npm run build --workspace @apex/ai-thinkscript
```
````

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs(ai): README + verified tsc build for @apex/ai-thinkscript

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage** (against Architecture §8.1–8.4, PRD FR-TS-1/5/10):
- AI pipeline (context → prompt → model → validation/guardrails → response) → Tasks 2/3/4. ✅
- Model routing (config, not hardcoded) → Task 2. ✅
- ThinkScript validation gate + self-correction loop → Task 4 (consumes the validator). ✅
- Non-advisory guardrail at the prompt layer → Task 4 prompts + asserted in tests. ✅
- Review-required labeling → `reviewRequired: true` on every result. ✅
- Provider-agnostic (no SDK) → `LlmClient` interface; real client is the next plan. Documented, not a gap.
- Streaming, prompt caching, `ai_send_log` transparency → **out of scope here**; they belong to the AnthropicClient + app-integration plan. Noted, not gaps.
- Context builder (summaries, few-shot corpus selection) → deferred to a later plan; the generate path here passes the raw intent. Noted.

**Placeholder scan:** every step has complete, runnable content. No TBD/TODO. ✅

**Type consistency:** `LlmMessage`/`LlmRequest`/`LlmClient` (Task 1) consumed unchanged in Task 4. `TaskClass`/`routeModel` (Task 2) and `ParsedResponse`/`parseResponse` (Task 3) consumed in Task 4. `GenerateResult.validation` is the validator's `ValidationResult`; `correctionPrompt` reads `validation.errors[].{code,line,message}` — matches the validator's `Diagnostic` shape. `generateThinkScript` default model is `routeModel("generate")` → `"claude-sonnet-4-6"`, asserted in the test. ✅

**Cross-package resolution note:** the `@apex/thinkscript-validator` import resolves through the npm-workspace symlink to that package's source `exports` (`./src/index.ts`), under Vitest/tsc bundler resolution. Task 1 Step 3 runs `npm install` so the symlink exists before any test runs.

---

## Execution Handoff

Two execution options:

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, merge each to `main` and push before the next (project workflow).
2. **Inline Execution** — execute tasks in this session via executing-plans, batch with checkpoints.
