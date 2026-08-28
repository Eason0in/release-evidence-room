# Release Evidence Room

**18 / 18 tests passed. Exactly-once is still unproven.**

Release Evidence Room is a one-page WebMCP demo where a release owner and an agent review the same bounded evidence. The agent can inspect evidence and create proposals; only the human can approve a test or confirm a READY/HOLD decision.

The current fixture is fully synthetic. It models a mobile checkout retry where all automated tests pass, yet privacy-safe network evidence shows two accepted operation refs and two idempotency key refs for one payment intent. That establishes a release risk, not proof of a duplicate charge.

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

Every read, proposal, and human action appears in the versioned activity trail. Proposal mutations require an expected state version and an idempotent client request ID.

## WebMCP tools

- `get_release_snapshot` — read checks, gaps, proposals, decision, and `stateVersion`.
- `query_network_evidence` — filter only evidence already present and sanitized in the page.
- `propose_test_case` — create a pending evidence-linked test proposal.
- `propose_release_decision` — create a non-binding READY or HOLD proposal.

All four tools use strict schemas with `additionalProperties: false` plus runtime validation. Unsupported browsers keep the complete human UI; they simply do not register tools.

## Run locally

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Then open the printed local URL. WebMCP works in ChatGPT's in-app browser or a compatible Chrome build; the ordinary UI works in any modern browser.

## Verify

```bash
npm test
npm run build
npm run test:e2e
```

The Playwright test injects a minimal browser registry, invokes the same four tools the app registers, and verifies the complete agent-proposes/human-confirms HOLD path through persisted state version 16.

## Privacy and scope

- Synthetic data only; no company, student, customer, or credential data.
- No uploads, authentication, remote fetching, live TestLink, or live Charles connection.
- Evidence exposes opaque refs, not raw hosts, paths, queries, headers, bodies, cookies, credentials, addresses, timestamps, or file paths.
- Local state uses a versioned localStorage envelope and fails closed to the deterministic fixture when malformed.
- There is no deploy tool and no autonomous approval path.

See [the implementation plan](docs/implementation-plan.md) and [the 90-second demo script](docs/demo-script.md).
