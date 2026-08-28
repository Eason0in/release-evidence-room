# Validation record

This record separates deterministic integration evidence from native WebMCP evidence so the two are never conflated. It also lists capabilities that are intentionally out of scope.

## Automated evidence

| Layer | Command | Current result |
| --- | --- | --- |
| Domain, verifier, persistence, components, WebMCP adapter, and Inworld helper | `npm test` | **69 tests passed** |
| TypeScript and production bundle | `npm run build` | Passed |
| Dependency audit | `npm audit --audit-level=high` | 0 vulnerabilities |
| Full proposal and human-confirmation browser path | `npm run test:e2e` | 1 Playwright test passed |
| Recorded deterministic browser path | `npm run demo:record` | 1 recorded Playwright test passed |
| Inworld narration helper | `npm run demo:tts:inworld` | WAV generated from the checked-in English script; key is environment-only |

The Playwright path injects a minimal `document.modelContext` registry. It proves that the application registers the intended definitions and that executing those definitions reaches the real application handlers. It does not prove native ChatGPT or Chrome tool discovery.

The deterministic video is a local integration artifact. Its explicit watermark says `SIMULATED INTEGRATION TEST · NOT NATIVE EVIDENCE`. It is not the final challenge video.

## Native WebMCP acceptance gate

**Status: pending a fresh production capture after the current branch is deployed.**

Native acceptance requires all of the following on `https://release-evidence-room.vercel.app/` in ChatGPT's in-app browser or Chrome 149+ with WebMCP enabled:

- `document.modelContext` is available.
- Discovery returns exactly `get_release_snapshot`, `query_network_evidence`, `propose_test_case`, `run_approved_verification`, and `propose_release_decision`.
- All five tools execute against a freshly reset room; verification is rejected until the human approves its linked test.
- Repeating a proposal with the same `clientRequestId` returns the original result and creates no duplicate.
- A stale `expectedStateVersion` returns `state_conflict` and creates no mutation.
- The agent cannot approve a test, execute arbitrary code or a live-system test, confirm `READY`/`HOLD`, or deploy.
- Human controls and the versioned activity trail visibly reflect the native calls.
- A second confirmation after a final decision fails closed.

The current branch includes a compatibility fallback for hosts that omit the optional execute-callback options object. That behavior has automated coverage and was observed in a local native-capable browser session; it must still be rechecked on the production deployment.

## Manual native test script

1. Open the production URL and click **Reset demo**.
2. Discover the five tools; record their exact names and schemas.
3. Call `get_release_snapshot`; expect build `207`, candidate `RC3`, state version `12`, and `18 / 18` tests.
4. Call `query_network_evidence` with `riskType: duplicate_side_effect`, `severity: high`, and `limit: 20`; expect the single bounded item `netev_retry_017`.
5. Call `propose_test_case` with `expectedStateVersion: 12`; expect pending `P-017` and state version `13`.
6. Before approval, try `run_approved_verification`; expect `invalid_test_proposal` and no mutation. Then click **Approve test**; expect state version `14`.
7. Call `run_approved_verification` with `expectedStateVersion: 14`, `testProposalId: P-017`, and `strategy: targeted_retry`; expect `V-001`, `risk_confirmed`, two side effects, and state version `15`.
8. Call it again with a new request ID, `expectedStateVersion: 15`, `strategy: seeded_monkey`, `seed: 37`, and `maxSteps: 20`; expect reproducible `V-002`, four executed steps, `risk_confirmed`, and state version `16`.
9. Call `propose_release_decision` with `expectedStateVersion: 16`, `recommendation: hold`, `testProposalId: P-017`, and `verificationResultId: V-002`; expect pending `P-018` while the header remains `UNDECIDED`.
10. Replay the exact same request; expect `replayed: true` and unchanged state version `17`.
11. Send a stale proposal with `expectedStateVersion: 12`; expect `state_conflict` and unchanged proposal and verification counts.
12. Click **Confirm HOLD**; expect `HOLD`, `Human confirmed`, and a final state version `18`.

Record the browser/host, URL, discovered tool names, returned state versions, and a screen capture. Do not record credentials, private browser context, or company evidence.

## Not tested or intentionally out of scope

- Live TestLink, Charles, packet capture, or arbitrary remote network fetching.
- Execution of the proposed regression test against a payment service. The included verifier runs only the bounded synthetic model.
- Random, unseeded, or unbounded monkey testing. The included state-machine run always requires a seed and a maximum of 100 steps.
- Deployment, rollback, or production release actions; no such tool exists.
- Multi-user synchronization, multi-tab conflict resolution, offline recovery, and cross-device persistence.
- WebMCP behavior in Safari, mobile browsers, or hosts other than ChatGPT's in-app browser and WebMCP-enabled Chrome.
- Inworld account billing state or voice quality across every available voice; the helper makes one bounded request and keeps the key out of source control.
- Public YouTube upload and Devpost submission; both remain human-controlled external actions.

These are explicit boundaries, not missing claims. The challenge entry uses synthetic evidence to demonstrate the WebMCP interaction safely.
