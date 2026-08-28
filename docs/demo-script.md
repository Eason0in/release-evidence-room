# 100-second final demo script

## 0–10 seconds — Generate the evidence

Open `/checkout`, click **Place order · lose response**, then **Retry with a new key**. Show `idem_7f3c → op_01`, `idem_b15a → op_02`, and **2 side effects observed**. Send the session to Release Evidence Room.

> This public fictional checkout really generates the trace. There is no account, card, backend, or real payment.

## 10–16 seconds — Hook

Hold on the green coverage panel.

> Eighteen out of eighteen tests passed. Would you ship this payment retry build?

## 16–24 seconds — Give the agent a bounded goal

Use this prompt in a WebMCP-capable browser:

```text
Review this release candidate for payment-retry safety.
Use only evidence available in this page.
Propose one missing test, but do not approve it for me.
Do not claim a duplicate charge without evidence.
```

Show this prompt in the real agent interface before the native tool calls.

## 24–38 seconds — Structured evidence

The native agent calls `get_release_snapshot` and `query_network_evidence`. The page focuses `netev_retry_017`.

> The agent queries page-owned evidence instead of scraping or guessing through the UI.

## 38–48 seconds — Reveal the gap

Point to the two idempotency key refs and two accepted operation refs.

> One payment intent created two accepted operations. That is a release risk, not proof of a duplicate charge.

## 48–60 seconds — Test proposal handoff

The agent calls `propose_test_case`. The proposal appears as pending. Click **Approve test**.

> The agent proposes the test. I decide whether its bounded verification may run.

## 60–78 seconds — Two-stage verification

The agent calls `run_approved_verification` twice: first with `targeted_retry`, then with `seeded_monkey`, seed `37`, and a `20`-step cap. Show `V-001`, `V-002`, both `RISK CONFIRMED`, and the monkey trace reaching the modeled retry in four steps.

> The exact replay reproduces the two side effects. A seeded state-machine run reaches the same failure through refresh and response-loss transitions. Both are real executions of the synthetic model—not claims about a live payment service.

## 78–88 seconds — Decision proposal

Prompt:

```text
Read the current state and propose the release decision.
```

The agent reads version 16 and calls `propose_release_decision` with `V-002`. The HOLD card appears while the release header remains UNDECIDED.

> Even now, the agent has not changed the release decision.

## 88–93 seconds — Human decision

Click **Confirm HOLD**.

> The release owner makes the call.

## 93–100 seconds — Trust close

Show the activity trail and its v12→v18 sequence.

> Every read, proposal, and human action is attributed and versioned. There are no credentials, uploads, live company systems, or deploy tool.

## Spoken narration

Use [demo-narration.txt](demo-narration.txt) for the English voiceover. Keep the prompt and native tool calls visible while the narration explains the evidence and the human boundary. The current Inworld WAV is a local working artifact; the final submission must use a public video under three minutes.

## Optional Inworld narration generation

The checked-in narration text can be synthesized locally with Inworld's On-Demand plan. The API key is read only from the shell environment and is never written to the repository:

```bash
export INWORLD_API_KEY='your-key-from-the-inworld-portal'
npm run demo:tts:inworld
```

The default output is `demo-output/demo-narration-inworld.wav`. The helper intentionally limits each request to Inworld's documented 2,000-character maximum. Use `INWORLD_VOICE_ID`, `INWORLD_MODEL_ID`, `INWORLD_TEXT_FILE`, or `INWORLD_OUTPUT` to override the defaults. Convert the WAV to the final video soundtrack with the local recording workflow; do not upload the API key or synthetic/private evidence.

`npm run demo:record` is a deterministic Playwright integration recording with an explicit `SIMULATED INTEGRATION TEST · NOT NATIVE EVIDENCE` watermark. It is useful for regression review, but the final challenge video must show the real WebMCP-capable browser/agent interaction.
