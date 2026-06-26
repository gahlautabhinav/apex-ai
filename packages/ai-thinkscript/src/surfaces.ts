import { LlmClient } from "./llm-client";
import {
  runGenerationLoop,
  clampAttempts,
  type GenerateResult,
  type GenerateOptions,
} from "./generate";
import { routeModel } from "./model-router";
import {
  THINKSCRIPT_DEBUG_SYSTEM,
  THINKSCRIPT_REFACTOR_SYSTEM,
  THINKSCRIPT_SCANNER_SYSTEM,
  THINKSCRIPT_EXPLAIN_SYSTEM,
} from "./prompts";

export interface DebugOptions extends GenerateOptions {
  // The error message thinkorswim reported, if any.
  error?: string;
}

export async function debugThinkScript(
  code: string,
  client: LlmClient,
  options: DebugOptions = {},
): Promise<GenerateResult> {
  const user = options.error
    ? `Fix this ThinkScript. The platform reported: ${options.error}\n\n${code}`
    : `Fix this ThinkScript:\n\n${code}`;
  return runGenerationLoop(
    THINKSCRIPT_DEBUG_SYSTEM,
    user,
    client,
    options.model ?? routeModel("debug"),
    clampAttempts(options.maxAttempts),
  );
}

export interface RefactorOptions extends GenerateOptions {
  // What to optimize for, if any (else: clarity + performance).
  goal?: string;
}

export async function refactorThinkScript(
  code: string,
  client: LlmClient,
  options: RefactorOptions = {},
): Promise<GenerateResult> {
  const user = options.goal
    ? `Refactor this ThinkScript to ${options.goal}, preserving its behavior:\n\n${code}`
    : `Refactor this ThinkScript for clarity and performance, preserving its behavior:\n\n${code}`;
  return runGenerationLoop(
    THINKSCRIPT_REFACTOR_SYSTEM,
    user,
    client,
    options.model ?? routeModel("refactor"),
    clampAttempts(options.maxAttempts),
  );
}

export async function generateScanner(
  setup: string,
  client: LlmClient,
  options: GenerateOptions = {},
): Promise<GenerateResult> {
  return runGenerationLoop(
    THINKSCRIPT_SCANNER_SYSTEM,
    setup,
    client,
    options.model ?? routeModel("scanner"),
    clampAttempts(options.maxAttempts),
  );
}

export interface ExplainResult {
  explanation: string;
}

export interface ExplainOptions {
  model?: string;
}

// One-shot analysis: explain what a ThinkScript snippet does. No code output,
// no validation loop — just the model's prose.
export async function explainThinkScript(
  code: string,
  client: LlmClient,
  options: ExplainOptions = {},
): Promise<ExplainResult> {
  const text = await client.complete({
    system: THINKSCRIPT_EXPLAIN_SYSTEM,
    messages: [{ role: "user", content: code }],
    model: options.model ?? routeModel("explain"),
  });
  return { explanation: text.trim() };
}
