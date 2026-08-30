# Devpost submission draft

This is the English copy prepared for the Devpost form. The final 2:45 native-WebMCP walkthrough passed local review and is publicly available on YouTube.

Release Evidence Room is a new project created during the WebMCP Challenge submission period. Its public Git history documents the implementation timeline.

- **Live URL:** https://release-evidence-room.vercel.app/
- **Repository:** https://github.com/Eason0in/release-evidence-room
- **Demo video:** https://youtu.be/PyDhC1ju_pw

## Project name

Release Evidence Room

## Tagline

The agent builds the release evidence case. The human makes the call.

## 1. Why this use case is a strong fit for WebMCP

Release decisions are usually fragmented across dashboards, test systems, network traces, and chat. A general-purpose agent can summarize those screens, but scraping does not provide a stable contract for evidence provenance, bounded access, or safe actions. Release Evidence Room uses WebMCP to make the page itself expose five narrow, typed capabilities: read the current release state, query only sanitized page-owned network evidence, propose a missing test, run that test inside a human-gated synthetic sandbox, and propose a verification-linked READY or HOLD decision.

This is more than a convenience layer over buttons. Tool inputs are strictly validated at both schema and runtime boundaries. Mutations require the current state version and an idempotent request ID, so stale or repeated agent calls cannot silently create conflicting work. The verifier supports an exact retry replay and a deterministic seeded state-machine run capped at 100 steps. It executes no arbitrary code and calls no URL or live system. The page exposes no deploy, approval, or final-decision tool.

## 2. How it creates a better user experience

The release owner and the agent share one visible evidence room instead of passing copied snippets between systems. The agent can focus the exact evidence it used and place a structured proposal directly beside the human controls. The human sees why a test or HOLD was proposed, approves or rejects it in context, and can inspect an attributed, versioned activity trail.

The experience also survives without WebMCP: the complete page remains usable by a human, while compatible browsers add the agent collaboration layer.

## 3. What people and agents can do together that was difficult before

The demo begins on a public fictional checkout target. A controlled first attempt is accepted but loses its response; retrying the same intent with a new idempotency key creates a second operation. That exact browser-local session is handed to the Release Evidence Room, where 18 of 18 existing checks are still green. The agent can responsibly identify the exactly-once release risk without overstating it as a confirmed duplicate charge. It drafts the missing response-loss regression test; the human decides whether verification may run. After approval, an exact replay and a seeded bounded monkey run both reproduce two side effects in the synthetic model. The agent then links that result to a HOLD recommendation. The human alone approves the test and confirms the release decision.

This division of labor combines machine-speed evidence synthesis with an explicit human accountability boundary. Every read, proposal, and human action is recorded in the same local state and displayed in the audit trail.

## 4. How WebMCP was implemented

The React and TypeScript application registers exactly five imperative tools through `document.modelContext.registerTool`: `get_release_snapshot`, `query_network_evidence`, `propose_test_case`, `run_approved_verification`, and `propose_release_decision`. Each tool uses a strict JSON schema with `additionalProperties: false` and a separate runtime parser that rejects malformed or unsupported values.

The `/checkout` UI runs a deterministic checkout state model. A validated same-origin handoff converts its runtime attempts into bounded release evidence, which the approved verifier replays through targeted and seeded transition checks. Both the release UI and tool handlers call the same pure release-domain transitions. Versioned localStorage adapters persist and cross-check the checkout session and release state, failing closed if saved data is malformed or contradictory. Proposal transitions enforce optimistic concurrency through `expectedStateVersion` and retry safety through `clientRequestId`. Evidence results contain opaque references only; the project has no authentication, uploads, remote traffic fetch, analytics, or live company integration.

## Testing instructions

The complete judge-oriented walkthrough, including the reason and expected result for every step, is available in the [judge walkthrough](https://github.com/Eason0in/release-evidence-room/blob/master/docs/judge-walkthrough.md) on the default branch.

1. Open `https://release-evidence-room.vercel.app/checkout`, run **Place order · lose response**, choose **Retry with a new key**, and send the evidence to the Release Room.
2. Confirm the Release Room shows `checkout_session_017`, both idempotency-key refs, and both operation refs. Use ChatGPT's in-app browser, or Chrome 149+ after enabling `chrome://flags/#enable-webmcp-testing` and relaunching.
3. Ask the agent: `Review this release candidate for payment-retry safety. Use only evidence available in this page. Query both the accepted initial attempt and its retry, then propose one missing test linked to both evidence records. Do not approve it for me. Do not claim a duplicate charge without evidence.` Confirm that it discovers the page tools, reads the snapshot, returns `netev_response_016` and `netev_retry_017`, and links both to pending test proposal `P-017`.
4. Confirm that verification is rejected before approval, then click **Approve test** as the human.
5. Ask the agent to read the snapshot again after approval, use the returned state version `14`, then run the approved test first with `targeted_retry` and next with `seeded_monkey`, seed `37`, and `maxSteps: 20`. Confirm both results are linked to `P-017` and display `RISK CONFIRMED` for this fixture.
6. Ask the agent to propose a release decision linked to `V-002`. Confirm that HOLD is only a proposal and the header remains UNDECIDED.
7. Click **Confirm HOLD**, then inspect the activity trail for the attributed state sequence.

The repository currently reports 88 automated tests. The production build, Playwright path, and dependency audit pass as local release gates. On 2026-08-29, the deployed two-route build completed a clean-state native `/checkout` handoff, all five page tools, the approval gate, targeted replay, seeded monkey run, idempotent replay, stale-state guard, READY rejection, human-confirmed HOLD, and reload persistence in ChatGPT's in-app browser. The final 2:45 English walkthrough passed decode, caption, checksum, privacy, and independent review before it was published on YouTube.

Use **Reset demo** before repeating the flow. No login or credentials are required.

## Accuracy and privacy note

All evidence and verification runs are synthetic. `risk_confirmed` means the modeled failure was reproduced in the bounded fixture; `not_reproduced` would not prove that a real bug is absent. No company, customer, student, credential, host, raw path, query, header, body, cookie, address, timestamp, or local file path is exposed.
