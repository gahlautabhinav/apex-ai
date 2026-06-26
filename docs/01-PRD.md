# Project APEX — Product Requirements Document

**Document type:** Master PRD
**Product:** APEX — The AI-Native Trading Companion for Thinkorswim
**Status:** Draft v1.0 (foundational)
**Owner:** Founding team
**Last updated:** 2026-06-26

> Companion documents: [`02-ARCHITECTURE.md`](02-ARCHITECTURE.md) (technical), [`03-ROADMAP.md`](03-ROADMAP.md) (delivery plan, acceptance criteria, testing). This file is the single source of truth for *what* APEX is and *why*. The architecture doc is the source of truth for *how*.

---

## 1. Executive Summary

APEX is an AI-native desktop application that runs alongside Thinkorswim (TOS) and acts as the professional trader's intelligence layer. TOS remains the execution platform — charting, order routing, market data, options chains. APEX does not replace any of that. Instead, APEX automates and accelerates the cognitive work surrounding trading: writing and debugging ThinkScript, journaling trades, detecting behavioral patterns, analyzing chart screenshots, building strategies, and researching a trader's own history.

The analogy is Cursor for VS Code. Cursor did not replace programming; it changed how developers interact with their editor by weaving AI into the workflow. APEX does the same for the serious Thinkorswim trader.

**Core thesis:** Professional traders spend most of their day on tasks AI is now genuinely good at — reading charts, writing ThinkScript, reviewing trades, searching journal history, explaining market behavior, managing risk. Almost all of this is still manual. APEX automates or dramatically accelerates these workflows, making the trader more capable rather than replacing their judgment.

**Wedge feature:** AI ThinkScript generation, explanation, and debugging. ThinkScript is genuinely hard, its documentation is poor, and no general-purpose AI is good at it. This is the sharpest pain and the strongest acquisition hook.

**Long-term product:** The journal + behavioral coaching + research layer, which accumulates a private, irreplaceable model of each trader over time. ThinkScript is the acquisition channel; the personal data flywheel is the durable business.

**Business shape:** Flat-rate B2C/prosumer SaaS. $29 → $49 → $79/month as the product matures. Niche but high-willingness-to-pay audience. TAM at full multi-platform scale ≈ $500M ARR.

**Non-negotiable constraints:**
1. **Local-first data.** All trade and journal data lives on the user's machine. Traders will not send positions to a cloud database.
2. **Analytical, never advisory.** No signals, no "buy this." APEX explains, analyzes, and teaches. This is a regulatory and trust requirement.
3. **Correctness over cleverness in generated code.** Wrong ThinkScript costs real money.
4. **Platform-independent architecture.** TOS is the first integration target, not a permanent dependency (Schwab migration risk).

---

## 2. Product Vision & Strategy

### 2.1 Vision statement

> Give every serious trader an experienced quantitative analyst sitting beside them at all times — one that writes their code, remembers every trade they've ever made, and helps them become measurably better over months and years.

### 2.2 What APEX is

- An AI-native **desktop** companion that lives in a side panel next to Thinkorswim.
- The trader's **intelligence and memory layer** on top of their existing execution platform.
- A tool that **teaches** — every output explains *why*, *what*, *risk*, and *alternatives*.

### 2.3 What APEX is explicitly NOT

| Not this | Why we avoid it |
|---|---|
| An AI stock picker / signal generator | Commoditized, regulatory landmine, destroys trust on the first bad call |
| A "buy this stock" chatbot | Same as above; not our value |
| A TradingView/charting clone | TOS already does this better than we ever could |
| A broker or order router | Out of scope, enormous regulatory burden |
| Another generic AI trading startup | We compete on *workflow*, not predictions |

### 2.4 Strategic pillars

1. **Workflow, not predictions.** We never claim to predict markets. We save traders hours per week and reduce mistakes. This is defensible; prediction is not.
2. **ThinkScript as the wedge.** Own the hardest, most TOS-specific pain first. It's a moat general AI can't easily cross.
3. **Data flywheel as the moat.** The longer a trader uses APEX, the more it knows them and the higher the switching cost.
4. **Platform-agnostic core.** Build the journal/coach/research layer so it can adopt TradeStation, NinjaTrader, IBKR later without a rewrite.
5. **Trust as a feature.** Local-first, transparent sourcing, no data selling, explicit non-advisory framing.

### 2.5 The Cursor analogy — honest framing

The analogy is correct as **product philosophy** (AI woven into workflow, not bolted on as a chatbot). It is *not* a perfect technical parallel: VS Code exposes a rich extension API; TOS exposes almost nothing. There is no TOS plugin system or programmatic access to the active chart, positions, or session state. APEX integrates *beside* TOS (CSV import, screenshots, eventually OCR/screen capture), not *inside* it. This is acknowledged up front so the team does not over-promise "real-time magic" the platform cannot deliver in early versions.

---

## 3. Market Analysis

### 3.1 Audience sizing

| Segment | Estimated size | Notes |
|---|---|---|
| Total TD Ameritrade / Schwab accounts | ~11M | Far too broad; mostly passive |
| Active TOS power users (primary tool, daily) | 500K–1.5M | Core addressable market |
| ThinkScript developers / scripters | 50K–150K | Highest-leverage early adopters, sharpest pain |
| Options scanners / custom-study builders | High overlap with above | Strong wedge fit |

### 3.2 Why this segment is attractive

- **High willingness to pay.** A trader running a 6-figure account will pay $50–100/month for a tool that saves 5–10 hours a week. Tool cost is trivially justified as a business expense.
- **High referral velocity.** ThinkScript and setups get passed around r/thinkorswim, Discord servers, and Twitter/X. A genuinely useful script with an "APEX" provenance markets itself.
- **Severely underserved.** Every AI trading startup chases retail signal products. Nobody builds for the professional TOS power user's *workflow*.

### 3.3 Market size reality check

This is a **niche, not a mass market.** TAM for professional active TOS traders is roughly $500M ARR at full scale. The path beyond that is platform expansion: nail TOS, then add adapters for TradeStation, NinjaTrader, IBKR — i.e., become the platform-agnostic AI trading-workflow companion.

### 3.4 Timing

- Claude-class models are now good enough to deliver excellent ThinkScript generation *today*.
- The white space is real and unclaimed.
- Estimated window before a major AI lab ships a vertical "AI for traders" product: ~18–24 months. The TOS niche is too small for them to prioritize first, which is our opening.

---

## 4. Competitive Landscape

| Company | What they do | Why not a direct threat |
|---|---|---|
| **TradeZella** | Trade journal + analytics | No AI, no TOS-deep integration, no ThinkScript |
| **Tradervue** | Journal + P&L analysis | Legacy, no AI at all |
| **TrendSpider** | AI charting, multi-timeframe | Not TOS, no workflow AI, no journal/coach |
| **Trade Ideas (Holly AI)** | AI scanner, signals | Signal-focused (the thing we deliberately avoid) |
| **Composer** | No-code strategy automation | Robinhood ecosystem, wrong audience |
| **TradeStation (internal AI)** | First-party scripting + AI mentions | Closed, single-platform, no third-party layer |
| **Options AI / Predicting Alpha** | Options structure / flow data | Single-purpose data, no ThinkScript, no workflow |
| **ChatGPT / Claude (raw)** | General AI | No trading context, no integration, weak at ThinkScript |

**The gap:** No one has built AI-native ThinkScript assistance, no one has built a journal that uses AI to extract *behavioral* patterns across hundreds of real trades, and no one connects research → code generation → trade review into one workflow. All three white spaces are genuine.

**Moat-erosion risk:** OpenAI/Anthropic/Google could ship a vertical product, but TOS power users are too niche to be their first target. Window is ~18–24 months — long enough to build the data and corpus moats.

---

## 5. Why Traders Would Actually Switch

Not because of AI hype — because of specific pain elimination. Ordered by sharpness:

1. **ThinkScript is hard and under-documented.** A custom VWAP-anchored momentum scanner can cost a trader 6–10 hours to write and debug. APEX reduces that to minutes. This single capability creates lifelong converts and word-of-mouth.
2. **Journals are tedious.** Every good trader knows they *should* journal; almost none do it consistently because it's manual. Auto-import + auto-tag + natural-language query removes the friction entirely.
3. **No memory across sessions.** Traders repeat the same mistakes because nothing tracks their behavioral patterns. APEX is external memory that surfaces patterns at the right moment.
4. **Research is fragmented.** TOS, Google, Twitter, Reddit, Seeking Alpha — all separate. A research assistant grounded in the trader's own data consolidates 1–2 hours of daily context-switching.

**Conversion trigger:** ThinkScript generation must be so undeniably better than the alternative (hand-coding or asking generic AI) that traders tell other traders the same day. That is the viral loop: trader gets a working script in two minutes, posts it to r/thinkorswim, dozens ask what produced it.

---

## 6. Problem Statement

Professional Thinkorswim traders are forced to do high-cognitive-load, repetitive work manually, with no AI assistance tailored to their platform and no system that remembers them:

- **Coding friction.** ThinkScript has a small, proprietary syntax, poor docs, and no good AI support. Writing or fixing a study or scanner is slow and error-prone.
- **No behavioral memory.** Traders cannot answer "when do I actually lose money?" without days of manual spreadsheet work. They repeat identical mistakes (FOMO, revenge trading, chasing) because nothing tracks them.
- **Manual journaling.** The single most agreed-upon improvement habit (journaling) is the one almost nobody sustains, because it's tedious and retrospective.
- **Fragmented analysis.** Understanding *why* a trade failed requires manually correlating chart structure, volume, indicators, prior trades, and personal rules — across multiple disconnected tools.
- **No grounded research.** Generic AI knows nothing about *this* trader's history, rules, or past setups.

The cost: hours lost per week, repeated avoidable mistakes, and slow skill growth.

---

## 7. Solution Overview

APEX is a keyboard-first desktop application in a dense, Bloomberg-style side panel that sits next to Thinkorswim. It is organized into six surfaces, all connected by a shared AI layer and a local data store:

| Surface | What it does | Phase |
|---|---|---|
| **ThinkScript** | Generate / explain / debug / refactor ThinkScript; personal script library w/ NL search | MVP |
| **Journal** | Import TOS trades, auto-tag, NL queries, AI trade narratives, win-rate analytics | V1 |
| **Coach** | Behavioral pattern detection, longitudinal tracking, rule-violation flags | V2 |
| **Strategy** | English → ThinkScript code + scanner + watchlist columns + logic explanation | V2 |
| **Research** | NL questions grounded in the trader's own data; setup similarity search; reports | V2 |
| **Workspace** | Notebook, notes, screenshots, voice-note transcripts; NL search across everything | V2 |

Everything the AI says explains *why*, *what*, *risk*, and *alternatives* — APEX always teaches. The same model that answers a question also cites the data it used.

---

## 8. User Personas

### 8.1 Persona A — "The Scripter" (Daniel, 34) — *primary early adopter*

- **Profile:** Full-time options/equities day trader, 8 years on TOS. Writes his own ThinkScript studies and scanners. Active on r/thinkorswim and a TOS Discord.
- **Goals:** Build and iterate custom indicators fast; stop wasting evenings debugging ThinkScript; find an edge nobody else has.
- **Pain points:** ThinkScript docs are terrible; trial-and-error debugging eats hours; generic AI hallucinates ThinkScript that looks right but is wrong.
- **What wins him:** ThinkScript generation that's correct, explained, and refinable in conversation. He becomes a vocal evangelist if it works.
- **Willingness to pay:** High. Will pay $29–79/month without blinking if it saves real time.

### 8.2 Persona B — "The Serious Discretionary Trader" (Maria, 41)

- **Profile:** Trades a 6-figure account, primarily options. Not a coder. Disciplined but knows her psychology is her weak point.
- **Goals:** Stop repeating behavioral mistakes; understand *why* trades fail; build consistency.
- **Pain points:** Knows she should journal, never sustains it; can't see her own patterns; reviews trades inconsistently and emotionally.
- **What wins her:** Auto-journal + behavioral fingerprinting + AI coach. "You have a 38% win rate when you re-enter within 5 minutes of a stop-out."
- **Willingness to pay:** High. Sees it as money-saving (fewer bad trades), not just time-saving.

### 8.3 Persona C — "The Quant Researcher" (Wei, 38)

- **Profile:** Semi-systematic trader/researcher. Builds scanners and screens, comparing historical setups.
- **Goals:** Test setup ideas quickly against his own history; generate scanners and watchlist columns; compare similar historical conditions.
- **Pain points:** Manual backtesting against personal history is slow; translating an idea into ThinkScript + scanner + columns is tedious.
- **What wins him:** Strategy Builder (English → full ThinkScript + scanner + columns) plus setup similarity search across his journal.
- **Willingness to pay:** High, especially for research acceleration.

### 8.4 Persona D — "The Prop Firm Lead" (V2+) (James, 45)

- **Profile:** Runs a small prop desk; onboards and trains junior traders.
- **Goals:** Standardize a shared ThinkScript library; track junior traders' behavioral progress; accelerate onboarding.
- **Pain points:** Tribal knowledge doesn't transfer; no systematic way to coach juniors on behavior.
- **What wins him:** Team tier — shared library + team journal analytics + behavioral progress tracking.
- **Willingness to pay:** Very high per-seat; business expense.

### 8.5 Anti-persona (do not build for)

- **Casual retail investor / passive index holder.** Wants signals and tips, low willingness to pay, high churn, regulatory risk. We deliberately do not serve this segment.

---

## 9. Core Features & Functional Requirements

Functional requirements use `FR-<area>-<n>` IDs. Priority: **P0** = MVP, **P1** = V1, **P2** = V2, **P3** = V3+. Acceptance criteria for each phase are in [`03-ROADMAP.md`](03-ROADMAP.md).

### 9.1 AI ThinkScript Engineer (P0 — the wedge)

The single feature that must be excellent before anything else ships.

- **FR-TS-1 (P0) — Generate from English.** User describes intent in natural language; APEX produces valid ThinkScript with inline comments. Output is always labeled *"Review before use — verify against your data."*
- **FR-TS-2 (P0) — Explain code.** User pastes ThinkScript; APEX returns a plain-English, line-by-grouped explanation of what it does and its assumptions.
- **FR-TS-3 (P0) — Debug errors.** User pastes ThinkScript + the TOS error message (or just the code); APEX identifies the fault, explains the cause, and returns corrected code with a diff.
- **FR-TS-4 (P0) — Refactor / optimize.** APEX restructures code for readability or performance (e.g., reduce redundant historical lookups), preserving behavior, and explains every change.
- **FR-TS-5 (P0) — Conversational refinement.** "Add an alert when it crosses above the 20 EMA." APEX modifies the *existing* code in context, shows a diff, and explains the change. Multi-turn editing loop.
- **FR-TS-6 (P0) — Personal script library.** Save generated/edited scripts locally with title, tags, and the original intent. Searchable by *what it does*, not just its name ("the study that colors bars on volume vs 20-day average").
- **FR-TS-7 (P0) — Syntax-aware editor.** Code panel with ThinkScript syntax highlighting, copy-to-clipboard, and a one-click "explain this error" affordance.
- **FR-TS-8 (P1) — Scanner generation.** Generate scan code from a setup description, formatted for TOS's Stock Hacker / scan tab.
- **FR-TS-9 (P2) — Watchlist column generation.** Generate custom watchlist/quote column studies.
- **FR-TS-10 (P0) — Correctness guardrails.** Every generated script passes an internal static validation pass (see Architecture §AI Layer) before display; failures trigger a self-correction retry. The UI never presents generated code as *verified* — only as *review-ready*.

> Explicitly deferred / cut: **Pine Script → ThinkScript conversion** (high error rate, edge case) is deprioritized to P3 at best.

### 9.2 AI Trade Journal (P1 — the core product)

- **FR-J-1 (P1) — TOS CSV import.** Import the user's trade history from a TOS export. Robust parsing of equities and single-leg options at minimum; multi-leg and futures handled or explicitly flagged as unparsed (never silently dropped).
- **FR-J-2 (P1) — Auto-categorization & tagging.** AI tags each trade by inferred setup type, strategy, instrument class, time-of-day bucket, and day-of-week. Tags are editable by the user.
- **FR-J-3 (P1) — Natural-language journal queries.** "Show every losing trade where I entered before VWAP." Translates NL to a structured query over the local trade DB; returns a filtered, sortable trade list.
- **FR-J-4 (P1) — AI trade narratives.** Per closed trade, a concise (≤3 sentence) post-mortem: entry/exit timing, what happened after exit, behavioral flags, and the trade's historical analog stats. Example: *"You entered AAPL at 189.40 at 10:14am, 4 minutes after a failed breakout. You exited at 188.10 for a $130 loss. Setups you tagged 'momentum breakout' have a 29% win rate in your last 15 similar trades."*
- **FR-J-5 (P1) — Win-rate analytics.** Win rate, expectancy, average win/loss, and P&L sliced by condition: time-of-day, setup, day-of-week, instrument, hold duration.
- **FR-J-6 (P2) — Setup similarity search.** "Show every time I traded a similar chart structure/setup." Vector similarity over textual/structured setup descriptions (and, later, screenshots).
- **FR-J-7 (P1) — Timeline view.** Chronological trade list with auto-tags, P&L coloring, and click-through to a trade detail panel.
- **FR-J-8 (P1) — Manual trade entry/edit.** Add or correct trades the importer missed or mis-parsed.

### 9.3 AI Coach — Behavioral Analytics (P2)

- **FR-C-1 (P2) — Behavioral pattern detection.** Detect recurring patterns from trade data: FOMO entries (entry shortly after a fast move), revenge trading (rapid re-entry after a loss), chasing, over-trading, holding losers too long, cutting winners early.
- **FR-C-2 (P2) — Behavioral fingerprint.** A living profile of the trader's tendencies with quantified statements: *"67% win rate in the first 90 minutes on options under $2; worst performance on earnings plays held overnight."*
- **FR-C-3 (P2) — Longitudinal tracking.** Track behavioral metrics over weeks/months; show improvement or regression trends.
- **FR-C-4 (P2) — Rule-violation detection.** User defines personal trading rules in natural language; APEX flags trades that violated them and quantifies the cost of violations.
- **FR-C-5 (P2) — Coaching prompts (pull, not push).** When the user opens Coach, surface the most actionable current pattern. No unprompted notifications.

> **Regulatory guardrail (applies to all of §9.3):** Coaching outputs are framed strictly as *analysis of past behavior*, never as instructions to take future trades. "You tend to lose when you do X" is allowed; "you should buy Y" is forbidden. See §16.

### 9.4 Screenshot Analysis (P2)

- **FR-S-1 (P2) — Chart screenshot ingestion.** Drag/drop or paste a TOS chart screenshot.
- **FR-S-2 (P2) — Structured chart read.** AI identifies visible indicators, trend context, support/resistance levels, volume profile, and notable price structure.
- **FR-S-3 (P2) — Plain-English explanation.** Narrative description of what is visible on the chart.
- **FR-S-4 (P2) — "Why did this fail?" post-mortem.** Structured breakdown of trend context, volume behavior, indicator state, likely entry criteria, and what invalidated the thesis. Explicitly a *post-mortem analysis*, not a signal.

### 9.5 Strategy Builder (P2)

- **FR-ST-1 (P2) — English → full strategy artifact.** From a plain-English strategy description, generate: ThinkScript study/strategy code, a scanner, watchlist columns, and a logic explanation.
- **FR-ST-2 (P2) — Backtest against personal history.** Cross-reference the described setup against the user's own journal to show historical outcomes (descriptive, not predictive).
- **FR-ST-3 (P2) — Save to library.** Strategy artifacts saved to the local library, linked to the originating description.

### 9.6 Research Assistant (P2)

- **FR-R-1 (P2) — NL questions over personal data.** Answer trading questions grounded in the user's own journal/trade data.
- **FR-R-2 (P2) — Historical condition search.** Search the journal for historical conditions matching a description.
- **FR-R-3 (P2) — Report generation.** Generate setup/performance reports from personal data.

### 9.7 Personal Knowledge Base / Workspace (P2)

- **FR-W-1 (P2) — Multi-format notes.** Text notes, screenshots, and voice notes (transcribed to text).
- **FR-W-2 (P2) — Natural-language search across everything.** One search box over notes, journal entries, scripts, and screenshots.
- **FR-W-3 (P2) — Cross-linking.** Notes link to trades, scripts, and strategies; the AI can traverse these links when answering.

### 9.8 Cross-cutting AI behavior (all surfaces)

- **FR-AI-1 — Always explain.** Every substantive answer includes *why / what / risk / alternatives* where applicable. "Market explanation" is **not** a separate mode — it is baked into every output.
- **FR-AI-2 — Cite the data.** When a claim derives from the user's data, the answer names the source ("based on your last 47 trades…").
- **FR-AI-3 — Density over verbosity.** Default to the shortest answer that's complete. Code block + 2-line reasoning, not 5 paragraphs.
- **FR-AI-4 — Never advise.** No "buy/sell" recommendations, no signals, no predictions. Analytical framing only.

---

## 10. Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-PERF-1 | Latency | Interactive AI responses begin streaming within 3s; if a task can't complete in <5s, show a productive loading state (skeleton/streaming), never a blank spinner. |
| NFR-PERF-2 | Latency | Fast completions (short edits, explanations of small snippets) routed to a fast model and target <2s first token. |
| NFR-PERF-3 | Local ops | Local DB queries (journal filters, library search) return in <200ms for up to 50k trades / 5k scripts. |
| NFR-PERF-4 | Startup | App cold start to interactive in <2s on a mid-range 2023 laptop. |
| NFR-PRIV-1 | Privacy | All trade, journal, note, and script data persists locally. No raw account/position data leaves the device without explicit per-action consent. |
| NFR-PRIV-2 | Privacy | AI calls send only user-constructed context (summaries, the specific code/question), never raw bulk account data by default. |
| NFR-PRIV-3 | Privacy | A visible, auditable log of what was sent to the AI provider on each call (transparency). |
| NFR-SEC-1 | Security | Local DB encrypted at rest (OS keychain-backed key). API keys stored in OS secure storage, never plaintext on disk. |
| NFR-SEC-2 | Security | All external calls over TLS. Provider API key never exposed to the renderer/frontend process. |
| NFR-REL-1 | Reliability | CSV import never silently drops a trade; unparsed rows are surfaced for manual handling. |
| NFR-REL-2 | Reliability | Generated ThinkScript passes static validation before display; on failure, auto-retry then flag. |
| NFR-COST-1 | Cost | Per-user monthly AI inference cost target <25% of subscription price; enforced via model routing and context trimming. |
| NFR-A11Y-1 | Accessibility | Full keyboard operability; respects OS reduced-motion; sufficient contrast in the dark theme. |
| NFR-PORT-1 | Portability | Windows and macOS at launch (TOS runs on both). Linux best-effort later. |
| NFR-OBS-1 | Observability | Local, privacy-preserving usage telemetry (opt-in), no trade content ever transmitted in telemetry. |

---

## 11. Monetization & Billing

### 11.1 Model

Flat-rate subscription. **No freemium for the full app** (freemium creates a "free forever" expectation among cost-conscious traders). A separate **free, no-signup ThinkScript web tool** exists purely as a top-of-funnel acquisition channel — distinct from the paid desktop product.

### 11.2 Tiers

| Tier | Price | Scope | Phase |
|---|---|---|---|
| ThinkScript Engineer | **$29/mo** | ThinkScript generation/debug/explain/library | MVP |
| Journal | **$49/mo** | + Trade journal, tagging, NL queries, analytics | V1 |
| Companion (full) | **$79/mo** | + Coach, Strategy Builder, Screenshot, Research, Workspace | V2 |
| Annual | **−20%** | Any tier billed annually (~$63/mo equivalent at Companion) | from MVP |
| Team / Prop firm | **$199/mo** | Up to 5 seats, shared library, team journal analytics | V2+ |
| Platform-expansion tiers | **$99–149/mo** | Multi-platform + real-time context | V3+ |

### 11.3 Billing requirements

- **FR-BILL-1** — Subscription management via a standard processor (Stripe). License validation on app launch + periodic re-check, with an offline grace period (≥7 days) so traders aren't locked out by transient connectivity.
- **FR-BILL-2** — Annual/monthly toggle, proration on upgrade, self-serve cancellation.
- **FR-BILL-3** — No usage-based pricing (variable bills create anxiety for this audience; flat fee is a business-expense line item).
- **FR-BILL-4** — Free web tool requires no account; conversion to paid uses the Journal feature as the upgrade hook.

### 11.4 Hard commitments (public)

**No ads. No selling or sharing of user data. Ever.** This is stated publicly and is a core trust commitment. Violating it ends the company with this audience.

### 11.5 Unit economics sanity check

- 2,000 users × $49/mo ≈ **$98K MRR (~$1.2M ARR)** — V1 target.
- 5,000 users × $79/mo ≈ **$395K MRR (~$4.7M ARR)** — V2 target.
- A real, fundable, profitable SaaS at these numbers, provided AI cost is held under NFR-COST-1.

---

## 12. Go-To-Market

### 12.1 Principle

Win **ThinkScript developers first.** They are the most technically capable, most vocal, highest-pain segment. If they trust APEX, they become the sales force.

### 12.2 Phases

**Pre-launch:**
- Ship a **free, no-signup ThinkScript generator** at a public URL. Paste English, get code.
- Publish 50+ documented example generations to r/thinkorswim, Twitter/X, and TOS forums.
- Instrument organic inbound and conversion intent before building the full desktop app.

**Launch:**
- Convert free-tool users to paid, using the Journal as the upgrade hook.
- Affiliate/sponsored reviews with 3–5 TOS-focused YouTube channels.
- Public GitHub repo of "APEX-generated ThinkScript" for credibility + SEO.
- Authentic Reddit engagement: answer ThinkScript questions, mention APEX naturally.

**Growth:**
- Prop-firm outreach (onboarding/training tool for juniors).
- Build in public on Twitter/X.
- Community Discord for sharing scripts and setups.

### 12.3 Anti-patterns (do NOT do)

- No Google Ads on "AI stock trading" (wrong audience, brutal CPCs, high churn).
- No cold email to generic "traders."
- No finance-influencer/"finance bro" deals (wrong demographic, no alignment).

---

## 13. Analytics & Success Metrics

### 13.1 North Star

**Weekly hours saved per active user** (self-reported + proxied by feature usage). The product exists to save traders time and prevent mistakes; this is the truest measure.

### 13.2 Activation / wedge metrics

- % of new users who generate a ThinkScript script they rate as "usable" within first session (**target ≥80%**).
- Free-tool → paid conversion rate.
- ThinkScript generation **correctness/usability rating** (thumbs up/down on output) — the single most important quality metric; target ≥90% usable.

### 13.3 Engagement / retention

- Weekly active traders; scripts generated per active user/week.
- Journal: trades imported, NL queries run, narratives viewed.
- Coach: behavioral insights viewed, rules defined.
- Month-3 retention (target ≥70% for paid).

### 13.4 Business

- MRR, ARR, churn, ARPU, CAC by channel, payback period.
- AI inference cost per active user (must stay under NFR-COST-1).

### 13.5 Trust / quality

- ThinkScript generation flag rate (user-reported "this is wrong").
- Support tickets per 100 users; data-import failure rate.

---

## 14. Risks & Mitigations

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | **TOS deprecation / Schwab migration.** TOS-as-standalone has an uncertain future; ThinkScript may not survive. | High | Build journal/coach/research as platform-agnostic from day one. ThinkScript is the hook, not the whole product. Maintain an import-adapter abstraction. |
| R2 | **No official TOS API; "living beside" integration is shallow.** Can't auto-read what the user is viewing. | High | Lean on CSV import + screenshot OCR. Investigate (legally) the unofficial mobile REST API and screen-capture OCR for V2+. Set honest expectations. |
| R3 | **Regulatory exposure.** Anything resembling advice triggers SEC/FINRA scrutiny. | High | Strictly analytical framing; no signals/recommendations; strong system-prompt guardrails; clear disclaimers; legal review (see §16). |
| R4 | **ThinkScript correctness bar is higher than Cursor's.** Wrong code → wrong signals → real money lost → blame. | High | Static validation pass + self-correction; "review before use" labeling; curated corpus; user feedback loop; never present as verified. |
| R5 | **Schwab/TOS Terms of Service** for screen-scraping / unofficial API use. | High | Legal review before building any screen-reading feature; prefer user-initiated CSV/screenshot flows that don't violate ToS. |
| R6 | **Data trust.** Any hint that positions are monetized = mass exodus. | High | Local-first architecture; transparent send-log; public no-data-selling commitment. |
| R7 | **Skeptical audience.** Pros distrust trading tools (burned by signal services). | Medium | Earn trust via demonstrable correctness, transparency, and a free tool that proves value before asking for payment. |
| R8 | **CSV edge cases** (multi-leg options, futures) break journal entries. | Medium | Never silently drop rows; surface unparsed trades; expand parser coverage iteratively. |
| R9 | **AI cost overruns.** | Medium | Model routing (fast model for cheap tasks), context summarization, caching; enforce NFR-COST-1. |
| R10 | **Big-lab vertical competitor.** | Medium | Build data + corpus + community moats in the 18–24 month window. |

---

## 15. Competitive Moat

The AI itself is a commodity; the UI and individual features are copyable. The durable moat is the combination of three time-bound assets:

1. **User-specific data accumulation (strongest).** After 12 months, APEX holds the trader's behavioral model, common setups, win conditions, failure modes, script library, and journal — none of it portable to a competitor. Switching cost compounds monthly (the Spotify-listening-history effect).
2. **ThinkScript corpus + domain expertise.** A curated, feedback-improved ThinkScript corpus + feature-specific prompting puts APEX years ahead of general AI on this narrow, high-value task.
3. **Community library sharing (opt-in).** Best scripts propagate through the community with APEX provenance → network effects: more users → better shared library → more value for all.

Underpinning all three: **trust with a skeptical audience.** Hard to win, extraordinarily sticky once earned. Start building all four from day one.

---

## 16. Regulatory & Legal Considerations

- **Not investment advice.** APEX is an analytical and educational tool. It must never recommend specific securities, entries, exits, or position sizes. Outputs are framed as analysis of the user's *past* behavior and data, or as code/education.
- **System-prompt guardrails.** Every AI surface enforces the non-advisory constraint at the prompt layer, with refusal behavior for "should I buy X?" style requests (redirect to analysis/education).
- **Disclaimers.** Clear, persistent disclaimers: not financial advice; generated code must be reviewed before use; past behavior is not predictive of future results.
- **Generated-code liability.** Never present generated ThinkScript as verified or safe. Always "review before use." Logic explanations help the user validate.
- **Data handling & privacy.** Local-first; a published privacy policy committing to no data sale; transparent AI send-log; encryption at rest.
- **Third-party ToS.** Legal review of Schwab/TOS Terms before any screen-reading/unofficial-API feature. Prefer user-initiated export/screenshot flows.
- **Jurisdiction.** Initial launch US-focused (TOS user base). Revisit international/regulatory posture before expanding.
- **One viral failure ends the company.** A single "APEX told me to buy X and I lost $20K" tweet is existential — which is *why* the non-advisory framing is a hard architectural constraint, not a soft guideline.

---

## 17. Out of Scope (explicitly)

- Order execution / brokerage functionality.
- Charting / market-data platform features (TOS owns these).
- Real-time signals, alerts to "buy/sell," or predictions.
- Pine Script → ThinkScript conversion (deferred indefinitely; high error rate).
- Voice notes as a first-class generation modality (transcription only, low priority).
- Mobile app at launch (desktop side-by-side with TOS is the core UX; mobile is a later companion at best).

---

## 18. Open Questions

1. **TOS CSV schema fidelity** — exact columns/format of current TOS trade export, especially for multi-leg options and futures. (Blocks FR-J-1 detail.)
2. **Unofficial TOS/Schwab API** — what, if anything, is legally usable for read-only context? (Affects R2/R5 and V3 scope.)
3. **ThinkScript corpus sourcing** — build vs. curate; licensing of community scripts used as few-shot examples.
4. **Screenshot OCR fidelity** — can we reliably read indicator values/levels off a TOS chart image, or only structural features?
5. **Free-tool abuse/cost** — rate-limiting and cost controls for an anonymous public ThinkScript generator.
6. **Encryption key custody** — pure OS-keychain vs. optional user passphrase for the local DB.

---

*See [`02-ARCHITECTURE.md`](02-ARCHITECTURE.md) for technical design, data models, internal APIs, AI layer, and integration specs. See [`03-ROADMAP.md`](03-ROADMAP.md) for the phased delivery plan, per-phase acceptance criteria, and the testing strategy (including ThinkScript correctness testing).*
