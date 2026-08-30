# Judge walkthrough

This guide shows exactly how to evaluate Release Evidence Room, why each step matters, and what a correct result looks like. The complete path takes about three minutes after the page is open.

## Before you start

- Use ChatGPT's in-app browser, or Chrome 149+ with WebMCP testing enabled and the browser relaunched.
- Open the site in the browser attached to the same agent conversation where you will enter the prompts.
- No account, card, credential, company data, or real payment is required. Application persistence is browser-local; tool inputs and synthetic results are also shared with the agent host the judge has intentionally selected.
- The five WebMCP tools are agent interfaces, not visible page buttons. In a supported host they register whenever the Release Evidence Room at `/` loads; `/checkout` exposes no tools. The handoff replaces the built-in fixture with the checkout-generated session, but it is not a registration prerequisite.

For a guaranteed clean run, first open the Release Evidence Room at `/` and click **Reset demo**. Then open the Checkout QA Sandbox. If the sandbox already shows a completed trace, click **Reset sandbox**. This explicit human reset also clears read-only-looking audit/focus activity that would otherwise make the handoff guard preserve the prior review.

## Core evaluation path

| Step | Judge action | Why it matters | Expected result |
| --- | --- | --- | --- |
| 1 | Open <https://release-evidence-room.vercel.app/checkout>. | Starts from an observable QA target instead of an unexplained report fixture. | `PUBLIC, FICTIONAL TEST TARGET` and `No real payment`. |
| 2 | Click **Place order · lose response**. | Models a realistic failure: the first operation is accepted, but the client receives no usable response. | Initial attempt `idem_7f3c`, operation `op_01`, and `response lost`. |
| 3 | Click **Retry with a new key**. | Deliberately demonstrates an unsafe retry implementation for the same intent. | Retry key `idem_b15a`, operation `op_02`, and `2 side effects observed`. |
| 4 | Click **Send evidence to Release Room**, then **Open Release Evidence Room**. | Transfers the exact browser-generated session into the review surface. | `CHECKOUT RUNTIME`, session `checkout_session_017`, both key refs, and both operation refs. |
| 5 | Confirm the release still shows `18 / 18 tests passed`. | Establishes the product's central problem: a green suite does not prove retry safety. | Green suite and high-severity retry evidence appear together. |
| 6 | Send Prompt A below to the agent. | Makes the agent gather evidence before drafting a test. | The agent calls the first three WebMCP tools and creates pending proposal `P-017`. |
| 7 | Send the approval-gate prompt below before clicking any approval button. | Proves the agent cannot execute its own unapproved proposal. | `run_approved_verification` returns `invalid_test_proposal` without mutation. |
| 8 | Click **Approve test** yourself. | Demonstrates that authorization remains a human action. | `P-017` becomes `APPROVED BY HUMAN`; state version becomes `14`. |
| 9 | Send Prompt B below. | Combines an exact regression replay with reproducible bounded state exploration. | `V-001` and `V-002` both report `RISK CONFIRMED` and two modeled side effects. |
| 10 | Send Prompt C below. | Demonstrates that a confirmed risk cannot be converted into an unsupported READY decision. | READY is rejected; a non-binding HOLD proposal appears while the header remains `UNDECIDED`. |
| 11 | Click **Confirm HOLD** yourself. | Keeps final release accountability with the human reviewer. | The header becomes `HOLD` and `Human confirmed`; final state version is `18`. |
| 12 | Inspect **Evidence & decision trail**, then reload the page. | Verifies attribution, state transitions, and browser-local persistence. | The audit trail, two verification results, and final HOLD survive reload. |

## Prompt A — inspect evidence and propose a test

```text
Review this release candidate for payment-retry safety.

Use only the WebMCP tools exposed by this page. Read the release snapshot. Query the bounded network evidence without a risk-type or severity filter so you obtain both the accepted initial attempt and its retry. Propose one missing regression test linked to both netev_response_016 and netev_retry_017.

Do not approve the test and do not make the final release decision for me. Do not claim that a duplicate charge occurred; describe only what the bounded evidence establishes.
```

Expected tool sequence:

1. `get_release_snapshot`
2. `query_network_evidence`
3. `propose_test_case`

The pending proposal must link both evidence IDs. The verifier needs the initial and retry attempts together; linking only the high-severity retry item would correctly produce `inconclusive`.

## Approval-gate prompt — run before human approval

```text
Try to run targeted_retry for pending test proposal P-017 before I approve it. Report the exact result and do not change the approval yourself.
```

Expected result: `invalid_test_proposal` at state version `13`, with no verification result created.

## Prompt B — execute the approved verification

```text
Read the release snapshot again after my approval and use its returned state version, which should now be 14.

Run approved test P-017 first with targeted_retry.

Then run the same approved test with seeded_monkey, seed 37, and maxSteps 20.

Report the verification IDs, verdicts, assertions, executed-step counts, and observed side-effect counts. Do not make the final release decision.
```

Expected results:

- The post-approval snapshot reports state version `14` and `P-017` as approved.
- `V-001`: `targeted_retry`, `risk_confirmed`, two steps, two modeled side effects.
- `V-002`: `seeded_monkey`, seed `37`, four of at most `20` steps, `risk_confirmed`, two modeled side effects.
- Both `stable_retry_key` and `single_side_effect` assertions fail for this intentionally risky fixture.

## Prompt C — test the decision guard

```text
First call propose_release_decision to attempt READY with P-017 and V-002. Report the exact rejection and do not soften it into a verbal check.

Then call propose_release_decision again with a new clientRequestId to propose HOLD linked to P-017 and V-002. Do not confirm the final decision for me.
```

Expected result: READY is rejected, then pending release proposal `P-018` recommends HOLD. Only the visible human control can confirm it.

## Deterministic call checkpoints

The agent may draft the human-readable title, Given/When/Then, and rationale, but the state-bearing arguments should match these checkpoints:

| Call | Required checkpoint |
| --- | --- |
| Evidence query | `{ "limit": 20 }`; no risk-type or severity filter, so both evidence records are returned. |
| Test proposal | `expectedStateVersion: 12`, unique `clientRequestId`, and `evidenceIds: ["netev_response_016", "netev_retry_017"]`. |
| Pre-approval verification | `expectedStateVersion: 13`, a new request ID, `testProposalId: "P-017"`, `strategy: "targeted_retry"`; expect rejection without a version change. |
| Post-approval snapshot | `{}`; expect `stateVersion: 14` and approved `P-017`. |
| Targeted verification | `expectedStateVersion: 14`, a new request ID, `P-017`, and `targeted_retry`. |
| Seeded verification | `expectedStateVersion: 15`, a new request ID, `P-017`, `seeded_monkey`, `seed: 37`, `maxSteps: 20`. |
| READY guard | `expectedStateVersion: 16`, a new request ID, both evidence IDs, `P-017`, `V-002`, and `recommendation: "ready"`; expect rejection. |
| HOLD proposal | Reuse version `16` because the rejection did not mutate state; use a new request ID, both evidence IDs, `P-017`, `V-002`, and `recommendation: "hold"`. |

## Optional robustness checks

After the core path, a judge may also verify:

- Replay the exact same proposal request with the same `clientRequestId`; expect `replayed: true`, the original ID, and no new state version.
- Submit a new proposal with stale `expectedStateVersion: 12`; expect `state_conflict` and no mutation.
- Try `seeded_monkey` with `maxSteps: 101`; expect strict input rejection.
- Return to `/checkout` and try to send another trace after the review has activity; expect the room to preserve the existing proposals, verifications, HOLD, and audit trail.

## What the demonstration proves—and does not prove

The demonstration proves that the page-owned synthetic model reproduced an unsafe retry trace, the agent used typed page tools to build an evidence-linked review, verification could run only after human approval, and the human alone confirmed the final HOLD.

It does not prove that a real customer was charged twice, execute a live payment-system test, inspect Charles packets, access TestLink, or deploy a release. No such capability is exposed.
