# Release Evidence Room

**A privacy-safe WebMCP release review room where an agent builds the evidence case and a human makes the release decision.**

> **Runtime scenario:** the public Checkout QA Sandbox generates a response-loss retry trace, then hands that exact browser-local session to the Release Evidence Room. **Repository verification:** 88 automated tests pass. **Deployment status:** the two-route build is live; production-native discovery has been rechecked, while a clean-state native checkout-to-HOLD recertification remains pending.

Release Evidence Room is a two-route React and TypeScript WebMCP demo for a realistic release-engineering problem: a green test suite can still hide a payment-retry risk. The public `/checkout` route is a fictional test target that generates a real runtime trace without an account, card, backend, or payment. It writes a versioned synthetic evidence session that the release room at `/` then reads. The agent can inspect that bounded evidence, draft proposals, and—only after human approval—run the approved scenario inside the same checkout model. Only the human can approve a test proposal or confirm the final `READY` / `HOLD` decision.

The fixture is deliberately synthetic. It models a mobile checkout retry where one payment intent has two accepted operation references and two idempotency-key references. That is evidence of a release risk, not proof of a duplicate charge.

## Public resources

| Resource | Link | Status |
| --- | --- | --- |
| Live application | <https://release-evidence-room.vercel.app/> | Two-route production build is deployed |
| Checkout QA Sandbox | <https://release-evidence-room.vercel.app/checkout> | Live fictional test target; no account, card, backend, or real payment |
| Judge walkthrough | [docs/judge-walkthrough.md](docs/judge-walkthrough.md) | Exact actions, reasons, prompts, and expected results |
| Source repository | <https://github.com/Eason0in/release-evidence-room> | Public MIT-licensed source |
| Demo video | YouTube link pending final native-WebMCP capture | Local integration preview is not submission evidence |
| Challenge | [OpenAI WebMCP Challenge](https://openai.com/webmcp-challenge/) | Submission materials are English |

The live URL and repository are the canonical project resources. `demo-output/` is intentionally ignored by Git so local recordings and generated audio do not become repository assets.

## What the project does

1. Runs a controlled payment response-loss scenario on the public `/checkout` test target.
2. Demonstrates the safe baseline (same key → one operation) or the risky retry (new key → two operations).
3. Sends that exact checkout session into the Release Evidence Room through validated, browser-local storage.
4. Shows the linked release candidate with `18 / 18` automated tests passing and the runtime trace beside it.
5. Lets a WebMCP-capable agent query the bounded evidence and identify the missing exactly-once coverage.
6. Lets the agent draft an evidence-linked regression test for human approval.
7. After approval, runs an exact retry replay and an optional seeded, bounded state-machine monkey check against the checkout model and imported session evidence.
8. Requires the resulting verification ID before the agent can draft a non-binding `READY` / `HOLD` recommendation.
9. Keeps test approval and the final release decision in the human UI and records every action in a versioned audit trail.

The product moment is the mismatch between **green tests** and **unproven retry safety**. The agent speeds up evidence synthesis; the human retains accountability.

## Human-agent boundary

| Capability | Agent | Human |
| --- | ---: | ---: |
| Read release snapshot | Yes | Yes |
| Query bounded network evidence | Yes | Yes |
| Draft an evidence-linked test | Yes | Yes |
| Approve or reject a test | No | Yes |
| Run an approved synthetic verification | Yes, only after approval | Controls the approval gate |
| Draft `READY` / `HOLD` | Yes | Yes |
| Confirm the release decision | No | Yes |
| Execute code or call a live test system | No | No tool exists |
| Deploy or release | No | No tool exists |

Every agent proposal and verification request requires the current `expectedStateVersion`; retries also require a reusable `clientRequestId`. A stale version returns `state_conflict` without a versioned mutation. Snapshot and evidence-query calls instead append audit/focus state without advancing `stateVersion`. Replaying the same request ID returns the original result without creating a duplicate proposal or verification. Once a human confirms a decision, a second confirmation is rejected fail-closed.

## WebMCP tools

The page registers exactly five imperative tools through `document.modelContext.registerTool` when the host supports WebMCP. Every input has a strict JSON schema with `additionalProperties: false` and an independent runtime parser.

| Tool | What it does | Important boundary |
| --- | --- | --- |
| `get_release_snapshot` | Reads release metadata, test counts, coverage gaps, proposal statuses, decision, and `stateVersion`. | Adds a local audit entry; does not change release state. |
| `query_network_evidence` | Filters only the page-owned synthetic evidence by `riskType`, `severity`, and bounded `limit` (maximum 20). | Never fetches URLs or returns raw traffic. |
| `propose_test_case` | Creates a pending evidence-linked regression-test proposal. | Cannot approve or execute the test. |
| `run_approved_verification` | Executes the approved scenario as either `targeted_retry` or deterministic `seeded_monkey` (maximum 100 steps) in the page-owned synthetic sandbox. | Requires human approval; never calls a URL, live service, Charles, TestLink, or arbitrary code. |
| `propose_release_decision` | Creates a non-binding `READY` or `HOLD` recommendation linked to an approved test and its verification result. | `READY` requires `not_reproduced`; neither verdict proves the absence of a real-world bug. Cannot confirm, deploy, or release. |

The first two tools intentionally use `readOnlyHint: false` because their visible result also updates local focus and the audit trail. Unsupported browsers retain the complete human UI; they simply do not register WebMCP tools.

## Architecture

```text
Public /checkout target ─> deterministic checkout state machine ─> validated evidence session ─┐
                                                                                                 │
WebMCP-capable agent ─┐                                                                           v
                      ├─> strict tool adapter ─> pure release transitions ─> versioned localStorage
Human release owner ──┘             │             │                        │
                                    │             └─ bounded verifier      └─ attributed audit trail
                                    └─ imported checkout evidence
```

The React UI and WebMCP adapter call the same domain functions. Persistence validates both structure and cross-field consistency, then falls back to the deterministic fixture if saved state is malformed or logically inconsistent.

## Run locally

Requirements: Node.js 22.13 or newer.

```bash
npm ci
npm run dev
```

Open the printed URL. The ordinary UI works in a modern browser. WebMCP works in ChatGPT's in-app browser or in Chrome 149+ with `chrome://flags/#enable-webmcp-testing` enabled and the browser relaunched.

## Verify the project

```bash
npm test
npm run build
npm run test:e2e
npm audit --audit-level=high
```

Current local evidence:

- 88 Vitest tests pass across the checkout state machine, evidence handoff, domain, verifier, persistence, components, WebMCP handlers, and the Inworld helper.
- TypeScript and the Vite production build pass.
- The Playwright `/checkout` → evidence handoff → five-tool proposal → human-confirmed `HOLD` path passes.
- The dependency audit reports zero high-severity vulnerabilities.
- `npm run demo:record` records a deterministic Playwright integration path. Its watermark explicitly says it is not native WebMCP evidence.

See [the validation record](docs/validation.md) for the separation between automated, native, and intentionally untested behavior.

## Native WebMCP acceptance

**Current two-route status: deployed; clean-state native recertification pending.** On 2026-08-28, the canonical production URL returned both routes, registered exactly five tools in ChatGPT's in-app browser, preserved the prior v2 HOLD and audit through migration, and blocked a new checkout handoff from overwriting that active review. A fresh browser-local checkout-to-HOLD rerun is still required before claiming complete two-route native acceptance.

The earlier Release Room-only build passed the remaining native tool-flow checks on 2026-08-28:

1. Discovery returned exactly the five tool names listed above.
2. Verification was rejected before the human approved `P-017`.
3. `targeted_retry` produced `V-001` with `risk_confirmed`, two steps, different retry keys, and two modeled side effects.
4. `seeded_monkey` with seed `37` and `maxSteps: 20` produced `V-002` with `risk_confirmed` after four steps.
5. A `READY` proposal linked to a confirmed risk was rejected; a verification-linked `HOLD` remained pending until the human confirmed it.
6. Exact request replay returned the original result without duplication, and a stale state version returned `state_conflict` without mutation.
7. Reload restored state version `18`, the human `HOLD`, and both verification results; the browser reported zero console errors.

The historical production run also rejected the out-of-bounds input `maxSteps: 101`. See [the validation record](docs/validation.md) for the exact separation between current deployment checks, historical native evidence, automated evidence, and the remaining recertification step. The final public YouTube demo remains pending.

## Demo and voiceover assets

- [100-second final demo script](docs/demo-script.md)
- [English narration text](docs/demo-narration.txt)
- [English submission draft](docs/submission-draft.md)
- `npm run demo:record` — deterministic local integration recording only
- `npm run demo:tts:inworld` — optional local Inworld WAV generation; the API key is read from `INWORLD_API_KEY` and never committed

The final challenge video must be an English-audio, public YouTube video under three minutes that shows the real WebMCP-capable browser/agent interaction, the proposal boundary, human confirmation, and the audit trail. The local integration recording is for regression review and is not a substitute for that native capture.

## Privacy, scope, and limitations

- All evidence is synthetic and privacy-safe.
- No company, customer, student, TestLink, Charles, credential, or live production data is included.
- No authentication, uploads, analytics, remote traffic fetching, live TestLink connection, or live Charles connection exists.
- Evidence exposes opaque references only; it does not expose raw hosts, paths, queries, headers, bodies, cookies, addresses, timestamps, or local file paths.
- Verification is limited to a deterministic, page-owned synthetic ledger. There is no arbitrary-code, live-system test-execution, or deployment tool and no autonomous approval path.
- The public Checkout QA Sandbox and Release Evidence Room share browser-local state on the same origin. This is a real demo integration, but it is not a remote commerce backend or production payment system.
- Same-browser tabs adopt storage events, but simultaneous same-version writers are not serialized. Use one Release Room writer during a review; multi-user concurrency remains out of scope.
- Opening `/` directly uses a clearly labeled deterministic fixture. A `CHECKOUT RUNTIME` label appears only after a completed `/checkout` session is handed off. An in-progress review cannot be silently replaced.
- `risk_confirmed` means the bounded fixture reproduced the modeled failure; `not_reproduced` means only that the bounded run did not reproduce it. Neither is a universal correctness claim.
- The project does not claim packet capture or packet-content analysis; the fixture represents already-sanitized page-owned evidence.

## Challenge materials

- [Judge walkthrough](docs/judge-walkthrough.md)
- [Implementation and acceptance plan](docs/implementation-plan.md)
- [Validation record](docs/validation.md)
- [Scoring and improvement plan](docs/scoring.md)
- [GEO and AI-discovery guide](docs/geo.md)
- [Devpost submission draft](docs/submission-draft.md)

Released under the [MIT License](LICENSE).
