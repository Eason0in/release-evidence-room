# Validation record

This record separates deterministic integration evidence from native WebMCP evidence so the two are never conflated. It also lists capabilities that are intentionally out of scope.

## Automated evidence

| Layer | Command | Current result |
| --- | --- | --- |
| Checkout state machine, evidence handoff, domain, verifier, persistence, components, WebMCP adapter, and Inworld helper | `npm test` | **88 tests passed** |
| TypeScript and production bundle | `npm run build` | Passed |
| Dependency audit | `npm audit --audit-level=high` | 0 vulnerabilities |
| Full `/checkout` evidence handoff, proposal, verification, and human-confirmation browser path | `npm run test:e2e` | 1 Playwright test passed |
| Recorded deterministic browser path | `npm run demo:record` | 1 recorded Playwright test passed |
| Inworld narration helper | `npm run demo:tts:inworld` | WAV generated from the checked-in English script; key is environment-only |

The Playwright path starts at `/checkout`, creates the risky runtime trace, sends the exact session into `/`, injects a minimal `document.modelContext` registry, and completes the five-tool human-gated flow. It proves the same-origin evidence handoff and that executing the registered definitions reaches the real application handlers. It does not prove native ChatGPT or Chrome tool discovery.

The deterministic video is a local integration artifact. Its explicit watermark says `SIMULATED INTEGRATION TEST · NOT NATIVE EVIDENCE`. It is not the final challenge video.

## Native WebMCP acceptance gate

**Current two-route status: deployed; clean-state native acceptance passed.** The production checks below were performed against `https://release-evidence-room.vercel.app/` on 2026-08-29:

| Current production check | Observed result |
| --- | --- |
| Public routes | `/` and `/checkout` both returned HTTP 200. |
| Production bundle | `assets/index-DrvDCjEW.js` accesses `document.modelContext`, invokes `registerTool`, and contains all five documented tool names. |
| Native discovery | ChatGPT's in-app browser discovered exactly the five documented WebMCP tools on `/`. |
| Clean checkout handoff | A freshly reset `/checkout` produced `checkout_session_017`, both evidence records, both retry keys, and both operation references before handing the session to `/`. |
| Native five-tool flow | The page completed snapshot, evidence query, test proposal, approved targeted and seeded verification, and a verification-linked HOLD proposal. |
| Safety guards | Pre-approval verification, risk-linked READY, and stale-state mutation were rejected; an identical verification request replayed without duplication. |
| Final human state | The human confirmed `HOLD`; reload preserved state version `18`, `P-017`, `P-018`, `V-001`, and `V-002`. |

The acceptance checklist below passed as one uninterrupted clean-state native run. Automated tests remain the reproducible regression gate; the native run proves current host discovery and end-to-end interaction on the deployed origin.

Native acceptance requires all of the following on `https://release-evidence-room.vercel.app/` in ChatGPT's in-app browser or Chrome 149+ with WebMCP enabled:

- `document.modelContext` is available.
- Discovery returns exactly `get_release_snapshot`, `query_network_evidence`, `propose_test_case`, `run_approved_verification`, and `propose_release_decision`.
- All five tools execute against a freshly reset room; verification is rejected until the human approves its linked test.
- Repeating the targeted verification with the same `clientRequestId` returns the original result and creates no duplicate.
- A stale `expectedStateVersion` returns `state_conflict` and creates no mutation.
- The agent cannot approve a test, execute arbitrary code or a live-system test, confirm `READY`/`HOLD`, or deploy.
- Human controls and the versioned activity trail visibly reflect the native calls.
- After a final decision, the native UI exposes no second confirmation control. The direct second-confirmation domain transition is covered separately by automated tests.

### Clean-state two-route production-native result

| Check | Observed result |
| --- | --- |
| Discovery | Exactly five tools: `get_release_snapshot`, `query_network_evidence`, `propose_test_case`, `run_approved_verification`, `propose_release_decision` |
| Initial snapshot | Build `207`, candidate `RC3`, state version `12`, `18 / 18` tests |
| Approval gate | Pre-approval verification returned `invalid_test_proposal` at state version `13` |
| Targeted replay | `V-001`, `risk_confirmed`, two steps, two different idempotency keys, two modeled side effects, state version `15` |
| Seeded monkey | `V-002`, seed `37`, cap `20`, four executed steps, `risk_confirmed`, state version `16` |
| Decision guard | A risk-linked `READY` returned `invalid_verification_result`; `HOLD` became `P-018`, linked to `V-002`, and stayed pending until human confirmation |
| Final state | Human-confirmed `HOLD`, state version `18`, one approved test, one confirmed decision, two risk-confirmed verifications |
| Persistence | Reload restored state version `18`, `HOLD`, proposal counts, and both verification verdicts |
| Idempotency | Replaying the exact `V-001` verification request returned `replayed: true`, the original ID, and no new state version |
| Concurrency | A new proposal using stale state version `15` returned `state_conflict` against current version `16`; counts and state version stayed unchanged |
| Browser health | Zero console errors after the complete flow and reload; no second `Confirm HOLD` control remained |

Automated tests and the earlier native acceptance separately cover exact test-proposal and decision replays, rejection of `maxSteps: 101`, and an `inconclusive` result when only one side of the evidence pair is linked. Those results are not attributed to the 2026-08-29 recording. Automated tests also cover the compatibility fallback for hosts that omit the optional execute-callback options object; the native session did not instrument callback arguments and therefore does not independently prove that the host exercised the fallback branch.

## Manual native test script

For the judge-facing explanation, reasons for every step, copy-ready prompts, and expected UI results, use [Judge walkthrough](judge-walkthrough.md). The checklist below is the compact acceptance version.

1. Open `https://release-evidence-room.vercel.app/checkout`, click **Place order · lose response**, choose **Retry with a new key**, and send the evidence to the Release Room.
2. Open the Release Room and confirm it shows `checkout_session_017`, `idem_7f3c · idem_b15a`, and `op_01 · op_02`. Then discover the five tools and record their exact names and schemas.
3. Call `get_release_snapshot`; expect build `207`, candidate `RC3`, state version `12`, and `18 / 18` tests.
4. Call `query_network_evidence` with `limit: 20` and no risk-type or severity filter; expect both `netev_response_016` (initial attempt) and `netev_retry_017` (retry attempt).
5. Call `propose_test_case` with `expectedStateVersion: 12` and both evidence IDs; expect pending `P-017` and state version `13`.
6. Before approval, try `run_approved_verification`; expect `invalid_test_proposal` and no mutation. Then click **Approve test**; expect state version `14`.
7. Call `get_release_snapshot` again after human approval; expect approved `P-017` and state version `14`. Then call `run_approved_verification` with that `expectedStateVersion`, `testProposalId: P-017`, and `strategy: targeted_retry`; expect `V-001`, `risk_confirmed`, two side effects, and state version `15`.
8. Call it again with a new request ID, `expectedStateVersion: 15`, `strategy: seeded_monkey`, `seed: 37`, and `maxSteps: 20`; expect reproducible `V-002`, four executed steps, `risk_confirmed`, and state version `16`.
9. First actually call `propose_release_decision` with `recommendation: ready` and a risk-confirmed result; expect `invalid_verification_result`. Then call it again with a new request ID, `expectedStateVersion: 16`, `recommendation: hold`, `testProposalId: P-017`, and one matching verification result; expect pending `P-018` while the header remains `UNDECIDED`.
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
- Final Devpost submission remains entrant-controlled. The reviewed 2:45 native-WebMCP walkthrough is public at <https://youtu.be/PyDhC1ju_pw>.

These are explicit boundaries, not missing claims. The challenge entry uses synthetic evidence to demonstrate the WebMCP interaction safely.
