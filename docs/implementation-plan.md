# Release Evidence Room delivery plan

## Outcome

Ship a public, no-login, two-route WebMCP demo where a fictional checkout target generates a runtime retry trace and a release owner plus agent inspect that exact synthetic evidence. The agent may query evidence, draft proposals, and run a human-approved bounded synthetic verification; only the human may approve a test case or confirm a Ready/Hold decision.

## Fixed scope

- React, Vite, TypeScript; localStorage only.
- One synthetic mobile checkout release. Automated tests are 18/18 green, while bounded privacy-safe network evidence reveals an exactly-once/idempotency risk during payment retry.
- Five WebMCP tools: `get_release_snapshot`, `query_network_evidence`, `propose_test_case`, `run_approved_verification`, and `propose_release_decision`.
- Mutation tools require `stateVersion` for optimistic concurrency and `clientRequestId` for idempotent retries.
- Verification supports exact retry replay and deterministic seeded state-machine exploration capped at 100 steps, using only page-owned synthetic evidence.
- No login, upload, live TestLink/Charles connection, company data, raw host/path/query/header/body/cookie/address/timestamp/file path, deploy action, or autonomous approval.

## Vertical slices

1. Evidence core
   - RED: green tests do not hide unresolved high-risk evidence; network queries return only bounded opaque evidence.
   - GREEN: immutable demo state plus pure snapshot/query functions.
   - Verify: Vitest domain suite.
2. Proposal inbox
   - RED: duplicate request IDs and stale state versions are safely handled; human actions are audited.
   - GREEN: pure proposal and review transitions persisted through one localStorage adapter.
   - Verify: Vitest transition and persistence suites.
3. Approved verification
   - RED: unapproved tests cannot run; exact replay and seeded monkey results are deterministic, bounded, attributed, and required by release decisions.
   - GREEN: one pure synthetic verifier with strategy-specific inputs, assertions, verdicts, traces, and persisted result links.
   - Verify: domain, workflow, and persistence suites.
4. WebMCP boundary
   - RED: exactly five strict schemas register; unsupported browsers preserve UI behavior; malformed inputs fail closed.
   - GREEN: thin adapter over the same application functions used by the UI.
   - Verify: adapter tests with a minimal fake `document.modelContext`.
5. Judge-ready page
   - RED: the under-three-minute path generates and exposes the hidden risk, drafts and verifies a regression test, and leaves the final Hold decision to a human.
   - GREEN: release header, coverage, evidence explorer, proposal inbox, and activity timeline.
   - Verify: component tests, Playwright happy path, production build, and manual WebMCP smoke in a supported browser.

## Acceptance criteria

- A judge can understand the release state and the human/agent boundary without instructions.
- The agent finds a high-severity retry/idempotency risk despite 18/18 passing tests.
- Repeating a proposal call with the same `clientRequestId` creates no duplicate.
- A stale `stateVersion` creates no mutation and returns the current version.
- An unapproved test cannot execute; a fixed monkey seed produces the same bounded trace and verdict.
- A decision must link to an approved test and one of its verification results; `READY` requires `not_reproduced`.
- No tool can approve, reject, deploy, or modify source evidence.
- Every accepted/rejected human action appears in the activity timeline.
- The page works without WebMCP and registers exactly five tools when WebMCP is available.
- Unit tests, Playwright, TypeScript, and production build pass with clean output.

## Challenge delivery gates

- Public source: publish `Eason0in/release-evidence-room` with the MIT license visible, complete instructions, and timestamped public history.
- Production: deploy the static app to Vercel and verify its URL, UI, security headers, and WebMCP discovery.
- Native runtime: use ChatGPT's in-app browser or Chrome 149+ with the WebMCP flag enabled to discover and execute all five tools.
- Demo: record a public English-audio YouTube video under three minutes showing native WebMCP, the proposal boundary, human confirmation, and the audit trail. The local Playwright recording is only a deterministic integration artifact.
- Submission: keep the Devpost entry as a draft until the live URL, public repository, public video, and English text are all rechecked.

Real Charles/TestLink data and integrations remain outside this entry. The synthetic fixture is enough to demonstrate the WebMCP interaction while keeping company traffic, credentials, and customer data out of the public project.
