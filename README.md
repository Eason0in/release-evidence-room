# Release Evidence Room

**A privacy-safe WebMCP release review room where an agent builds the evidence case and a human makes the release decision.**

> **18 / 18 automated tests pass. Exactly-once retry behavior is still unproven.**

Release Evidence Room is a one-page React and TypeScript WebMCP demo for a realistic release-engineering problem: a green test suite can still hide a payment-retry risk. The agent can read bounded evidence and draft proposals. Only the human can approve a test proposal or confirm the final `READY` / `HOLD` decision.

The fixture is deliberately synthetic. It models a mobile checkout retry where one payment intent has two accepted operation references and two idempotency-key references. That is evidence of a release risk, not proof of a duplicate charge.

## Public resources

| Resource | Link | Status |
| --- | --- | --- |
| Live application | <https://release-evidence-room.vercel.app/> | No login; free to inspect |
| Source repository | <https://github.com/Eason0in/release-evidence-room> | Public MIT-licensed source |
| Demo video | YouTube link pending final native-WebMCP capture | Local integration preview is not submission evidence |
| Challenge | [OpenAI WebMCP Challenge](https://openai.com/webmcp-challenge/) | Submission materials are English |

The live URL and repository are the canonical project resources. `demo-output/` is intentionally ignored by Git so local recordings and generated audio do not become repository assets.

## What the project does

1. Shows a release candidate with `18 / 18` automated tests passing.
2. Exposes two bounded, redacted network-evidence clusters already owned by the page.
3. Lets a WebMCP-capable agent query that evidence and identify the missing exactly-once coverage.
4. Lets the agent draft an evidence-linked regression test and a non-binding `HOLD` recommendation.
5. Keeps approval, test execution, and the final release decision in the human UI.
6. Records reads, proposals, and human actions in a versioned local audit trail.

The product moment is the mismatch between **green tests** and **unproven retry safety**. The agent speeds up evidence synthesis; the human retains accountability.

## Human-agent boundary

| Capability | Agent | Human |
| --- | ---: | ---: |
| Read release snapshot | Yes | Yes |
| Query bounded network evidence | Yes | Yes |
| Draft an evidence-linked test | Yes | Yes |
| Approve or reject a test | No | Yes |
| Draft `READY` / `HOLD` | Yes | Yes |
| Confirm the release decision | No | Yes |
| Execute a test | No | No tool exists |
| Deploy or release | No | No tool exists |

Every mutation requires a current `stateVersion`; proposal retries also require a reusable `clientRequestId`. A stale version returns `state_conflict` without mutation. Replaying the same request ID returns the original result without creating a duplicate proposal. Once a human confirms a decision, a second confirmation is rejected fail-closed.

## WebMCP tools

The page registers exactly four imperative tools through `document.modelContext.registerTool` when the host supports WebMCP. Every input has a strict JSON schema with `additionalProperties: false` and an independent runtime parser.

| Tool | What it does | Important boundary |
| --- | --- | --- |
| `get_release_snapshot` | Reads release metadata, test counts, coverage gaps, proposal statuses, decision, and `stateVersion`. | Adds a local audit entry; does not change release state. |
| `query_network_evidence` | Filters only the page-owned synthetic evidence by `riskType`, `severity`, and bounded `limit` (maximum 20). | Never fetches URLs or returns raw traffic. |
| `propose_test_case` | Creates a pending evidence-linked regression-test proposal. | Cannot approve or execute the test. |
| `propose_release_decision` | Creates a non-binding `READY` or `HOLD` recommendation. | Cannot confirm, deploy, or release; linked tests must already be human-approved. |

The first two tools intentionally use `readOnlyHint: false` because their visible result also updates local focus and the audit trail. Unsupported browsers retain the complete human UI; they simply do not register WebMCP tools.

## Architecture

```text
WebMCP-capable agent ─┐
                      ├─> strict tool adapter ─> pure domain transitions ─> versioned localStorage
Human release owner ──┘             │                         │
                                    └─ bounded evidence        └─ attributed audit trail
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

- 45 Vitest tests pass across domain, persistence, components, WebMCP handlers, and the Inworld helper.
- TypeScript and the Vite production build pass.
- The Playwright proposal-and-human-confirmation path passes.
- The dependency audit reports zero high-severity vulnerabilities.
- `npm run demo:record` records a deterministic Playwright integration path. Its watermark explicitly says it is not native WebMCP evidence.

See [the validation record](docs/validation.md) for the separation between automated, native, and intentionally untested behavior.

## Native WebMCP acceptance

The native gate is separate from the Playwright test double. Before submission, use the production URL in ChatGPT's in-app browser or WebMCP-enabled Chrome and verify:

1. Discovery returns exactly the four tool names listed above.
2. All four tools execute after `Reset demo`.
3. Replaying a proposal with the same `clientRequestId` creates no duplicate.
4. A stale `expectedStateVersion` returns `state_conflict` without mutation.
5. The agent cannot approve a test, confirm a decision, execute a test, or deploy.
6. Human controls and the versioned audit trail visibly reflect the native calls.

The current branch contains a compatibility fallback for hosts that omit the optional execute-callback options object. Production native evidence must be refreshed after this branch is deployed.

## Demo and voiceover assets

- [90-second final demo script](docs/demo-script.md)
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
- There is no test-execution or deployment tool and no autonomous approval path.
- The project does not claim packet capture or packet-content analysis; the fixture represents already-sanitized page-owned evidence.

## Challenge materials

- [Implementation and acceptance plan](docs/implementation-plan.md)
- [Validation record](docs/validation.md)
- [Scoring and improvement plan](docs/scoring.md)
- [GEO and AI-discovery guide](docs/geo.md)
- [Devpost submission draft](docs/submission-draft.md)

Released under the [MIT License](LICENSE).
