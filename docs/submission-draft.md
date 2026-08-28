# Devpost submission draft

This is the English copy prepared for the Devpost form. Replace the pending video placeholder only after the native production recording is public on YouTube.

- **Live URL:** https://release-evidence-room.vercel.app/
- **Repository:** https://github.com/Eason0in/release-evidence-room
- **Demo video:** `PENDING_PUBLIC_YOUTUBE_URL`

## Project name

Release Evidence Room

## Tagline

The agent builds the release evidence case. The human makes the call.

## 1. Why this use case is a strong fit for WebMCP

Release decisions are usually fragmented across dashboards, test systems, network traces, and chat. A general-purpose agent can summarize those screens, but scraping does not provide a stable contract for evidence provenance, bounded access, or safe actions. Release Evidence Room uses WebMCP to make the page itself expose four narrow, typed capabilities: read the current release state, query only sanitized page-owned network evidence, propose a missing test, and propose a READY or HOLD decision.

This is more than a convenience layer over buttons. Tool inputs are strictly validated at both schema and runtime boundaries. Proposals require the current state version and an idempotent request ID, so stale or repeated agent calls cannot silently create conflicting work. The page exposes no deploy, test-execution, approval, or final-decision tool.

## 2. How it creates a better user experience

The release owner and the agent share one visible evidence room instead of passing copied snippets between systems. The agent can focus the exact evidence it used and place a structured proposal directly beside the human controls. The human sees why a test or HOLD was proposed, approves or rejects it in context, and can inspect an attributed, versioned activity trail.

The experience also survives without WebMCP: the complete page remains usable by a human, while compatible browsers add the agent collaboration layer.

## 3. What people and agents can do together that was difficult before

The demo begins with 18 of 18 tests passing. The bounded evidence still shows one payment intent associated with two accepted operation references and two idempotency key references. The agent can responsibly identify this as an exactly-once release risk without overstating it as a confirmed duplicate charge. It then drafts the missing response-loss regression test and a HOLD recommendation. The human alone approves the test and confirms the release decision.

This division of labor combines machine-speed evidence synthesis with an explicit human accountability boundary. Every read, proposal, and human action is recorded in the same local state and displayed in the audit trail.

## 4. How WebMCP was implemented

The React and TypeScript application registers exactly four imperative tools through `document.modelContext.registerTool`: `get_release_snapshot`, `query_network_evidence`, `propose_test_case`, and `propose_release_decision`. Each tool uses a strict JSON schema with `additionalProperties: false` and a separate runtime parser that rejects malformed or unsupported values.

Both the UI and tool handlers call the same pure domain transitions. A versioned localStorage adapter persists the synthetic room state and fails closed to the deterministic fixture if the envelope is malformed. Proposal transitions enforce optimistic concurrency through `expectedStateVersion` and retry safety through `clientRequestId`. Evidence results contain opaque references only; the project has no authentication, uploads, remote traffic fetch, analytics, or live company integration.

## Testing instructions

1. Open the public app in ChatGPT's in-app browser, or in Chrome 149+ after enabling `chrome://flags/#enable-webmcp-testing` and relaunching.
2. Ask the agent: `Review this release candidate for payment-retry safety. Use only evidence available in this page. Propose one missing test, but do not approve it for me. Do not claim a duplicate charge without evidence.`
3. Confirm that the agent discovers the page tools, reads the snapshot, queries the high-severity retry evidence, and creates a pending test proposal.
4. Click **Approve test** as the human.
5. Ask the agent to read the updated state and propose a release decision. Confirm that HOLD is only a proposal and the header remains UNDECIDED.
6. Click **Confirm HOLD**, then inspect the activity trail for the attributed state sequence.

The repository currently reports 45 automated tests, a passing production build, a passing Playwright path, and zero high-severity npm audit findings. Native production discovery must be rechecked after the current branch is deployed.

Use **Reset demo** before repeating the flow. No login or credentials are required.

## Accuracy and privacy note

All evidence is synthetic. The scenario establishes a release risk, not a real duplicate charge. No company, customer, student, credential, host, raw path, query, header, body, cookie, address, timestamp, or local file path is exposed.
