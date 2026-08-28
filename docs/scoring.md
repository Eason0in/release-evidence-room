# WebMCP Challenge scoring and improvement plan

The official rules define four equally weighted judging criteria and do not publish a numeric point scale. The numbers below are an internal 10-point estimate, not an official score or a prediction of the result.

Source of truth: [Official rules, section 7](https://webmcp.devpost.com/rules).

## Current estimate

| Criterion | Official question | Current estimate | Evidence | Main gap |
| --- | --- | ---: | --- | --- |
| WebMCP Leverage | How thoroughly and skillfully does the project use WebMCP? | **9.1 / 10** | Earlier production-native discovery and execution of five real tools, strict schemas, runtime validation, human-gated verification, result-linked decisions, idempotent replay, and stale-state rejection. | The new two-route build still needs production-native recertification and a judge-readable final video. |
| Execution | Is the project working, runnable, and a complete product experience? | **9.1 / 10** | Deployed checkout target, validated session handoff, 83 automated tests, build, E2E, zero-vulnerability audit, two verification strategies, overwrite protection, cross-tab synchronization, and v2 audit migration. | A clean-state end-to-end native recertification and the final public YouTube video remain. |
| Potential Impact | Does it make a credible, specific case for a real audience and problem? | **8.9 / 10** | The recommended tester path starts from a visible QA target that creates the exact evidence the agent reviews, while direct root entry is honestly labeled as a deterministic fixture. | The checkout remains a synthetic browser-local target and intentionally stops before live TestLink/Charles/payment integrations. |
| Creativity & Ambition | Is the concept novel and differentiated? | **9.1 / 10** | A release evidence room combines typed WebMCP accountability with exact replay and deterministic bounded monkey exploration rather than acting as a chat wrapper or deploy bot. | The video must make the distinction between model verification and live-system proof unmistakable. |

**Current total: 36.2 / 40 (90.5%).** This is a planning estimate only and reflects the remaining clean-state native recertification and video gates.

## Plausible post-video target

If the two-route build passes the production-native gate and the final English video clearly shows discovery, all five tools, both verification strategies, one idempotent replay, one stale-state rejection, human approval, and human confirmation, a reasonable internal target is:

| Criterion | Target estimate |
| --- | ---: |
| WebMCP Leverage | 9.5 / 10 |
| Execution | 9.4 / 10 |
| Potential Impact | 8.9 / 10 |
| Creativity & Ambition | 9.2 / 10 |
| **Total** | **37.0 / 40 (92.5%)** |

The tie-break rule compares the first criterion first, so native WebMCP proof has the highest leverage on the overall competitiveness of this entry.

## Improvement priorities

1. **Video clarity:** Record the verified production flow in the real ChatGPT in-app browser, keep the English narration under three minutes, and make the `UNDECIDED → HOLD` human transition unmistakable.
2. **Trust proof:** Include the same-request replay returning `replayed: true`, the stale `state_conflict`, and the rejected risk-linked `READY` without overloading the viewer.
3. **Submission completeness:** Add the final public YouTube URL and recheck that the live URL, repository, English description, testing instructions, license, and video all agree.
4. **Impact framing:** Explain that the product is a reusable pattern for release, payment, migration, and other high-consequence workflows where evidence and authorization must remain separate.

## What not to add for points

Do not add live company data, raw packet capture, credentials, arbitrary network fetching, arbitrary-code or live-system test execution, or a deploy tool merely to appear more integrated. Those changes would weaken the privacy and accountability story and are outside the current submission scope.
