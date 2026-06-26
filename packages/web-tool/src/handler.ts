import { generateThinkScript, type LlmClient } from "@apex/ai-thinkscript";

export interface HandlerResult {
  status: number;
  body: unknown;
}

const MAX_INTENT = 2000;

export async function handleGenerate(rawBody: string, client: LlmClient): Promise<HandlerResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return { status: 400, body: { error: "request body must be JSON" } };
  }
  const intent = (parsed as { intent?: unknown }).intent;
  if (typeof intent !== "string" || intent.trim() === "") {
    return { status: 400, body: { error: "field 'intent' (a non-empty string) is required" } };
  }
  if (intent.length > MAX_INTENT) {
    return { status: 400, body: { error: `intent too long (max ${MAX_INTENT} characters)` } };
  }

  const r = await generateThinkScript(intent, client);
  return {
    status: 200,
    body: {
      code: r.code,
      explanation: r.explanation,
      producedCode: r.producedCode,
      ok: r.validation.ok,
      attempts: r.attempts,
      reviewRequired: r.reviewRequired,
      errors: r.validation.errors,
    },
  };
}
