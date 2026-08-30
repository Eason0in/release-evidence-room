# 2:45 final demo script

This script matches the reviewed native-WebMCP YouTube upload package. The recording is page-only: it shows the production application and explicit human controls without browser chrome, account UI, or private context. Added banners are labeled `RECORDED NATIVE WEBMCP RESULT`, `RECORDED NATIVE WEBMCP GUARD`, or `RECORDED HUMAN ACTION` so they are not mistaken for browser-native UI.

## 0:00–0:14 — Green checks, missing evidence

Open on the Release Evidence Room with `18 / 18` release checks passing and the decision still `UNDECIDED`.

> Eighteen out of eighteen release checks passed. Would you ship this payment retry build?

## 0:14–0:33 — Generate the fictional checkout trace

At `/checkout`, click **Place order · lose response**, then **Retry with a new key**. Show `idem_7f3c → op_01`, `idem_b15a → op_02`, and **2 side effects observed**. Send the session to the Release Evidence Room.

> No account, card, backend, or real payment is involved.

## 0:33–0:59 — Build the bounded evidence case

The production page registers and executes:

1. `get_release_snapshot`
2. `query_network_evidence`
3. `propose_test_case`

Both `netev_response_016` and `netev_retry_017` are linked to pending proposal `P-017`. The labeled result banner summarizes the recorded native calls while the production UI shows their effects.

> The agent links both attempts to a missing response-loss test. It does not scrape the interface or claim that a customer was charged twice.

## 0:59–1:18 — Prove the human approval gate

Call `run_approved_verification` while `P-017` is still pending. Show the labeled `invalid_test_proposal` guard and unchanged state version. Then click **Approve test** as the human.

> When the agent tries to run it early, the page rejects the request. I approve the test as the human release owner.

## 1:18–1:50 — Run two bounded verification strategies

After approval, read state version `14`. Run `targeted_retry`, then `seeded_monkey` with seed `37` and `maxSteps: 20`. Show `V-001`, `V-002`, two modeled side effects, and `RISK CONFIRMED` for both bounded runs.

> Both results say risk confirmed for this synthetic model, not for a live payment service.

## 1:50–2:16 — Show retry and decision guards

Replay an identical request ID and show `replayed: true` with no duplicate result. Submit a stale expected state version and show `state_conflict`. Attempt a risk-linked `READY` decision and show `invalid_verification_result`.

> A stale state version is rejected instead of overwriting newer evidence. The agent cannot turn that risk into READY.

## 2:16–2:35 — Keep the final decision human-controlled

Create pending HOLD proposal `P-018`; keep the header `UNDECIDED`. Click **Confirm HOLD** as the human and show the transition to state version `18`.

> It proposes HOLD, but the release header remains undecided until I confirm it.

## 2:35–2:45 — Close on attribution and scope

Reload and show that `HOLD`, `P-017`, `P-018`, `V-001`, and `V-002` persist in the versioned evidence and decision trail. Finish on the project end card.

> Those five page tools expose no arbitrary traffic, code, approvals, or deployments. It assembles and verifies the bounded evidence case. The human makes the release decision.

## Spoken narration

The exact English voiceover is checked in at [demo-narration.txt](demo-narration.txt). The reviewed local upload package uses that narration, English captions, and no music.

## Optional Inworld narration generation

The checked-in narration can be synthesized locally with Inworld's On-Demand plan. The API key is read only from the shell environment and is never written to the repository:

```bash
export INWORLD_API_KEY='your-key-from-the-inworld-portal'
npm run demo:tts:inworld
```

The default output is `demo-output/demo-narration-inworld.wav`. The helper limits each request to Inworld's documented 2,000-character maximum. Use `INWORLD_VOICE_ID`, `INWORLD_MODEL_ID`, `INWORLD_TEXT_FILE`, or `INWORLD_OUTPUT` to override the defaults. Never upload the API key or synthetic/private evidence.

`npm run demo:record` remains a deterministic Playwright integration recording with an explicit `SIMULATED INTEGRATION TEST · NOT NATIVE EVIDENCE` watermark. It is useful for regression review, but it is not the native challenge recording.
