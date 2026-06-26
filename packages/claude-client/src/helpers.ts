import { LlmMessage } from "@apex/ai-thinkscript";

// Flatten a multi-turn conversation into a single prompt for `claude -p`,
// which takes one prompt rather than a structured message list.
export function flattenMessages(messages: LlmMessage[]): string {
  return messages
    .map((m) => `${m.role === "assistant" ? "Assistant" : "User"}: ${m.content}`)
    .join("\n\n");
}

// Map APEX model ids to the `claude --model` aliases (which resolve to the
// latest of each family). Unknown ids pass through unchanged.
const ALIASES: Record<string, string> = {
  "claude-sonnet-4-6": "sonnet",
  "claude-haiku-4-5": "haiku",
};

export function mapModel(id: string): string {
  return ALIASES[id] ?? id;
}

// Parse the `claude -p --output-format json` output and return the result text.
// Throws on any failure — a CLI failure is infrastructure, not model output.
export function extractResult(stdout: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    throw new Error(`claude CLI returned non-JSON output: ${stdout.slice(0, 200)}`);
  }
  const obj = parsed as Record<string, unknown>;
  if (obj.is_error === true) {
    const msg = typeof obj.result === "string" ? obj.result : JSON.stringify(obj);
    throw new Error(`claude CLI reported an error: ${msg}`);
  }
  if (typeof obj.result !== "string") {
    throw new Error('claude CLI JSON missing string "result" field');
  }
  return obj.result;
}
