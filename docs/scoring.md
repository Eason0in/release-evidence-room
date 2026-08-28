# WebMCP Challenge scoring and improvement plan

The official rules define four equally weighted judging criteria and do not publish a numeric point scale. The numbers below are an internal 10-point estimate, not an official score or a prediction of the result.

Source of truth: [Official rules, section 7](https://webmcp.devpost.com/rules).

## Current estimate

| Criterion | Official question | Current estimate | Evidence | Main gap |
| --- | --- | ---: | --- | --- |
| WebMCP Leverage | How thoroughly and skillfully does the project use WebMCP? | **8.8 / 10** | Five real `registerTool` definitions, strict schemas, runtime validation, human-gated verification, result-linked decisions, idempotency and stale-state handling. | Fresh production-native discovery and a final native recording are still pending. |
| Execution | Is the project working, runnable, and a complete product experience? | **8.7 / 10** | Coherent evidence → approval → two-stage verification → decision flow, 66 automated tests, build, E2E, audit, and deterministic recording. | The new branch is not deployed; the deterministic recording is not native evidence; the final public YouTube video is not uploaded. |
| Potential Impact | Does it make a credible, specific case for a real audience and problem? | **8.8 / 10** | The room no longer stops at suspicion: it produces an evidence-linked, reproducible verdict before a release proposal while preserving a human gate. | The verifier models sanitized evidence and intentionally stops before a live TestLink/Charles/payment connector. |
| Creativity & Ambition | Is the concept novel and differentiated? | **8.9 / 10** | A release evidence room combines typed WebMCP accountability with exact replay and deterministic bounded monkey exploration rather than acting as a chat wrapper or deploy bot. | The video must make the distinction between model verification and live-system proof unmistakable. |

**Current total: 35.2 / 40 (88.0%).** This is a planning estimate only.

## Plausible post-gate target

If the production native gate passes and the final English video clearly shows discovery, all five tools, both verification strategies, one idempotent replay, one stale-state rejection, human approval, and human confirmation, a reasonable internal target is:

| Criterion | Target estimate |
| --- | ---: |
| WebMCP Leverage | 9.4 / 10 |
| Execution | 9.2 / 10 |
| Potential Impact | 8.9 / 10 |
| Creativity & Ambition | 9.2 / 10 |
| **Total** | **36.7 / 40 (91.8%)** |

The tie-break rule compares the first criterion first, so native WebMCP proof has the highest leverage on the overall competitiveness of this entry.

## Improvement priorities

1. **Highest impact:** Deploy only after review, then capture the production URL in a real ChatGPT in-app browser or WebMCP-enabled Chrome session. Show the five discovered tools and the human-only controls.
2. **Video clarity:** Keep the English narration under three minutes, show both verification strategies and their bounded verdicts, and make the `UNDECIDED → HOLD` human transition unmistakable.
3. **Trust proof:** Include the same-request replay returning `replayed: true` and a stale `state_conflict` result, then show that proposal counts do not change.
4. **Submission completeness:** Add the final public YouTube URL and recheck that the live URL, repository, English description, testing instructions, license, and video all agree.
5. **Impact framing:** Explain that the product is a reusable pattern for release, payment, migration, and other high-consequence workflows where evidence and authorization must remain separate.

## What not to add for points

Do not add live company data, raw packet capture, credentials, arbitrary network fetching, arbitrary-code or live-system test execution, or a deploy tool merely to appear more integrated. Those changes would weaken the privacy and accountability story and are outside the current submission scope.
