# WebMCP Challenge scoring and improvement plan

The official rules define four equally weighted judging criteria and do not publish a numeric point scale. The numbers below are an internal 10-point estimate, not an official score or a prediction of the result.

Source of truth: [Official rules, section 7](https://webmcp.devpost.com/rules).

## Current estimate

| Criterion | Official question | Current estimate | Evidence | Main gap |
| --- | --- | ---: | --- | --- |
| WebMCP Leverage | How thoroughly and skillfully does the project use WebMCP? | **8.3 / 10** | Four real `registerTool` definitions, strict schemas, runtime validation, shared domain transitions, native-compatible execute fallback, idempotency and stale-state handling. | Fresh production-native discovery and a final native recording are still pending. |
| Execution | Is the project working, runnable, and a complete product experience? | **8.2 / 10** | Public no-login app, coherent evidence → proposal → human decision flow, 45 automated tests, build, E2E, audit, and deterministic recording. | The deterministic recording is not native evidence; the final public YouTube video is not uploaded. |
| Potential Impact | Does it make a credible, specific case for a real audience and problem? | **8.5 / 10** | Release engineers face green-test / retry-safety gaps; the demo shows a concrete exactly-once scenario and an accountable handoff. | The fixture is synthetic and intentionally stops before a live TestLink/Charles connector. |
| Creativity & Ambition | Is the concept novel and differentiated? | **8.4 / 10** | A release evidence room treats WebMCP as a typed accountability boundary, not a chat wrapper or button macro. | Add one more clearly explained workflow variation without broadening into unsafe autonomous deployment. |

**Current total: 33.4 / 40 (83.5%).** This is a planning estimate only.

## Plausible post-gate target

If the production native gate passes and the final English video clearly shows discovery, all four calls, one idempotent replay, one stale-state rejection, human approval, and human confirmation, a reasonable internal target is:

| Criterion | Target estimate |
| --- | ---: |
| WebMCP Leverage | 9.2 / 10 |
| Execution | 9.0 / 10 |
| Potential Impact | 8.6 / 10 |
| Creativity & Ambition | 8.9 / 10 |
| **Total** | **35.7 / 40 (89.3%)** |

The tie-break rule compares the first criterion first, so native WebMCP proof has the highest leverage on the overall competitiveness of this entry.

## Improvement priorities

1. **Highest impact:** Capture and verify the production URL in a real ChatGPT in-app browser or WebMCP-enabled Chrome session. Show the four discovered tools and the human-only controls.
2. **Video clarity:** Keep the English narration under three minutes, show the exact prompt, name each tool on screen, and make the `UNDECIDED → HOLD` human transition unmistakable.
3. **Trust proof:** Include the same-request replay returning `replayed: true` and a stale `state_conflict` result, then show that proposal counts do not change.
4. **Submission completeness:** Add the final public YouTube URL and recheck that the live URL, repository, English description, testing instructions, license, and video all agree.
5. **Impact framing:** Explain that the product is a reusable pattern for release, payment, migration, and other high-consequence workflows where evidence and authorization must remain separate.

## What not to add for points

Do not add live company data, raw packet capture, credentials, arbitrary network fetching, autonomous test execution, or a deploy tool merely to appear more integrated. Those changes would weaken the privacy and accountability story and are outside the current submission scope.
