# Project APEX — Documentation Index

**APEX — The AI-Native Trading Companion for Thinkorswim**

The AI intelligence layer that lives beside Thinkorswim. TOS executes; APEX writes the ThinkScript, remembers every trade, and helps the trader get better over time. Cursor-for-VS-Code, but for the serious TOS trader. Analytical, never advisory. Local-first. Workflow, not predictions.

---

## Read in this order

| # | Document | What it answers | Primary audience |
|---|---|---|---|
| 1 | [`01-PRD.md`](01-PRD.md) | **What** APEX is and **why** — vision, market, personas, features, monetization, GTM, risks, legal | Founders, PM, design, eng |
| 2 | [`02-ARCHITECTURE.md`](02-ARCHITECTURE.md) | **How** it's built — stack, data model, internal APIs, AI layer, integrations, security, design system | Engineers, AI coding agents |
| 3 | [`03-ROADMAP.md`](03-ROADMAP.md) | **When & in what order** — phased delivery, acceptance criteria, testing strategy | Eng leads, QA, PM |

---

## The one-paragraph thesis

Professional traders spend most of their day on cognitive work AI is now good at — writing ThinkScript, journaling, reviewing trades, finding behavioral patterns, explaining charts — and almost all of it is still manual. APEX automates and accelerates that workflow. The **wedge** is AI ThinkScript generation/debugging (genuinely hard, TOS-specific, no good AI support today). The **durable business** is the journal + behavioral-coach layer that accumulates a private, irreplaceable model of each trader. We compete on **workflow, not predictions** — which is defensible; prediction is not.

## The four non-negotiables

1. **Local-first data** — trade/position data never leaves the device by default. Trust is existential.
2. **Analytical, never advisory** — no signals, no "buy X." Regulatory + trust requirement.
3. **Correctness over cleverness** — generated ThinkScript passes a static-validation gate and is always labeled "review before use." Wrong code costs real money.
4. **Platform-agnostic core** — TOS is the first integration target, not a permanent dependency (Schwab migration risk).

## Phase map (at a glance)

```
Phase 0  Free web ThinkScript tool + validator + correctness corpus   (prove the wedge)
MVP      The ThinkScript Engineer        $29/mo   →  500 paid
V1       The AI Journal                  $49/mo   →  2,000 paid
V2       The Trading Companion           $79/mo   →  5,000 paid
V3–V4    Platform Expansion              $99–149  →  15,000+
V5       The Intelligence Layer          (API + institutional)
```

## The single gate that controls everything

**ThinkScript generations must be ≥90% usable, with 0 false-positive validator passes.** No prompt or model change ships if it drops below this bar. (See [`03-ROADMAP.md`](03-ROADMAP.md) §8.)

## Open questions blocking detail (see PRD §18)

1. Exact current TOS CSV export schema (blocks the V1 parser).
2. What, if any, unofficial TOS/Schwab read-only API is legally usable (gates V3 live context).
3. ThinkScript corpus sourcing/licensing.
4. Screenshot OCR fidelity for chart values vs. structure.
5. Free-tool abuse/cost controls.
6. Local-DB key custody (OS keychain only vs. optional user passphrase).

---

*Status: foundational draft v1.0 · 2026-06-26 · Next step is engineering planning off these three docs, starting with the Phase 0 validator + ThinkScript correctness corpus.*
