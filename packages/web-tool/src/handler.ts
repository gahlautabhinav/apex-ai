import {
  generateThinkScript,
  debugThinkScript,
  refactorThinkScript,
  generateScanner,
  explainThinkScript,
  type LlmClient,
} from "@apex/ai-thinkscript";

export interface HandlerResult {
  status: number;
  body: unknown;
}

const MAX_INPUT = 8000;
const MODES = ["generate", "explain", "debug", "refactor", "scan"] as const;
type Mode = (typeof MODES)[number];

export async function handleGenerate(rawBody: string, client: LlmClient): Promise<HandlerResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return { status: 400, body: { error: "request body must be JSON" } };
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { status: 400, body: { error: "request body must be a JSON object" } };
  }
  const obj = parsed as Record<string, unknown>;

  // Accept `input` (current) or `intent` (legacy generate).
  const input =
    typeof obj.input === "string" ? obj.input : typeof obj.intent === "string" ? obj.intent : undefined;
  if (typeof input !== "string" || input.trim() === "") {
    return { status: 400, body: { error: "field 'input' (a non-empty string) is required" } };
  }
  if (input.length > MAX_INPUT) {
    return { status: 400, body: { error: `input too long (max ${MAX_INPUT} characters)` } };
  }

  const mode: Mode = (MODES as readonly string[]).includes(obj.mode as string)
    ? (obj.mode as Mode)
    : "generate";
  const error = typeof obj.error === "string" ? obj.error : undefined;
  const goal = typeof obj.goal === "string" ? obj.goal : undefined;

  if (mode === "explain") {
    const r = await explainThinkScript(input, client);
    return {
      status: 200,
      body: {
        mode,
        code: "",
        explanation: r.explanation,
        producedCode: false,
        ok: true,
        attempts: 1,
        reviewRequired: true,
        errors: [],
      },
    };
  }

  const r =
    mode === "debug"
      ? await debugThinkScript(input, client, { error })
      : mode === "refactor"
        ? await refactorThinkScript(input, client, { goal })
        : mode === "scan"
          ? await generateScanner(input, client)
          : await generateThinkScript(input, client);

  return {
    status: 200,
    body: {
      mode,
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
