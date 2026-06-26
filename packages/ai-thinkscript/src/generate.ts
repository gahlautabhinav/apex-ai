import { validate, ValidationResult } from "@apex/thinkscript-validator";
import { LlmClient, LlmMessage } from "./llm-client";
import { parseResponse, ParsedResponse } from "./response-parser";
import { routeModel } from "./model-router";
import { THINKSCRIPT_GENERATE_SYSTEM } from "./prompts";

export interface GenerateOptions {
  // Total model calls (1 initial + retries). Clamped to >= 1 (non-finite -> 3). Default 3.
  maxAttempts?: number;
  // Override the routed model id.
  model?: string;
}

export interface GenerateResult {
  code: string;
  explanation: string;
  validation: ValidationResult;
  // A non-empty fenced code block was actually returned. Check this BEFORE
  // trusting validation.ok — the validator reports ok:true on prose too, so a
  // refusal/empty reply would otherwise look "valid".
  producedCode: boolean;
  attempts: number;
  reviewRequired: true; // always — generated code is never presented as verified
}

// True when the model actually returned a non-empty fenced code block.
function hasCode(parsed: ParsedResponse): boolean {
  return parsed.hadFence && parsed.code.trim() !== "";
}

// Builds the user turn that feeds validation errors back to the model.
export function correctionPrompt(validation: ValidationResult): string {
  const errs = validation.errors
    .map((e) => `${e.code} (line ${e.line}): ${e.message}`)
    .join("; ");
  return `The script failed static validation with these errors: ${errs}. Return a corrected version as a single fenced \`thinkscript\` block, then a brief explanation of the fix.`;
}

function nextCorrection(parsed: ParsedResponse, validation: ValidationResult): string {
  if (!hasCode(parsed)) {
    return "You did not return a ThinkScript code block. Return the complete script as a single fenced `thinkscript` code block, followed by a brief explanation.";
  }
  return correctionPrompt(validation);
}

export async function generateThinkScript(
  intent: string,
  client: LlmClient,
  options: GenerateOptions = {},
): Promise<GenerateResult> {
  const requested = options.maxAttempts ?? 3;
  const maxAttempts = Number.isFinite(requested) ? Math.max(1, Math.trunc(requested)) : 3;
  const model = options.model ?? routeModel("generate");
  const messages: LlmMessage[] = [{ role: "user", content: intent }];

  let parsed: ParsedResponse = { code: "", explanation: "", hadFence: false };
  let validation: ValidationResult = { ok: false, errors: [], warnings: [] };
  let attempts = 0;

  while (attempts < maxAttempts) {
    const text = await client.complete({
      system: THINKSCRIPT_GENERATE_SYSTEM,
      messages: [...messages], // snapshot: a recording/real client sees the state at call time
      model,
    });
    attempts++;
    parsed = parseResponse(text);
    validation = validate(parsed.code);
    if (validation.ok && hasCode(parsed)) break;

    // Self-correct: keep the reply in context and ask for a fix / a real code block.
    messages.push({ role: "assistant", content: text });
    messages.push({ role: "user", content: nextCorrection(parsed, validation) });
  }

  return {
    code: parsed.code,
    explanation: parsed.explanation,
    validation,
    producedCode: hasCode(parsed),
    attempts,
    reviewRequired: true,
  };
}
