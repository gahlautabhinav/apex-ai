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
result.producedCode;   // a non-empty code block was returned — check this before trusting validation.ok
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
