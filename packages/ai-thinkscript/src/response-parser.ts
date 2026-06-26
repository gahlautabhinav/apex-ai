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
