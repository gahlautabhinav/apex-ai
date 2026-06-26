# @apex/claude-client

`ClaudeCliClient` — an `LlmClient` (from `@apex/ai-thinkscript`) backed by the
local **Claude Code CLI** (`claude -p`). Generation runs on the user's Claude
Code subscription, so APEX needs **no Anthropic API key and no per-token
billing**. Only Node built-ins; the `claude` binary must be installed and
logged in.

## Usage

```ts
import { generateThinkScript } from "@apex/ai-thinkscript";
import { ClaudeCliClient } from "@apex/claude-client";

const client = new ClaudeCliClient();           // spawns the real `claude`
const r = await generateThinkScript("a 20 period SMA study", client);
```

## How it works

`complete(req)` runs:

```
claude -p --system-prompt <system> --model <alias> --output-format json
```

with the flattened conversation piped to stdin, then returns the JSON `result`.
Model ids map to CLI aliases (`claude-sonnet-4-6` → `sonnet`,
`claude-haiku-4-5` → `haiku`). The subprocess inherits the environment, so the
existing Claude Code login is used — do **not** set `ANTHROPIC_API_KEY` (it
would bill that key instead of the subscription).

## Testing

The subprocess goes through an injectable `CommandRunner`, so unit tests run
offline against a fake runner (no real CLI, no quota):

```ts
new ClaudeCliClient({ run: async (args, stdin) => ({ stdout, stderr: "", exitCode: 0 }) });
```

A live end-to-end test is gated behind `APEX_LIVE`:

```bash
APEX_LIVE=1 npm test -- claude-cli-client.live   # real claude, real subscription
```

## Limitations / follow-ups

- Multi-turn is flattened into one prompt (v1). Upgrade to `--input-format stream-json` if turn fidelity matters.
- `--model` aliases resolve to the *latest* of each family, which may drift from the exact APEX model id.
- Haiku availability depends on the subscription tier; if `haiku` is unavailable, fall back to `sonnet`.
- **Licensing:** using a personal subscription for your own use is fine; bundling it into a product sold to others is not — ship "bring your own Claude Code" so each user authenticates their own CLI.
- **Windows install:** requires the native Claude Code installer (so `claude` is an executable on PATH). An npm-global install creates `claude.cmd`, which this no-shell spawn cannot launch — point `command:` at the real binary or use the native installer.
- Each `complete()` call spawns a fresh `claude` (~20s) and times out at 120s; the self-correction loop can make up to 3 such calls. A web/UI consumer should use async/progress UX.

## Build

```bash
npm run build --workspace @apex/claude-client
```
