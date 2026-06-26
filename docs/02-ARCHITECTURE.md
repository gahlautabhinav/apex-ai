# Project APEX — Technical Architecture

**Document type:** Architecture & technical specification
**Companion to:** [`01-PRD.md`](01-PRD.md) (product), [`03-ROADMAP.md`](03-ROADMAP.md) (delivery & testing)
**Status:** Draft v1.0
**Last updated:** 2026-06-26

> This document is the source of truth for *how* APEX is built: stack, processes, data models, internal APIs, the AI layer, integrations, and security. Functional requirement IDs (`FR-*`) and non-functional IDs (`NFR-*`) reference the PRD.

---

## 1. Architectural Principles

1. **Local-first.** The local SQLite database is the system of record for all trade, journal, note, and script data. There is no server-side copy of user trade data. (NFR-PRIV-1)
2. **The renderer is dumb; the Rust core is trusted.** All secrets (API keys), all DB access, all external network calls happen in the Rust backend process. The webview frontend never holds the provider key and never talks to the AI provider directly. (NFR-SEC-2)
3. **AI is an orchestrated capability, not the architecture.** The model is one component behind a context-builder and a validation layer. Swapping models or providers must not require touching feature code.
4. **Platform-agnostic core.** TOS specifics (CSV schema, ThinkScript) live behind adapters/strategies. The journal/coach/research domain has no hard TOS dependency. (R1 mitigation)
5. **Correctness gates on generated code.** Generated ThinkScript passes a static validation pass before it reaches the UI. (FR-TS-10, NFR-REL-2)
6. **Boring, observable, recoverable.** Standard, well-understood components. Every AI call is logged locally (what was sent). Imports are reversible. Migrations are versioned.

---

## 2. High-Level System

```
┌──────────────────────────────────────────────────────────────────────┐
│                        APEX Desktop App (Tauri)                        │
│                                                                        │
│  ┌────────────────────────────┐      ┌──────────────────────────────┐ │
│  │   Frontend (Webview)       │      │     Rust Core (Trusted)      │ │
│  │   React + TypeScript       │◄────►│                              │ │
│  │                            │ IPC  │  ┌────────────────────────┐  │ │
│  │  • 6 surfaces (TS/Journal/ │ cmds │  │  Command Handlers       │  │ │
│  │    Coach/Strategy/Research/│ +    │  │  (Tauri commands)       │  │ │
│  │    Workspace)              │ evts │  └───────────┬────────────┘  │ │
│  │  • Command palette (Ctrl+K)│      │              │                │ │
│  │  • Code editor (Monaco)    │      │  ┌───────────▼────────────┐  │ │
│  │  • Streaming chat UI       │      │  │  Domain Services        │  │ │
│  └────────────────────────────┘      │  │  ScriptSvc, JournalSvc, │  │ │
│                                       │  │  CoachSvc, ResearchSvc, │  │ │
│                                       │  │  ImportSvc, BillingSvc  │  │ │
│                                       │  └─────┬──────────┬────────┘  │ │
│                                       │        │          │           │ │
│                          ┌────────────▼──┐  ┌──▼─────────▼─────────┐  │ │
│                          │ Local Data     │  │  AI Orchestration   │  │ │
│                          │ Engine         │  │  Layer              │  │ │
│                          │ • SQLite (SQLCipher) │ • Context builder │  │ │
│                          │ • Vector index │  │ • Prompt registry   │  │ │
│                          │   (sqlite-vec/ │  │ • Model router      │  │ │
│                          │    LanceDB)    │  │ • TS validator      │  │ │
│                          │ • Secure store │  │ • Send-log          │  │ │
│                          └────────────────┘  └──────────┬──────────┘  │ │
│                                                          │             │ │
└──────────────────────────────────────────────────────────┼────────────┘
                                                           │
                          ┌────────────────────────────────▼─────────────┐
                          │            External Services                  │
                          │  • Anthropic Claude API (inference)           │
                          │  • Stripe (billing/license)                   │
                          │  • OCR provider or local OCR (screenshots, V2)│
                          │  • Update server (app auto-update)            │
                          └───────────────────────────────────────────────┘
```

---

## 3. Technology Stack

| Layer | Choice | Rationale |
|---|---|---|
| Shell | **Tauri 2.x** | Small binary, low memory, real OS integration, Rust security boundary. Beats Electron for a side-panel app that must be lightweight next to TOS. |
| Backend language | **Rust** | Tauri core; safe secret/DB handling; fast local queries. |
| Frontend | **React + TypeScript + Vite** | Mature ecosystem, fast iteration. (Svelte acceptable alternative; React chosen for hiring depth.) |
| Code editor | **Monaco** (with a custom ThinkScript language definition) | Battle-tested editor; syntax highlighting, diffs, decorations out of the box. |
| Local DB | **SQLite via SQLCipher** | Embedded, fast, encrypted-at-rest. (NFR-SEC-1) |
| Vector search | **sqlite-vec** (start) → LanceDB if scale demands | Keep it in-process and simple; one fewer moving part. `ponytail:` start with sqlite-vec, migrate only if recall/latency measurably fails. |
| Secrets | **OS keychain** (Keychain / Credential Manager) via Tauri plugin | Never store API keys or DB key plaintext. |
| AI provider | **Anthropic Claude API** | `claude-sonnet-4-6` for complex reasoning/codegen; `claude-haiku-4-5` for fast/cheap completions. |
| Billing | **Stripe** | Standard, self-serve, supports annual/proration. |
| OCR (V2) | Evaluate **local (Tesseract/macOS Vision)** vs. a vision model call | Privacy preference for local; vision-model fallback for chart-structure reads. |
| Telemetry | Local-first, opt-in, self-hosted or privacy-respecting analytics | No trade content ever transmitted. (NFR-OBS-1) |

> Model IDs are config, not hardcoded. A single `model_router` config maps task classes → model IDs so upgrades are a config change.

---

## 4. Process & Trust Boundaries

- **Renderer (webview):** UI only. Holds no secrets. Communicates with the core exclusively via Tauri commands (request/response) and events (streaming tokens, progress). Treated as untrusted.
- **Rust core:** Holds the SQLCipher key (loaded from OS keychain at unlock), the Anthropic API key, and the Stripe interaction. All AI calls originate here. Enforces the non-advisory guardrails and the send-log.
- **Network egress:** Only the Rust core makes outbound calls — to Anthropic, Stripe, the update server, and (V2) OCR. Every Anthropic call is recorded in the local `ai_send_log` (NFR-PRIV-3).

This boundary is the core of the security model: even a compromised/XSS'd frontend cannot exfiltrate the provider key or read the DB directly.

---

## 5. Data Model

SQLite schema (logical). All tables live in the encrypted local DB. IDs are UUIDv7 (sortable). Timestamps are UTC epoch-ms unless noted.

### 5.1 ThinkScript domain

```sql
-- Saved scripts (FR-TS-6)
CREATE TABLE script (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  kind          TEXT NOT NULL,        -- 'study' | 'scanner' | 'strategy' | 'column'
  code          TEXT NOT NULL,
  original_intent TEXT,               -- the English description that produced it
  language_ver  TEXT,                 -- ThinkScript dialect/version notes
  validated     INTEGER DEFAULT 0,    -- passed static validation (not "verified correct")
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);

CREATE TABLE script_tag (
  script_id TEXT NOT NULL REFERENCES script(id) ON DELETE CASCADE,
  tag       TEXT NOT NULL,
  PRIMARY KEY (script_id, tag)
);

-- Vector embedding of script intent/behavior for NL library search (FR-TS-6)
CREATE TABLE script_embedding (
  script_id TEXT PRIMARY KEY REFERENCES script(id) ON DELETE CASCADE,
  embedding BLOB NOT NULL            -- via sqlite-vec
);

-- Conversational edit history for refinement loop (FR-TS-5)
CREATE TABLE script_revision (
  id         TEXT PRIMARY KEY,
  script_id  TEXT NOT NULL REFERENCES script(id) ON DELETE CASCADE,
  code       TEXT NOT NULL,
  change_note TEXT,                  -- AI-explained diff summary
  created_at INTEGER NOT NULL
);
```

### 5.2 Journal domain

```sql
-- One row per executed trade (round-trip or leg, normalized) (FR-J-1)
CREATE TABLE trade (
  id            TEXT PRIMARY KEY,
  external_ref  TEXT,                 -- source row id / dedupe key from import
  symbol        TEXT NOT NULL,
  instrument    TEXT NOT NULL,        -- 'equity' | 'option' | 'future' | 'multi_leg'
  side          TEXT,                 -- 'long' | 'short'
  qty           REAL,
  entry_ts      INTEGER,
  exit_ts       INTEGER,
  entry_price   REAL,
  exit_price    REAL,
  pnl           REAL,
  fees          REAL,
  hold_secs     INTEGER,
  raw_payload   TEXT,                 -- original parsed row (JSON) for audit/repair
  import_id     TEXT REFERENCES import_batch(id),
  parse_status  TEXT NOT NULL,        -- 'ok' | 'partial' | 'unparsed'  (NFR-REL-1)
  created_at    INTEGER NOT NULL
);

-- For multi-leg options: legs reference a parent trade
CREATE TABLE trade_leg (
  id        TEXT PRIMARY KEY,
  trade_id  TEXT NOT NULL REFERENCES trade(id) ON DELETE CASCADE,
  leg_type  TEXT,                     -- 'call' | 'put' | 'stock'
  strike    REAL,
  expiry    INTEGER,
  side      TEXT,
  qty       REAL,
  price     REAL
);

-- AI + user tags (FR-J-2). source distinguishes auto vs manual.
CREATE TABLE trade_tag (
  trade_id TEXT NOT NULL REFERENCES trade(id) ON DELETE CASCADE,
  tag      TEXT NOT NULL,
  source   TEXT NOT NULL,            -- 'ai' | 'user'
  PRIMARY KEY (trade_id, tag)
);

-- AI-generated post-mortem narrative (FR-J-4)
CREATE TABLE trade_narrative (
  trade_id   TEXT PRIMARY KEY REFERENCES trade(id) ON DELETE CASCADE,
  narrative  TEXT NOT NULL,
  flags      TEXT,                    -- JSON array of behavioral flags
  model_id   TEXT,
  created_at INTEGER NOT NULL
);

-- Setup-description embedding for similarity search (FR-J-6)
CREATE TABLE trade_embedding (
  trade_id  TEXT PRIMARY KEY REFERENCES trade(id) ON DELETE CASCADE,
  embedding BLOB NOT NULL
);

CREATE TABLE import_batch (
  id          TEXT PRIMARY KEY,
  source      TEXT NOT NULL,         -- 'tos_csv' | 'manual' | future adapters
  filename    TEXT,
  row_count   INTEGER,
  ok_count    INTEGER,
  unparsed_count INTEGER,
  created_at  INTEGER NOT NULL
);
```

### 5.3 Coach domain

```sql
-- User-defined trading rules in natural language (FR-C-4)
CREATE TABLE rule (
  id          TEXT PRIMARY KEY,
  text        TEXT NOT NULL,          -- "Never re-enter within 5 min of a stop-out"
  active      INTEGER DEFAULT 1,
  created_at  INTEGER NOT NULL
);

-- Detected behavioral patterns / fingerprint entries (FR-C-1/2/3)
CREATE TABLE behavior_insight (
  id          TEXT PRIMARY KEY,
  kind        TEXT NOT NULL,         -- 'fomo' | 'revenge' | 'chasing' | 'rule_violation' | ...
  statement   TEXT NOT NULL,        -- quantified, cited statement
  metric_json TEXT,                 -- supporting numbers
  period_start INTEGER,
  period_end   INTEGER,
  created_at   INTEGER NOT NULL
);

-- Rule violation linkage (FR-C-4)
CREATE TABLE rule_violation (
  id        TEXT PRIMARY KEY,
  rule_id   TEXT NOT NULL REFERENCES rule(id) ON DELETE CASCADE,
  trade_id  TEXT NOT NULL REFERENCES trade(id) ON DELETE CASCADE,
  cost      REAL,                    -- estimated P&L impact
  created_at INTEGER NOT NULL
);
```

### 5.4 Workspace / Research domain

```sql
CREATE TABLE note (
  id         TEXT PRIMARY KEY,
  title      TEXT,
  body       TEXT NOT NULL,          -- markdown; transcribed text for voice notes
  kind       TEXT NOT NULL,         -- 'text' | 'voice' | 'screenshot_caption'
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE asset (
  id         TEXT PRIMARY KEY,
  path       TEXT NOT NULL,          -- local file path (screenshots, audio)
  kind       TEXT NOT NULL,         -- 'screenshot' | 'audio'
  ocr_text   TEXT,                   -- extracted text (V2)
  created_at INTEGER NOT NULL
);

CREATE TABLE note_embedding (
  note_id   TEXT PRIMARY KEY REFERENCES note(id) ON DELETE CASCADE,
  embedding BLOB NOT NULL
);

-- Generic cross-link graph (note↔trade↔script↔strategy) (FR-W-3)
CREATE TABLE link (
  src_type TEXT NOT NULL,           -- 'note'|'trade'|'script'|'strategy'
  src_id   TEXT NOT NULL,
  dst_type TEXT NOT NULL,
  dst_id   TEXT NOT NULL,
  PRIMARY KEY (src_type, src_id, dst_type, dst_id)
);
```

### 5.5 System domain

```sql
-- Transparency: every AI provider call (NFR-PRIV-3)
CREATE TABLE ai_send_log (
  id          TEXT PRIMARY KEY,
  feature     TEXT NOT NULL,        -- 'ts_generate' | 'journal_narrative' | ...
  model_id    TEXT NOT NULL,
  prompt_summary TEXT,              -- redacted/summarized payload description
  token_in    INTEGER,
  token_out   INTEGER,
  cost_est    REAL,
  created_at  INTEGER NOT NULL
);

CREATE TABLE app_meta (
  key   TEXT PRIMARY KEY,
  value TEXT
);                                  -- schema_version, license cache, settings
```

> **Migrations:** versioned, forward-only, applied on launch inside a transaction; `schema_version` in `app_meta`. Every migration tested against a populated fixture DB.

---

## 6. Internal API (Tauri Command Surface)

Commands are the contract between frontend and Rust core. All are async; long-running AI commands stream via events. Naming: `domain.action`.

### 6.1 ThinkScript

| Command | Input | Output | Notes |
|---|---|---|---|
| `ts.generate` | `{ intent, context? }` | stream → `{ code, explanation, validation }` | FR-TS-1; runs validator (§8.4) |
| `ts.explain` | `{ code }` | stream → `{ explanation }` | FR-TS-2 |
| `ts.debug` | `{ code, error? }` | stream → `{ fixed_code, diff, cause }` | FR-TS-3 |
| `ts.refactor` | `{ code, goal }` | stream → `{ code, diff, changes }` | FR-TS-4 |
| `ts.refine` | `{ script_id, instruction }` | stream → `{ code, diff, change_note }` | FR-TS-5; appends `script_revision` |
| `ts.library.save` | `{ script }` | `{ id }` | FR-TS-6; computes embedding |
| `ts.library.search` | `{ query }` | `{ scripts[] }` | FR-TS-6; vector + keyword |
| `ts.scanner.generate` | `{ setup }` | stream → `{ code, explanation }` | FR-TS-8 |

### 6.2 Journal

| Command | Input | Output |
|---|---|---|
| `journal.import.csv` | `{ file_path }` | `{ import_id, ok, unparsed, preview }` (FR-J-1, NFR-REL-1) |
| `journal.query.nl` | `{ question }` | `{ structured_filter, trades[] }` (FR-J-3) |
| `journal.trade.get` | `{ trade_id }` | `{ trade, legs, tags, narrative }` |
| `journal.narrative.generate` | `{ trade_id }` | stream → `{ narrative, flags }` (FR-J-4) |
| `journal.analytics` | `{ slice_by[] }` | `{ stats }` (FR-J-5) |
| `journal.similar` | `{ trade_id \| description }` | `{ trades[] }` (FR-J-6) |
| `journal.trade.upsert` | `{ trade }` | `{ id }` (FR-J-8) |

### 6.3 Coach / Strategy / Research / Workspace

| Command | Input | Output |
|---|---|---|
| `coach.scan` | `{ period? }` | `{ insights[] }` (FR-C-1/2/3) |
| `coach.rule.upsert` | `{ rule }` | `{ id }` (FR-C-4) |
| `coach.violations` | `{ rule_id? }` | `{ violations[] }` (FR-C-4) |
| `strategy.build` | `{ description }` | stream → `{ code, scanner, columns, explanation }` (FR-ST-1) |
| `strategy.backtest.history` | `{ description }` | `{ historical_outcomes }` (FR-ST-2) |
| `screenshot.analyze` | `{ asset_id }` | stream → `{ structured, narrative }` (FR-S-2/3/4) |
| `research.ask` | `{ question }` | stream → `{ answer, citations[] }` (FR-R-1) |
| `research.report` | `{ spec }` | stream → `{ report }` (FR-R-3) |
| `workspace.note.upsert` | `{ note }` | `{ id }` (FR-W-1) |
| `workspace.search` | `{ query }` | `{ results[] }` (FR-W-2) |

### 6.4 System

| Command | Input | Output |
|---|---|---|
| `system.unlock` | `{ }` (uses OS keychain) | `{ ok }` — loads DB key |
| `license.status` | `{ }` | `{ tier, valid, grace_until }` (FR-BILL-1) |
| `ai.sendlog.list` | `{ limit }` | `{ entries[] }` (NFR-PRIV-3) |
| `settings.get/set` | `{ ... }` | `{ ... }` |

---

## 7. Integration Specifications

### 7.1 TOS CSV import (Phase 1 — P1)

- **Adapter pattern:** `ImportAdapter` trait with `parse(file) -> Vec<ParsedTrade>`. `TosCsvAdapter` is the first implementation; future `TradeStationAdapter`, `NinjaTraderAdapter`, `IbkrAdapter` slot in without touching journal logic (R1 mitigation).
- **Robustness (NFR-REL-1):** Every source row maps to exactly one outcome — `ok`, `partial`, or `unparsed`. Unparsed rows are stored with `raw_payload` and surfaced in the import summary for manual handling. **Never silently dropped.**
- **Coverage order:** equities → single-leg options → multi-leg options → futures. Multi-leg uses `trade_leg`.
- **Dedupe:** `external_ref` derived from a stable hash of source fields prevents double-import.
- **Open question:** exact current TOS export schema (PRD §18.1) — must be confirmed against a real export before locking the parser.

### 7.2 Screenshot OCR / vision (Phase 2 — P2)

- Ingest via drag/drop or clipboard paste → store as `asset`.
- Two-path analysis: (a) **structural read** via a vision model call for chart structure/indicators/levels; (b) optional **local OCR** (Tesseract / macOS Vision) for text/values, preferred for privacy where it works.
- Output: structured JSON (`screenshot.analyze`) + narrative. Framed strictly as post-mortem analysis (FR-S-4), never a signal.
- **Privacy:** screenshots may contain account info — local OCR preferred; any vision-model send is logged and consented.

### 7.3 Unofficial TOS/Schwab API (Phase 3 — P3, gated)

- Read-only context (what symbol/chart the user is viewing) *only if* legally permissible (R5). **Blocked pending legal review.** Not a launch dependency. Architected as just another `ContextSource` so it can be added or removed without core changes.

### 7.4 Screen capture + OCR for live context (Phase 4 — P3)

- Highest complexity, lowest near-term certainty. Periodic capture of the TOS window region → OCR → ephemeral context for the AI. Gated on R5 legal review and OCR fidelity (PRD §18.4). V2/V3 territory.

### 7.5 Claude API (all phases)

- Single egress point in the Rust core (§4). Streaming responses surfaced to the UI via Tauri events.
- Model routing via `model_router` config (§3 note, §8.3).
- Prompt caching for the large, static ThinkScript system prompt/corpus to cut cost and latency (NFR-COST-1).
- Retries with backoff; on terminal failure, a graceful UI error (never a silent wrong answer).

---

## 8. AI / ML Layer

The AI layer is a pipeline, not a single call: **Context Builder → Prompt Assembly → Model Router → Provider Call → Validation/Guardrails → Streamed Response → Send-Log.**

### 8.1 Context Builder

- Assembles minimal, relevant context per feature. **Never dumps raw bulk data** (NFR-PRIV-2, NFR-COST-1).
- Journal/coach/research: builds *summaries and aggregates* (e.g., precomputed win-rate slices, the N most similar trades via vector search), not raw CSV.
- ThinkScript: pulls relevant corpus few-shot examples by similarity to the user's intent.
- Enforces a context-token budget; trims by relevance ranking when over budget.

### 8.2 Prompt Registry

- Feature-specific system prompts, versioned and stored as code/assets (not inlined ad hoc). Each prompt encodes:
  - The non-advisory guardrail (FR-AI-4, PRD §16).
  - The "always explain (why/what/risk/alternatives)" instruction (FR-AI-1).
  - The "density over verbosity" instruction (FR-AI-3).
  - For ThinkScript: syntax rules, common pitfalls, and curated few-shot examples.
- Prompts are A/B-testable and versioned; the active version is recorded in `ai_send_log.feature` context for quality tracking.

### 8.3 Model Router

- Task-class → model mapping in config:
  - **Complex** (generation, refactor, narratives, multi-step reasoning) → `claude-sonnet-4-6`.
  - **Fast/cheap** (short explanations, small edits, classification/tagging) → `claude-haiku-4-5`.
- Routing enforces NFR-COST-1 (per-user inference cost <25% of subscription). Cost tracked per call in `ai_send_log`.

### 8.4 ThinkScript Validation Layer (correctness gate — FR-TS-10, NFR-REL-2)

The single most important quality component. Before any generated ThinkScript reaches the UI:

1. **Static syntax validation** against a ThinkScript grammar/linter (balanced braces, valid built-in functions, valid declaration structure, `plot`/`def`/`input` correctness, reserved-word misuse).
2. **Self-correction loop:** on validation failure, feed the error back to the model for a bounded number of retries (e.g., ≤2) before surfacing.
3. **Labeling:** output is marked `validated=1` only for "passed static checks" — **never** "verified correct." UI always shows *"Review before use"* (R4, PRD §16).
4. **Explanation pairing:** generated code is always accompanied by a logic explanation so the user can validate intent (FR-AI-1).

> The validator is the heart of the moat-protecting quality bar. It must exist before the wedge feature ships. See [`03-ROADMAP.md`](03-ROADMAP.md) testing strategy for the ThinkScript correctness test corpus.

### 8.5 Guardrails

- Hard refusal/redirect for advisory requests ("should I buy X?") → reframed to analysis/education (PRD §16).
- Output post-filter scans for recommendation-shaped language as a backstop.

### 8.6 Embeddings & Vector Search

- Local embedding of: script intent, trade setup descriptions, and notes.
- Stored in `*_embedding` tables; queried via sqlite-vec for NL library search (FR-TS-6), setup similarity (FR-J-6), and workspace search (FR-W-2).
- `ponytail:` embeddings can be computed via the provider initially; move to a local embedding model if cost/privacy demands.

### 8.7 ThinkScript Corpus

- Curated, high-quality ThinkScript examples used as few-shot context, indexed by behavior/intent.
- Improved by a **user feedback loop**: thumbs-up/down on generated code feeds a review queue; verified-good examples enter the corpus (with licensing care — PRD §18.3).
- This corpus is moat asset #2 (PRD §15). It compounds with usage.

---

## 9. Security & Privacy Architecture

| Control | Implementation | Requirement |
|---|---|---|
| Data locality | All user data in local SQLCipher DB; no server-side trade store | NFR-PRIV-1 |
| Encryption at rest | SQLCipher, key from OS keychain (optional user passphrase — PRD §18.6 open) | NFR-SEC-1 |
| Secret storage | API keys + DB key in OS keychain only; never plaintext on disk | NFR-SEC-1 |
| Trust boundary | All secrets + egress in Rust core; renderer never holds keys | NFR-SEC-2 |
| Minimal AI payloads | Context Builder sends summaries/specific snippets, not bulk data | NFR-PRIV-2 |
| Transparency | `ai_send_log` records every provider call; user-viewable | NFR-PRIV-3 |
| Transport | TLS for all egress | NFR-SEC-2 |
| No data sale | Architectural: no server-side user-data store to sell; public commitment | PRD §11.4 |
| Telemetry | Opt-in, local-first, zero trade content | NFR-OBS-1 |

---

## 10. Performance Architecture

- **Streaming everywhere.** AI responses stream token-by-token to the UI (NFR-PERF-1); the editor renders incrementally.
- **Model routing for latency.** Fast model for short tasks targets <2s first token (NFR-PERF-2).
- **Indexed local queries.** Journal filters and library search are indexed; target <200ms at 50k trades (NFR-PERF-3).
- **Prompt caching** of the static ThinkScript system prompt/corpus reduces both latency and cost.
- **Precomputed aggregates.** Win-rate slices and behavioral metrics computed incrementally on import, not on every query.
- **Lazy/virtualized lists** for large trade timelines.

---

## 11. Deployment, Updates, Observability

- **Distribution:** signed installers for Windows + macOS (NFR-PORT-1). Code-signing on both (required for trust + auto-update).
- **Auto-update:** Tauri updater against a self-hosted update feed; staged rollout.
- **Crash/error reporting:** opt-in, scrubbed of any trade content.
- **Local logs:** rotating local logs for support; never auto-uploaded without consent.
- **Free web tool** (GTM): a separate, minimal web deployment of `ts.generate` only — stateless, rate-limited, anonymous, no DB. Shares the prompt registry + validator with the desktop app via a shared core crate/service. (PRD §12, §18.5 cost controls.)

---

## 12. Build & Repo Structure (proposed)

```
apex-stock/
├─ docs/                  # this documentation set
├─ src-tauri/             # Rust core
│  ├─ src/
│  │  ├─ commands/        # Tauri command handlers (§6)
│  │  ├─ domain/          # ScriptSvc, JournalSvc, CoachSvc, ...
│  │  ├─ ai/              # context builder, prompt registry, router, validator, guardrails
│  │  ├─ data/            # SQLite/SQLCipher, migrations, vector index
│  │  ├─ import/          # ImportAdapter trait + TosCsvAdapter
│  │  └─ security/        # keychain, send-log
│  └─ tauri.conf.json
├─ src/                   # React frontend
│  ├─ surfaces/           # thinkscript/ journal/ coach/ strategy/ research/ workspace/
│  ├─ components/         # command palette, editor, streaming chat, data grids
│  ├─ design/             # tokens, theme (see §13)
│  └─ ipc/                # typed command/event bindings
├─ corpus/                # curated ThinkScript corpus + few-shot index
├─ web-tool/              # free public ThinkScript generator (shares core)
└─ tests/                 # incl. ThinkScript correctness corpus (see roadmap)
```

> `ponytail:` start as a single repo with the web-tool sharing a core crate; split only if build/release coupling becomes painful.

---

## 13. UX Architecture & Design System

Detailed product behavior is in the PRD; this is the implementable design spec.

### 13.1 Layout

- **The Intelligent Side Panel.** A narrow, dense vertical panel intended to sit beside TOS — not a full-screen takeover. Resizable; remembers width.
- **Vertical icon rail (left):** ThinkScript · Journal · Strategy · Coach · Research · Workspace.
- **Command palette (Ctrl/Cmd+K):** the primary entry point to every action. Keyboard-first (NFR-A11Y-1).

### 13.2 Visual language

- **Dark theme only.** Base background `#0a0a0a`. (No light mode — traders work in dark rooms.)
- **Density:** Bloomberg-terminal density, not consumer whitespace. Grids and tables, **not** cards. No rounded corners on data elements.
- **Type:** monospace for code and numeric/data; a clean variable font for prose.
- **Color = semantics only.** Green/red for P&L, amber for warnings/flags. No decorative color. No gratuitous animation (respect reduced-motion).

### 13.3 Design tokens (starting set)

```
--bg-base:    #0a0a0a
--bg-panel:   #111214
--bg-elev:    #16181c
--border:     #23262b
--text-hi:    #e6e7e9
--text-lo:    #9aa0a6
--pnl-pos:    #1faa5b
--pnl-neg:    #e5484d
--warn:       #f5a623
--accent:     #4c8bf5   /* used sparingly, interactive only */
--font-mono:  "JetBrains Mono", ui-monospace, monospace
--font-ui:    "Inter", system-ui, sans-serif
--radius-data: 0px       /* data elements */
--radius-ctrl: 4px       /* buttons/inputs only */
```

### 13.4 Key surfaces

- **ThinkScript:** Monaco editor (left) + streaming AI chat with current-code context (right) + error panel (bottom) with one-click "explain this error." No "generate" button — describe intent and press Enter (FR-TS-1/3/7).
- **Journal:** timeline of trades (auto-tagged, P&L-colored) + NL search bar (top) + trade-detail panel with AI narrative + behavioral-insights sidebar (FR-J-4/5/7).
- **Coach:** behavioral fingerprint + insight cards (pull-model, surfaced on open) + rules editor (FR-C-*).
- **Strategy/Research/Workspace:** consistent "describe → generate/answer → save to library" pattern with cited sources (FR-AI-2).

### 13.5 Interaction principles (enforced)

- Keyboard reachable everything; mouse optional.
- Context persists within a session — the AI knows what surface/artifact you're on (FR-AI; PRD §7.5).
- Pull, not push: no unprompted notifications/suggestions (FR-C-5, PRD design principle 5).
- Every AI answer streams; nothing blocks on a blank spinner (NFR-PERF-1).

---

## 14. Key Architectural Decisions (ADR summary)

| # | Decision | Why | Reversible? |
|---|---|---|---|
| ADR-1 | Tauri over Electron | Lightweight side-panel, Rust security boundary | Hard |
| ADR-2 | Local-first SQLCipher, no server trade store | Trust is existential for this audience | Hard (core principle) |
| ADR-3 | Renderer holds no secrets; all egress in Rust | Security boundary | Hard |
| ADR-4 | Import via adapter pattern | Platform-agnostic core (R1) | Easy |
| ADR-5 | ThinkScript static-validation gate before display | Correctness bar (R4) | Easy to extend |
| ADR-6 | Model routing via config, not hardcoded | Cost (NFR-COST-1) + model upgrades | Easy |
| ADR-7 | sqlite-vec first, LanceDB only if needed | Fewer moving parts | Easy |
| ADR-8 | Free web tool shares core crate w/ desktop | Consistent quality, one validator | Medium |

---

*Delivery sequencing, per-phase acceptance criteria, and the full testing strategy (including the ThinkScript correctness test corpus) are in [`03-ROADMAP.md`](03-ROADMAP.md).*
