# @apex/benchmark

Measures the ThinkScript generation engine's quality — the Phase-0 exit gate
(≥90% usable). A curated dataset (`data/prompts.json`) of English→ThinkScript
prompts is run through the engine on the Claude Code subscription; each result
is scored and aggregated into a report.

## Run the benchmark (real `claude`, subscription quota)

```bash
npm run bench --workspace @apex/benchmark
```

Spawns one `claude` per prompt (~20s each, plus self-correction retries), so a
full run takes several minutes and uses subscription quota. Writes
`results/latest.md` (summary) and `results/latest.json` (full rows). `results/`
is git-ignored.

## Scoring

Each result is classified:

| status | meaning |
|---|---|
| `usable` | produced a code block, passed the validator, AND contains the expected built-ins |
| `missing_expected` | valid code, but an expected built-in was absent — a **heuristic** miss, review it |
| `invalid` | the validator rejected it (objective) |
| `no_code` | no fenced code block was produced (objective) |

The report shows **usable rate** (the headline) and **valid rate** (produced +
validator-clean, a looser objective bound). The `expect` substrings are a
correctness proxy, not proof — treat `missing_expected` as review signal.

## Harness is offline-testable

`score` / `runBenchmark` / `buildReport` are unit-tested with a `FakeLlmClient`
(no real `claude`). Only `npm run bench` (`src/run.ts`) calls the real CLI.
