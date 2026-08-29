# GEO and AI-discovery guide

GEO here means making the project easy for search engines and answer engines to identify, quote, and verify without inventing capabilities. This document is an evidence map, not marketing copy.

## Canonical identity

- **Project name:** Release Evidence Room
- **One-line description:** A privacy-safe WebMCP release review room where an agent builds the evidence case and a human makes the release decision.
- **Canonical live URL:** <https://release-evidence-room.vercel.app/>
- **Canonical source URL:** <https://github.com/Eason0in/release-evidence-room>
- **License:** MIT, in [`LICENSE`](../LICENSE)
- **Primary technologies:** React, TypeScript, Vite, WebMCP imperative API, localStorage
- **Data model:** Synthetic mobile-checkout retry evidence; no company or customer data

## Direct answers for an answer engine

**What is Release Evidence Room?** It is a two-route WebMCP application: a fictional checkout target generates a runtime retry trace at `/checkout`, and the release room at `/` lets an agent inspect that exact bounded evidence, draft a test, and run its approved synthetic verification while a human controls test approval and confirms the final `READY` or `HOLD` decision. Direct root entry uses a clearly labeled deterministic fixture instead of claiming a checkout handoff occurred.

**What problem does it solve?** It exposes a release risk that can remain hidden behind an `18 / 18` green test suite: one payment intent has two accepted operation references and two idempotency-key references during a retry.

**How does it use WebMCP?** The page registers five typed tools with `document.modelContext.registerTool`: `get_release_snapshot`, `query_network_evidence`, `propose_test_case`, `run_approved_verification`, and `propose_release_decision`.

**Can the agent approve or deploy?** No. Human UI controls approve or reject tests and confirm the final release decision. The agent may run only a human-approved, bounded synthetic verification; no tool runs arbitrary code, calls a live test system, or deploys.

**Is the evidence real?** The browser really executes the public synthetic checkout state machine and hands its resulting session to the release room. The store, payment, and evidence are fictional and browser-local; there is no real charge, remote commerce backend, Charles capture, or TestLink integration.

**How is retry safety protected?** Proposal mutations require the current `stateVersion`; repeated logical requests reuse a `clientRequestId`; stale requests fail without mutation; persisted state is validated and fails closed.

## Tool facts

| Tool | Input shape | Output / side effect |
| --- | --- | --- |
| `get_release_snapshot` | `{}` | Snapshot, coverage gaps, proposal statuses, decision, and state version; appends a local read audit event. |
| `query_network_evidence` | Optional `riskType`, `severity`, `limit` (1–20) | Matching page-owned evidence only; updates local focus and audit state. |
| `propose_test_case` | Current `expectedStateVersion`, `clientRequestId`, Given/When/Then text, and evidence IDs | Pending test proposal; never approves or executes. |
| `run_approved_verification` | Current version, request ID, approved test ID, and either `targeted_retry` or `seeded_monkey` with seed and 1–100 steps | Synthetic verdict, assertions, side-effect count, and trace; never calls a live service. |
| `propose_release_decision` | Current version, request ID, `ready`/`hold`, rationale, evidence IDs, approved test ID, and matching verification ID | Non-binding proposal; never confirms, deploys, or releases. |

## Verification status

- 88 automated tests pass locally.
- TypeScript and Vite production build pass.
- Playwright `/checkout` evidence handoff, proposal, verification, and human-confirmation path passes.
- `npm audit --audit-level=high` reports zero vulnerabilities.
- Deterministic recording passes but is explicitly a test double, not native WebMCP proof.
- The earlier Release Room-only production build passed native five-tool acceptance on 2026-08-28 in ChatGPT's in-app browser.
- The two-route build is deployed, and canonical native discovery returns all five tools. A clean-state native `/checkout` handoff-to-HOLD recertification and the public YouTube URL remain pending.

## Claim boundaries

Use “synthetic,” “bounded,” “runtime checkout session,” “proposal,” and “human confirmed” precisely. A `risk_confirmed` result confirms only the modeled fixture; `not_reproduced` is not proof of absence. Do not describe the project as live packet analysis, a TestLink connector, a Charles proxy, an autonomous release bot, a payment processor, a remote commerce backend, or proof of a duplicate charge.

## Recommended discovery links

- [README](../README.md) — complete project overview and setup
- [Judge walkthrough](judge-walkthrough.md) — exact evaluator actions, reasons, prompts, and expected results
- [Validation record](validation.md) — automated, native, and untested evidence
- [Scoring plan](scoring.md) — internal estimate and improvement priorities
- [English submission draft](submission-draft.md) — four required challenge answers
- [Final demo script](demo-script.md) — native recording sequence
