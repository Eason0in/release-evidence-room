# Validation record

This file separates deterministic integration evidence from native WebMCP evidence so the two are never conflated.

## Automated evidence

| Layer | Command | Current result |
| --- | --- | --- |
| Domain, persistence, components, and WebMCP adapter | `npm test` | 39 tests passed |
| TypeScript and production bundle | `npm run build` | Passed |
| Dependency audit | `npm audit --audit-level=high` | 0 vulnerabilities |
| Full proposal and human-confirmation browser path | `npm run test:e2e` | 1 Playwright test passed |
| Recorded deterministic browser path | `npm run demo:record` | 1 recorded Playwright test passed |
| Chrome Lighthouse desktop | Chrome DevTools navigation audit | Accessibility 100, Best Practices 100, SEO 100, Agentic Browsing 100 |

The Playwright path injects a minimal `document.modelContext` registry. It proves that the application registers the intended tool definitions and that executing those definitions reaches the real application handlers. It does not prove native ChatGPT or Chrome tool discovery.

## Native WebMCP acceptance gate

Status: pending a supported browser session with WebMCP enabled. Chrome 151 was detected locally, but `document.modelContext` remained unavailable because the experimental WebMCP runtime flag had not yet been enabled and the browser relaunched.

Native acceptance requires all of the following on the production URL:

- `document.modelContext` is available.
- Discovery returns exactly `get_release_snapshot`, `query_network_evidence`, `propose_test_case`, and `propose_release_decision`.
- All four tools execute successfully against a freshly reset room.
- Repeating a proposal with the same `clientRequestId` creates no duplicate.
- A stale `expectedStateVersion` produces no mutation.
- The agent cannot approve a test, confirm READY/HOLD, execute a test, or deploy.
- The human controls and versioned activity trail reflect the native tool calls.

The status above is updated only after fresh runtime evidence is captured.
