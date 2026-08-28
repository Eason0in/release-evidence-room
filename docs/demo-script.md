# 80-second demo script

## 0–5 seconds — Hook

Hold on the green coverage panel.

> Eighteen out of eighteen tests passed. Would you ship this payment retry build?

## 5–11 seconds — Give the agent a bounded goal

Use this prompt in a WebMCP-capable browser:

```text
Review this release candidate for payment-retry safety.
Use only evidence available in this page.
Propose one missing test, but do not approve it for me.
Do not claim a duplicate charge without evidence.
```

Show this prompt in the real agent interface before the native tool calls.

## 11–27 seconds — Structured evidence

The native agent calls `get_release_snapshot` and `query_network_evidence`. The page focuses `netev_retry_017`.

> The agent queries page-owned evidence instead of scraping or guessing through the UI.

## 27–36 seconds — Reveal the gap

Point to the two idempotency key refs and two accepted operation refs.

> One payment intent created two accepted operations. That is a release risk, not proof of a duplicate charge.

## 36–50 seconds — Test proposal handoff

The agent calls `propose_test_case`. The proposal appears as pending. Click **Approve test**.

> The agent can only propose. I approve the missing test; nothing has been executed.

## 50–65 seconds — Decision proposal

Prompt:

```text
Read the current state and propose the release decision.
```

The agent reads version 14 and calls `propose_release_decision`. The HOLD card appears while the release header remains UNDECIDED.

> Even now, the agent has not changed the release decision.

## 65–72 seconds — Human decision

Click **Confirm HOLD**.

> The release owner makes the call.

## 72–80 seconds — Trust close

Show the activity trail and its v12→v16 sequence.

> Every read, proposal, and human action is attributed and versioned. There are no credentials, uploads, live company systems, or deploy tool.

## Optional Inworld narration

The checked-in narration text can be synthesized locally with Inworld's On-Demand plan. The API key is read only from the shell environment and is never written to the repository:

```bash
export INWORLD_API_KEY='your-key-from-the-inworld-portal'
npm run demo:tts:inworld
```

The default output is `demo-output/demo-narration-inworld.wav`. Use `INWORLD_VOICE_ID`, `INWORLD_MODEL_ID`, `INWORLD_TEXT_FILE`, or `INWORLD_OUTPUT` to override the defaults. Convert the WAV to the final video soundtrack with the local recording workflow; do not upload the API key or synthetic/private evidence.
