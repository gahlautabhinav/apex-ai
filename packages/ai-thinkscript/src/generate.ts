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
