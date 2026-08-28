# 90-second demo script

## 0–8 seconds — Hook

Hold on the green coverage panel.

> Eighteen out of eighteen tests passed. Would you ship this payment retry build?

## 8–14 seconds — Give the agent a bounded goal

Use this prompt in a WebMCP-capable browser:

```text
Review this release candidate for payment-retry safety.
Use only evidence available in this page.
Propose one missing test, but do not approve it for me.
Do not claim a duplicate charge without evidence.
```

## 14–30 seconds — Structured evidence

The agent calls `get_release_snapshot` and `query_network_evidence`. The page focuses `netev_retry_017`.

> The agent queries page-owned evidence instead of scraping or guessing through the UI.

## 30–42 seconds — Reveal the gap

Point to the two idempotency key refs and two accepted operation refs.

> One payment intent created two accepted operations. That is a release risk, not proof of a duplicate charge.

## 42–52 seconds — Test proposal handoff

The agent calls `propose_test_case`. The proposal appears as pending. Click **Approve test**.

> The agent can only propose. I approve the missing test; nothing has been executed.

## 52–70 seconds — Decision proposal

Prompt:

```text
Read the current state and propose the release decision.
```

The agent reads version 14 and calls `propose_release_decision`. The HOLD card appears while the release header remains UNDECIDED.

> Even now, the agent has not changed the release decision.

## 70–78 seconds — Human decision

Click **Confirm HOLD**.

> The release owner makes the call.

## 78–90 seconds — Trust close

Show the activity trail and its v12→v16 sequence.

> Every read, proposal, and human action is attributed and versioned. There are no credentials, uploads, live company systems, or deploy tool.
