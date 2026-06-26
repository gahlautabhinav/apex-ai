# @apex/web-tool

The free, anonymous ThinkScript generator — the public wedge. A small Node
`http` server: GET `/` serves a dark single-page UI; POST `/api/generate`
runs `generateThinkScript` over `ClaudeCliClient`, so generation uses the
local Claude Code subscription (no API key). Per-IP rate limited, stateless.

## Run (local)

```bash
npm run start --workspace @apex/web-tool      # http://localhost:4317
# PORT=8080 npm run start --workspace @apex/web-tool
```

Requires the `claude` CLI installed and logged in (native installer). Do not
set `ANTHROPIC_API_KEY` (it would bill that key instead of the subscription).

## API

`POST /api/generate` `{ "intent": "..." }` →
`{ code, explanation, producedCode, ok, attempts, reviewRequired, errors }`.
Always shows "review before use"; `producedCode`/`ok` gate the status so code
is never presented as verified. 400 on bad/missing/over-long intent; 429 when
rate limited; 502 if generation fails.

## Architecture

`createApp({ client, limiter, html })` is dependency-injected, so the whole
server is tested offline with a `FakeLlmClient` (no `claude`, no quota — see
`test/app.test.ts`). `src/server.ts` wires the real `ClaudeCliClient` and listens.

## Scaling note (launch decision, not now)

This runs locally backed by **one** Max subscription — fine for development and
demos. A *public* deployment serving many users would exceed subscription rate
limits and isn't what a personal plan is for: at launch, back the public tool
with a dedicated API key + abuse protection, or gate it behind "bring your own
Claude". The rate limiter here is the first guard, not the whole answer.

- **Per-request fan-out:** each allowed POST can spawn `claude` up to 3 times (the self-correction loop retries invalid output), so "10/min/IP" is up to ~30 `claude` spawns/min/IP worst-case.
- **No global cap:** there is no global concurrency/in-flight limit — N distinct IPs can spawn N×3 concurrent `claude` subprocesses. A public deployment needs a global semaphore (503 past a ceiling).
- **Limiter is in-memory:** the per-IP map clears on restart and keys on the socket address (so it collapses behind a reverse proxy). Use a shared/durable limiter + trusted client-IP source for real public exposure.

## Build

```bash
npm run build --workspace @apex/web-tool
```
