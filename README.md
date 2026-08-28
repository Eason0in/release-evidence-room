# Release Evidence Room

**18 / 18 tests passed. Exactly-once is still unproven.**

Release Evidence Room is a one-page WebMCP demo where a release owner and an agent review the same bounded evidence. The agent can inspect evidence and create proposals; only the human can approve a test or confirm a READY/HOLD decision.

The current fixture is fully synthetic. It models a mobile checkout retry where all automated tests pass, yet privacy-safe network evidence shows two accepted operation refs and two idempotency key refs for one payment intent. That establishes a release risk, not proof of a duplicate charge.

## Links

- Live app: `https://release-evidence-room.vercel.app/` (published during challenge delivery)
- Source: `https://github.com/Eason0in/release-evidence-room`
- Demo video: public YouTube link will be added after final native-WebMCP capture
- Challenge: [OpenAI WebMCP Challenge](https://openai.com/webmcp-challenge/)

The repository and production URL are independently verified before they are described as live. The checked-in Playwright recording is a deterministic integration test, not evidence of native browser discovery.

## The product moment

The release dashboard looks green, but the page-owned evidence contains a narrow warning: one payment intent has two accepted operation refs under different idempotency key refs. An agent can assemble that evidence into a missing regression test and a HOLD recommendation. It cannot turn either proposal into a decision.

## Human-agent boundary

| Capability | Agent | Human |
| --- | --- | --- |
| Read the release snapshot | Yes | Yes |
| Query bounded network evidence | Yes | Yes |
| Draft a test case | Yes | Yes |
| Approve or reject a test | No | Yes |
| Draft READY/HOLD | Yes | Yes |
| Confirm the release decision | No | Yes |
| Deploy or release | No | No tool exists |

Every read, proposal, and human action within the current room appears in the versioned activity trail. **Reset demo** deliberately replaces the local synthetic room and clears that trail. Proposal mutations require an expected state version and an idempotent client request ID.

## WebMCP tools

- `get_release_snapshot` — read checks, gaps, proposals, decision, and `stateVersion`; append a local audit event.
- `query_network_evidence` — filter only evidence already present and sanitized in the page; update local focus and audit state.
- `propose_test_case` — create a pending evidence-linked test proposal.
- `propose_release_decision` — create a non-binding READY or HOLD proposal.

All four tools use `document.modelContext.registerTool`, strict schemas with `additionalProperties: false`, and independent runtime validation. The first two are intentionally not annotated read-only because their visible result also writes local focus/audit state. Unsupported browsers keep the complete human UI; they simply do not register tools.

Proposal mutations add two reliability controls that matter when an agent retries:

- `expectedStateVersion` provides optimistic concurrency and rejects stale proposals.
- `clientRequestId` makes a repeated proposal request idempotent.

## Architecture

```text
WebMCP-capable agent ─┐
                     ├─> strict tool adapter ─> domain transitions ─> versioned localStorage
Human release owner ─┘              │                       │
                                    └─ bounded evidence     └─ attributed audit trail
```

The WebMCP adapter and the React UI call the same domain functions. No tool can approve, confirm, execute a test, fetch arbitrary traffic, or deploy.

## Run locally

Requirements: Node.js 22.13 or newer.

```bash
npm ci
npm run dev
```

Then open the printed local URL. WebMCP works in ChatGPT's in-app browser or Chrome 149+ with `chrome://flags/#enable-webmcp-testing` enabled and the browser relaunched. The ordinary UI works in any modern browser.

## Verify

```bash
npm test
npm run build
npm run test:e2e
npm run demo:record
```

The unit/integration suite currently contains 39 tests. The Playwright test injects a minimal browser registry, invokes the same four tools the app registers, and verifies the complete agent-proposes/human-confirms HOLD path through persisted state version 16. A strict registry regression test also exercises React's development StrictMode setup/cleanup cycle so native tools are not lost to duplicate-registration races.

That Playwright registry is deliberately a test double. Native verification is a separate acceptance gate:

1. Load the production app in ChatGPT's in-app browser or WebMCP-enabled Chrome.
2. Verify discovery returns exactly the four tools above.
3. Execute snapshot, bounded evidence query, test proposal, and decision proposal.
4. Confirm that the human controls remain the only approval and final-decision path.

See [the validation record](docs/validation.md) for which layers have current evidence.

## Privacy and scope

- Synthetic data only; no company, student, customer, or credential data.
- No uploads, authentication, remote fetching, live TestLink, or live Charles connection.
- Evidence exposes opaque refs, not raw hosts, paths, queries, headers, bodies, cookies, credentials, addresses, timestamps, or file paths.
- Local state uses a versioned localStorage envelope and fails closed to the deterministic fixture when malformed or logically inconsistent with its evidence, proposal, decision, and audit references.
- There is no deploy tool and no autonomous approval path.

## Challenge materials

- [Implementation and acceptance plan](docs/implementation-plan.md)
- [90-second native demo script](docs/demo-script.md)
- [English submission draft](docs/submission-draft.md)
- [Validation record](docs/validation.md)

Released under the [MIT License](LICENSE).
