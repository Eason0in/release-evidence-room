# Validation record

This record separates deterministic integration evidence from native WebMCP evidence so the two are never conflated. It also lists capabilities that are intentionally out of scope.

## Automated evidence

| Layer | Command | Current result |
| --- | --- | --- |
| Checkout state machine, evidence handoff, domain, verifier, persistence, components, WebMCP adapter, and Inworld helper | `npm test` | **83 tests passed** |
| TypeScript and production bundle | `npm run build` | Passed |
| Dependency audit | `npm audit --audit-level=high` | 0 vulnerabilities |
| Full `/checkout` evidence handoff, proposal, verification, and human-confirmation browser path | `npm run test:e2e` | 1 Playwright test passed |
| Recorded deterministic browser path | `npm run demo:record` | 1 recorded Playwright test passed |
| Inworld narration helper | `npm run demo:tts:inworld` | WAV generated from the checked-in English script; key is environment-only |

The Playwright path starts at `/checkout`, creates the risky runtime trace, sends the exact session into `/`, injects a minimal `document.modelContext` registry, and completes the five-tool human-gated flow. It proves the same-origin evidence handoff and that executing the registered definitions reaches the real application handlers. It does not prove native ChatGPT or Chrome tool discovery.

The deterministic video is a local integration artifact. Its explicit watermark says `SIMULATED INTEGRATION TEST · NOT NATIVE EVIDENCE`. It is not the final challenge video.

## Native WebMCP acceptance gate

**Current two-route status: pending deployment and native recertification.** The prior Release Room-only production build passed on 2026-08-28 against `https://release-evidence-room.vercel.app/` in ChatGPT's in-app browser. The recorded result below is retained as a historical baseline and does not certify the newly added `/checkout` route or its handoff.

Native acceptance requires all of the following on `https://release-evidence-room.vercel.app/` in ChatGPT's in-app browser or Chrome 149+ with WebMCP enabled:

- `document.modelContext` is available.
- Discovery returns exactly `get_release_snapshot`, `query_network_evidence`, `propose_test_case`, `run_approved_verification`, and `propose_release_decision`.
- All five tools execute against a freshly reset room; verification is rejected until the human approves its linked test.
- Repeating a proposal with the same `clientRequestId` returns the original result and creates no duplicate.
- A stale `expectedStateVersion` returns `state_conflict` and creates no mutation.
- The agent cannot approve a test, execute arbitrary code or a live-system test, confirm `READY`/`HOLD`, or deploy.
- Human controls and the versioned activity trail visibly reflect the native calls.
- After a final decision, the native UI exposes no second confirmation control. The direct second-confirmation domain transition is covered separately by automated tests.

### Historical Release Room-only production-native result

| Check | Observed result |
| --- | --- |
| Discovery | Exactly five tools: `get_release_snapshot`, `query_network_evidence`, `propose_test_case`, `run_approved_verification`, `propose_release_decision` |
| Initial snapshot | Build `207`, candidate `RC3`, state version `12`, `18 / 18` tests |
| Approval gate | Pre-approval verification returned `invalid_test_proposal` at state version `13` |
| Targeted replay | `V-001`, `risk_confirmed`, two steps, two different idempotency keys, two modeled side effects, state version `15` |
| Seeded monkey | `V-002`, seed `37`, cap `20`, four executed steps, `risk_confirmed`, state version `16` |
| Decision guard | A risk-linked `READY` returned `invalid_verification_result`; `HOLD` became `P-018`, linked to `V-001`, and stayed pending until human confirmation |
| Final state | Human-confirmed `HOLD`, state version `18`, one approved test, one confirmed decision, two risk-confirmed verifications |
| Persistence | Reload restored state version `18`, `HOLD`, proposal counts, and both verification verdicts |
| Idempotency | Exact test-proposal, verification, and decision retries returned `replayed: true`, the original IDs, and no new state version |
| Concurrency | A new proposal using stale state version `12` returned `state_conflict`; counts and state version stayed unchanged |
| Bounds | `maxSteps: 101` was rejected; a verification run linked to a proposal containing only one side of the evidence pair returned `inconclusive` rather than inventing a verdict |
| Browser health | Zero console errors after the complete flow and reload; no second `Confirm HOLD` control remained |

Automated tests cover the compatibility fallback for hosts that omit the optional execute-callback options object. The earlier deployed five-tool native flow succeeded in the in-app browser, but that session did not instrument callback arguments and therefore does not prove that the host exercised the fallback branch. The historical canonical page served bundle `assets/index-dUdqh-KZ.js`.

## Manual native test script

1. Open `https://release-evidence-room.vercel.app/checkout`, click **Place order · lose response**, choose **Retry with a new key**, and send the evidence to the Release Room.
2. Open the Release Room and confirm it shows `checkout_session_017`, `idem_7f3c · idem_b15a`, and `op_01 · op_02`. Then discover the five tools and record their exact names and schemas.
3. Call `get_release_snapshot`; expect build `207`, candidate `RC3`, state version `12`, and `18 / 18` tests.
4. Call `query_network_evidence` with `riskType: duplicate_side_effect`, `severity: high`, and `limit: 20`; expect the single bounded item `netev_retry_017`.
5. Call `propose_test_case` with `expectedStateVersion: 12`; expect pending `P-017` and state version `13`.
6. Before approval, try `run_approved_verification`; expect `invalid_test_proposal` and no mutation. Then click **Approve test**; expect state version `14`.
7. Call `run_approved_verification` with `expectedStateVersion: 14`, `testProposalId: P-017`, and `strategy: targeted_retry`; expect `V-001`, `risk_confirmed`, two side effects, and state version `15`.
8. Call it again with a new request ID, `expectedStateVersion: 15`, `strategy: seeded_monkey`, `seed: 37`, and `maxSteps: 20`; expect reproducible `V-002`, four executed steps, `risk_confirmed`, and state version `16`.
9. First try `recommendation: ready` with a risk-confirmed result; expect `invalid_verification_result`. Then call `propose_release_decision` with `expectedStateVersion: 16`, `recommendation: hold`, `testProposalId: P-017`, and one matching verification result; expect pending `P-018` while the header remains `UNDECIDED`.
10. Replay the exact same request; expect `replayed: true` and unchanged state version `17`.
11. Send a stale proposal with `expectedStateVersion: 12`; expect `state_conflict` and unchanged proposal and verification counts.
12. Click **Confirm HOLD**; expect `HOLD`, `Human confirmed`, and a final state version `18`.

For a repeat acceptance run, record the browser/host, URL, discovered tool names, returned state versions, and a screen capture. Do not record credentials, private browser context, or company evidence.

## Not tested or intentionally out of scope

- Live TestLink, Charles, packet capture, or arbitrary remote network fetching.
- Execution of the proposed regression test against a payment service. The included verifier runs only the bounded synthetic model.
- Random, unseeded, or unbounded monkey testing. The included state-machine run always requires a seed and a maximum of 100 steps.
- Deployment, rollback, or production release actions; no such tool exists.
- Multi-user synchronization, simultaneous same-version write conflict resolution, offline recovery, and cross-device persistence. Same-browser storage-event synchronization is covered by an automated test.
- WebMCP behavior in Safari, mobile browsers, or hosts other than ChatGPT's in-app browser and WebMCP-enabled Chrome.
- Inworld account billing state or voice quality across every available voice; the helper makes one bounded request and keeps the key out of source control.
- Public YouTube upload and Devpost submission; both remain human-controlled external actions.

These are explicit boundaries, not missing claims. The challenge entry uses synthetic evidence to demonstrate the WebMCP interaction safely.
