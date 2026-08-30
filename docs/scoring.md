# WebMCP Challenge scoring and improvement plan

The official rules define four equally weighted judging criteria and do not publish a numeric point scale. The numbers below are an internal 10-point estimate, not an official score or a prediction of the result.

Source of truth: [Official rules, section 7](https://webmcp.devpost.com/rules).

## Current estimate

| Criterion | Official question | Current estimate | Evidence | Main gap |
| --- | --- | ---: | --- | --- |
| WebMCP Leverage | How thoroughly and skillfully does the project use WebMCP? | **9.5 / 10** | Clean-state production-native discovery and execution of five real tools, strict schemas, runtime validation, human-gated verification, result-linked decisions, idempotent replay, and stale-state rejection. | Keep the public video and form claims aligned with the bounded five-tool surface. |
| Execution | Is the project working, runnable, and a complete product experience? | **9.4 / 10** | Deployed checkout target, clean native session handoff, 88 automated tests, build, E2E, zero-vulnerability audit, two verification strategies, persistence, and a public reviewed 2:45 walkthrough. | Complete the Devpost draft and keep every public URL aligned. |
| Potential Impact | Does it make a credible, specific case for a real audience and problem? | **8.9 / 10** | The recommended tester path starts from a visible QA target that creates the exact evidence the agent reviews, while direct root entry is honestly labeled as a deterministic fixture. | The checkout remains a synthetic browser-local target and intentionally stops before live TestLink/Charles/payment integrations. |
| Creativity & Ambition | Is the concept novel and differentiated? | **9.2 / 10** | A release evidence room combines typed WebMCP accountability with exact replay and deterministic bounded monkey exploration rather than acting as a chat wrapper or deploy bot. | Continue to frame the synthetic verifier as a reusable safety pattern rather than a live payment claim. |

**Current total: 37.0 / 40 (92.5%).** This is an internal estimate only, not an official score or a prediction. The remaining submission gate is completion and entrant review of the Devpost form.

## Submission-ready target

The clean-state production-native gate and local video review now support this internal target:

| Criterion | Target estimate |
| --- | ---: |
| WebMCP Leverage | 9.5 / 10 |
| Execution | 9.4 / 10 |
| Potential Impact | 8.9 / 10 |
| Creativity & Ambition | 9.2 / 10 |
| **Total** | **37.0 / 40 (92.5%)** |

The tie-break rule compares the first criterion first, so native WebMCP proof has the highest leverage on the overall competitiveness of this entry.

## Improvement priorities

1. **Submission completeness:** Add the public video URL to Devpost and recheck that the live URL, repository, English description, testing instructions, license, and video all agree.
2. **Trust proof:** Preserve the same-request replay, stale `state_conflict`, rejected risk-linked `READY`, and human-only decision language in the form copy.
3. **Judge speed:** Keep the three-minute walkthrough and copy-ready prompts immediately discoverable from the default branch.
4. **Impact framing:** Explain that the product is a reusable pattern for release, payment, migration, and other high-consequence workflows where evidence and authorization must remain separate.

## What not to add for points

Do not add live company data, raw packet capture, credentials, arbitrary network fetching, arbitrary-code or live-system test execution, or a deploy tool merely to appear more integrated. Those changes would weaken the privacy and accountability story and are outside the current submission scope.
