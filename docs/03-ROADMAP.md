# Project APEX — Phased Delivery Plan, Acceptance Criteria & Testing Strategy

**Document type:** Delivery & QA plan
**Companion to:** [`01-PRD.md`](01-PRD.md) (product), [`02-ARCHITECTURE.md`](02-ARCHITECTURE.md) (technical)
**Status:** Draft v1.0
**Last updated:** 2026-06-26

> Phases are sequenced by *strategic leverage*, not feature count. Each phase ships only when its acceptance criteria pass. The rule: **do not start the next phase until the current phase's wedge quality bar is met.** ThinkScript correctness gates everything.

---

## 1. Delivery Philosophy

1. **One thing, excellent, first.** MVP is ThinkScript only. It must be genuinely better than hand-coding or generic AI before anything else is built.
2. **Validate demand before building the heavy app.** The free web ThinkScript tool ships *before* the full desktop app and measures real conversion intent.
3. **Quality gate over date.** A phase's exit criteria are correctness/usability thresholds, not a calendar.
4. **Platform-agnostic from day one.** Journal/coach are built on the import-adapter abstraction even while only TOS is supported.
5. **Each phase is independently sellable.** Pricing rises as scope grows ($29 → $49 → $79).

---

## 2. Phase Overview

| Phase | Name | Scope | Price | Target users | Exit gate (headline) |
|---|---|---|---|---|---|
| **MVP** | The ThinkScript Engineer | ThinkScript generate/explain/debug/refactor/library | $29/mo | 500 paid | ≥90% generations rated usable |
| **V1** | The AI Journal | TOS CSV import, tagging, NL queries, narratives, analytics | $49/mo | 2,000 paid | 0 silent-drop imports; NL query accuracy bar |
| **V2** | The Trading Companion | Coach, Strategy Builder, Screenshot, Research, Workspace | $79/mo | 5,000 paid | Behavioral insight precision bar; full desktop side-panel |
| **V3–V4** | Platform Expansion | Live context (OCR/screen), TradeStation/NinjaTrader/IBKR, team tier | $99–149/mo | 15,000+ | Multi-platform import parity; legal-cleared live context |
| **V5** | The Intelligence Layer | Platform-agnostic, public API, institutional tier | — | — | Stable API; institutional onboarding |

---

## 3. Phase 0 — Pre-Launch (Free Web Tool + Foundations)

**Goal:** prove the wedge and build the quality machinery before the desktop app.

### Deliverables
- **Free public ThinkScript generator** (`web-tool/`): paste English → get validated ThinkScript. No signup, rate-limited, anonymous, stateless. (PRD §12, Arch §11)
- **AI layer core:** prompt registry, model router, and — critically — the **ThinkScript static validation layer** (Arch §8.4).
- **ThinkScript correctness test corpus** (see §8 below) — built first, because it defines "done" for the wedge.
- **Curated ThinkScript few-shot corpus** seed (Arch §8.7).

### Acceptance criteria
- [ ] Web tool generates ThinkScript for 50 documented benchmark prompts; **≥90% pass static validation** on first or self-corrected attempt.
- [ ] Validator rejects known-bad ThinkScript (negative test set) with **0 false "validated" passes** on the corpus.
- [ ] Every generation labeled "Review before use" (regulatory, PRD §16).
- [ ] Rate-limiting + per-IP cost cap enforced (PRD §18.5).
- [ ] Organic-inbound + conversion-intent instrumentation live (telemetry, no PII).

### Go/no-go to MVP
Proceed only if the web tool shows real organic pull (community sharing, repeat usage) **and** the ≥90% usability bar holds on the benchmark corpus.

---

## 4. Phase MVP — "The ThinkScript Engineer"

**Scope (P0 features):** FR-TS-1…7, FR-TS-10, plus cross-cutting FR-AI-1/3/4.

### Build
- Tauri desktop shell (Arch §3), dark side-panel UI (Arch §13), Monaco + ThinkScript language def.
- `ts.generate / explain / debug / refactor / refine` commands streaming (Arch §6.1).
- Local script library + NL search (`ts.library.*`, embeddings) (FR-TS-6).
- Licensing/billing (Stripe), $29/mo, annual −20% (FR-BILL-1/2).
- SQLCipher DB, keychain, `ai_send_log` transparency (Arch §9).

### Acceptance criteria
- [ ] **Wedge quality:** ≥90% of generations on the correctness corpus rated "usable" (thumbs-up proxy + manual review). *This is the gate for the whole product.*
- [ ] Debug flow: given a broken script + TOS error, produces corrected code with an explained diff for ≥85% of the debug test set.
- [ ] Refinement loop: multi-turn edits modify existing code in-context with a visible diff and change note (FR-TS-5).
- [ ] Library NL search returns the intended script in top-3 for ≥90% of "describe what it does" queries.
- [ ] First-token latency: fast tasks <2s, complex tasks streaming <3s (NFR-PERF-1/2).
- [ ] Every generation labeled "Review before use"; no advisory output passes guardrails (PRD §16).
- [ ] DB encrypted at rest; API key never in renderer; send-log viewable (Arch §9).
- [ ] **Business:** path to 500 paying users validated (conversion from free tool).

### Cut from MVP (explicit)
Pine→ThinkScript conversion, watchlist columns (→V2), journal, coach, screenshots, research, workspace.

---

## 5. Phase V1 — "The AI Journal"

**Scope (P1):** FR-J-1…5, FR-J-7/8, FR-TS-8 (scanner gen), cross-cutting FR-AI-2 (citations).

### Build
- `ImportAdapter` trait + `TosCsvAdapter` (Arch §7.1) — **confirm real TOS export schema first** (PRD §18.1).
- Auto-tagging/categorization (fast-model classification) (FR-J-2).
- NL → structured query engine over the local trade DB (FR-J-3).
- AI trade narratives + behavioral flags (FR-J-4).
- Win-rate analytics with precomputed slices (FR-J-5, Arch §10).
- Journal timeline UI + trade detail + insights sidebar (Arch §13.4).
- Price → $49/mo.

### Acceptance criteria
- [ ] **Import integrity:** across the import test set (equities + single-leg options), **zero silently dropped trades**; all unparsed rows surfaced for manual handling (NFR-REL-1).
- [ ] Dedupe: re-importing the same file creates 0 duplicate trades.
- [ ] NL query accuracy: ≥90% of benchmark NL queries produce the correct structured filter / trade set.
- [ ] Narratives: factually consistent with the underlying trade record (0 fabricated numbers in narrative test set — verified against source rows).
- [ ] Analytics correctness: computed win-rate/expectancy slices match an independent reference calculation exactly.
- [ ] Local query latency <200ms at 50k trades (NFR-PERF-3).
- [ ] Citations present whenever a claim derives from user data (FR-AI-2).
- [ ] **Business:** 2,000 paying users trajectory.

---

## 6. Phase V2 — "The Trading Companion"

**Scope (P2):** FR-C-* (Coach), FR-ST-* (Strategy), FR-S-* (Screenshot), FR-R-* (Research), FR-W-* (Workspace), FR-J-6 (similarity), FR-TS-9 (columns).

### Build
- Coach: behavioral pattern detection, fingerprint, longitudinal tracking, rule-violation detection (Arch §5.3).
- Strategy Builder: English → code + scanner + columns + explanation; history cross-reference (FR-ST-1/2).
- Screenshot analysis pipeline (OCR + vision) (Arch §7.2).
- Research assistant grounded in personal data; report generation (FR-R-*).
- Workspace: notes/voice-transcript/screenshot, unified NL search, cross-linking (FR-W-*).
- Full desktop side-by-side UX polish.
- Price → $79/mo; **Team/Prop tier $199/mo** (shared library + team analytics).

### Acceptance criteria
- [ ] **Coach precision:** behavioral insights are quantified + cited; on the labeled behavior test set, pattern detection precision ≥85% (avoid false "you revenge-trade" accusations — trust-critical).
- [ ] All coach output is past-behavior analysis only; **0 advisory statements** pass the guardrail audit (PRD §16).
- [ ] Strategy Builder artifacts (code/scanner/columns) all pass ThinkScript static validation (Arch §8.4).
- [ ] Screenshot analysis: correctly identifies visible indicators/structure on ≥80% of the chart-image test set; framed as post-mortem, never signal (FR-S-4).
- [ ] Similarity search returns relevant analog trades (manual relevance review ≥80% top-5).
- [ ] Workspace NL search spans notes+journal+scripts in one query (FR-W-2).
- [ ] **Business:** 5,000 paying users trajectory.

---

## 7. Phases V3–V5 — Expansion (summary)

**V3–V4 (Platform Expansion):**
- Live TOS context: screen-capture + OCR pipeline (Arch §7.4) — **gated on legal review (R5)** and OCR fidelity (PRD §18.4).
- Additional import adapters: TradeStation, NinjaTrader, IBKR (Arch §7.1).
- Prop-firm team features mature; price $99–149/mo.
- **Exit gate:** multi-platform import parity with TOS; live context legally cleared and reliable, or shipped as clearly-labeled best-effort.

**V5 (Intelligence Layer):**
- Platform-agnostic positioning; public API for third-party integration; institutional tier.
- **Exit gate:** stable external API; institutional onboarding + support model.

---

## 8. Testing Strategy

Testing is organized around the product's single biggest risk: **wrong ThinkScript costs traders money** (R4). The ThinkScript correctness suite is the most important test asset in the codebase.

### 8.1 ThinkScript Correctness Suite (highest priority — built in Phase 0)

The definition of "done" for the wedge feature. Components:

1. **Benchmark prompt set (≥50, growing).** Curated English→ThinkScript prompts with known-good reference implementations, spanning studies, scanners, alerts, and common indicator patterns (VWAP, EMA crosses, volume-relative coloring, momentum).
2. **Static-validation gate (automated).** Every generated script must pass the validator (Arch §8.4): balanced structure, valid built-ins, correct `plot`/`def`/`input`/`rec` usage, no reserved-word misuse. CI-enforced.
3. **Negative test set.** Known-broken ThinkScript that the validator MUST reject. Target: **0 false-positive "validated" passes.**
4. **Usability rating.** Human-in-the-loop review (and live thumbs-up/down telemetry) → the headline ≥90% "usable" metric (PRD §13.2). Regression-tracked across prompt-registry versions.
5. **Self-correction test.** Inject validation failures; assert the bounded retry loop recovers within the retry budget (Arch §8.4 step 2).
6. **Regression harness.** Every prompt-registry/model change re-runs the full corpus; the usable-rate must not regress below the gate.

> **Hard rule:** no prompt or model change ships if it drops the corpus usable-rate below 90% or introduces any false-positive validator pass.

### 8.2 Import / Data-Integrity Tests (V1)

- Golden TOS CSV fixtures (equities, single-leg options, multi-leg, futures, malformed rows).
- Assertion: **every source row → exactly one of {ok, partial, unparsed}; none dropped** (NFR-REL-1).
- Dedupe idempotency: re-import → 0 duplicates.
- Round-trip P&L: sum of imported trade P&L matches the source export total within rounding.

### 8.3 AI Output Correctness Tests (V1+)

- **Narrative fidelity:** generated narratives are checked against source trade rows; **0 fabricated numbers** allowed in the test set.
- **Analytics reference check:** win-rate/expectancy slices vs. an independent reference implementation — must match exactly.
- **NL-query accuracy:** benchmark questions → expected structured filters / result sets (≥90%).

### 8.4 Guardrail / Regulatory Tests (all phases)

- **Advisory-refusal set:** "should I buy X?", "what should I trade?", "give me a signal" → must redirect to analysis/education, never recommend (PRD §16).
- **Output post-filter:** scan generated text for recommendation-shaped language; 0 leaks in the audit set.
- These run in CI on every prompt change.

### 8.5 Security & Privacy Tests

- **Secret isolation:** assert the renderer process has no access to the API key or DB key (Arch §4).
- **Encryption at rest:** DB unreadable without the keychain-held key.
- **Send-log completeness:** every provider call produces an `ai_send_log` row; no un-logged egress (NFR-PRIV-3).
- **Payload minimization:** context-builder outputs contain summaries, not raw bulk data (NFR-PRIV-2) — asserted on representative inputs.

### 8.6 Behavioral-Detection Precision Tests (V2)

- Labeled trade sequences with known behavioral patterns (FOMO, revenge, chasing).
- Assertion: detection precision ≥85% (false accusations are trust-destroying).

### 8.7 Performance Tests

- First-token latency (fast <2s, complex <3s) — NFR-PERF-1/2.
- Local query latency <200ms @ 50k trades — NFR-PERF-3.
- Cold start <2s — NFR-PERF-4.
- Per-user inference cost tracked vs. NFR-COST-1 (<25% of subscription).

### 8.8 Standard Engineering Tests

- Unit tests on domain services; integration tests on Tauri commands; migration tests against populated fixture DBs; E2E smoke on critical flows (generate → save → search; import → query → narrative).

### 8.9 Test Gating Summary

| Gate | Threshold | Blocks |
|---|---|---|
| ThinkScript usable-rate | ≥90% | All releases |
| Validator false-positives | 0 | All releases |
| Import silent drops | 0 | V1+ releases |
| Narrative fabricated numbers | 0 | V1+ releases |
| Advisory leaks | 0 | All releases |
| Behavioral precision | ≥85% | V2+ releases |

---

## 9. Cross-Phase Dependencies & Sequencing Notes

- **Validator before wedge.** The ThinkScript validation layer (Arch §8.4) and its corpus (§8.1) are Phase 0 — they define the MVP exit gate.
- **TOS CSV schema before V1 parser.** Resolve PRD §18.1 (real export schema) before locking `TosCsvAdapter`.
- **Legal review before any screen-reading.** R5 / PRD §18.2 gates V3 live-context work — not a launch dependency.
- **Adapter abstraction from V1.** Even with only TOS, build journal on `ImportAdapter` so V3 multi-platform is additive (R1).
- **Corpus feedback loop from MVP.** Thumbs-up/down wiring ships in MVP so the ThinkScript corpus (moat asset #2) compounds from day one.

---

## 10. Definition of Done (per phase)

A phase is done when:
1. All in-scope `FR-*` are implemented and demoed.
2. All phase acceptance criteria (§§4–7) pass.
3. All applicable test gates (§8.9) are green in CI.
4. The non-advisory guardrail audit passes (PRD §16).
5. Pricing/billing for the tier is live and validated (where applicable).
6. The phase's business trajectory metric is being measured (PRD §13).

---

*Product rationale and feature definitions: [`01-PRD.md`](01-PRD.md). Technical design and component specs: [`02-ARCHITECTURE.md`](02-ARCHITECTURE.md).*
