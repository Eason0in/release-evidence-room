import { createReleaseRoomStore } from "../domain/store";
import { reviewTestProposal } from "../domain/workflow";
import { createReleaseEvidenceHandlers } from "./handlers";

const signal = new AbortController().signal;

describe("WebMCP handlers", () => {
  beforeEach(() => localStorage.clear());

  it("records a snapshot read without changing the state version", () => {
    const store = createReleaseRoomStore(localStorage);
    const handlers = createReleaseEvidenceHandlers(store);

    const result = handlers.getReleaseSnapshot(signal);

    expect(result).toMatchObject({
      releaseId: "rel_demo_1042",
      stateVersion: 12,
      tests: { total: 18, passed: 18, failed: 0 },
      proposalCounts: { pending: 0, approved: 0, confirmed: 0, rejected: 0 },
    });
    expect(store.getState()).toMatchObject({
      stateVersion: 12,
      activity: [
        { actor: "agent", action: "read_release_snapshot", fromVersion: 12, toVersion: 12 },
      ],
    });
  });

  it("returns proposal details needed for a later agent handoff", () => {
    const store = createReleaseRoomStore(localStorage);
    const handlers = createReleaseEvidenceHandlers(store);
    handlers.proposeTestCase(
      {
        expectedStateVersion: 12,
        clientRequestId: "req-handoff-test",
        title: "Retry safely after an accepted response is lost",
        given: "The first accepted response is lost.",
        when: "The same payment intent is retried.",
        then: "The original operation and stable key are reused.",
        evidenceIds: ["netev_retry_017", "netev_response_016"],
      },
      signal,
    );

    const result = handlers.getReleaseSnapshot(signal);

    expect(result).toMatchObject({
      stateVersion: 13,
      proposals: [
        {
          proposalId: "P-017",
          kind: "test_case",
          status: "pending",
          title: "Retry safely after an accepted response is lost",
          evidenceIds: ["netev_retry_017", "netev_response_016"],
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain("requestFingerprint");
  });

  it("focuses matching evidence while keeping the query read-only", () => {
    const store = createReleaseRoomStore(localStorage);
    const handlers = createReleaseEvidenceHandlers(store);

    const result = handlers.queryNetworkEvidence(
      { riskType: "duplicate_side_effect", severity: "high", limit: 5 },
      signal,
    );

    expect(result).toMatchObject({
      matched: 1,
      items: [{ evidenceId: "netev_retry_017" }],
    });
    expect(store.getState()).toMatchObject({
      stateVersion: 12,
      focusedEvidenceIds: ["netev_retry_017"],
      activity: [{ actor: "agent", action: "queried_network_evidence" }],
    });
  });

  it("stores an agent test proposal but returns no internal fingerprint", () => {
    const store = createReleaseRoomStore(localStorage);
    const handlers = createReleaseEvidenceHandlers(store);
    const input = {
      expectedStateVersion: 12,
      clientRequestId: "req-handler-test",
      title: "Retry safely",
      given: "The first accepted response is lost.",
      when: "The same intent is retried.",
      then: "The original key and operation are reused.",
      evidenceIds: ["netev_retry_017"],
    } as const;

    const result = handlers.proposeTestCase(input, signal);

    expect(result).toMatchObject({
      ok: true,
      replayed: false,
      stateVersion: 13,
      proposal: { proposalId: "P-017", status: "pending" },
    });
    expect(JSON.stringify(result)).not.toContain("requestFingerprint");
    expect(store.getState()).toMatchObject({
      stateVersion: 13,
      humanDecision: "pending",
      proposals: [{ proposalId: "P-017", status: "pending" }],
    });

    const replay = handlers.proposeTestCase(input, signal);
    expect(replay).toMatchObject({ ok: true, replayed: true, stateVersion: 13 });
    expect(store.getState().proposals).toHaveLength(1);
  });

  it("returns a structured conflict without changing stored state", () => {
    const store = createReleaseRoomStore(localStorage);
    const handlers = createReleaseEvidenceHandlers(store);

    const result = handlers.proposeReleaseDecision(
      {
        expectedStateVersion: 11,
        clientRequestId: "req-handler-stale",
        recommendation: "hold",
        rationale: "The state used by the agent is stale.",
        evidenceIds: ["netev_retry_017"],
        testProposalId: "P-stale",
        verificationResultId: "V-stale",
      },
      signal,
    );

    expect(result).toEqual({
      ok: false,
      code: "state_conflict",
      currentStateVersion: 12,
      message: "Expected state version 11, but current version is 12.",
    });
    expect(store.getState()).toMatchObject({ stateVersion: 12, proposals: [] });
  });

  it("stores a public verification result and returns it in later snapshots", () => {
    const store = createReleaseRoomStore(localStorage);
    const handlers = createReleaseEvidenceHandlers(store);
    handlers.proposeTestCase(
      {
        expectedStateVersion: 12,
        clientRequestId: "req-handler-verification-test",
        title: "Retry safely",
        given: "The first accepted response is lost.",
        when: "The same intent is retried.",
        then: "The original key and operation are reused.",
        evidenceIds: ["netev_retry_017", "netev_response_016"],
      },
      signal,
    );
    const approved = reviewTestProposal(store.getState(), "P-017", "approve");
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    store.setState(approved.state);

    const result = handlers.runApprovedVerification(
      {
        expectedStateVersion: 14,
        clientRequestId: "verify-handler-targeted-001",
        testProposalId: "P-017",
        strategy: "targeted_retry",
      },
      signal,
    );

    expect(result).toMatchObject({
      ok: true,
      replayed: false,
      stateVersion: 15,
      verification: {
        verificationResultId: "V-001",
        strategy: "targeted_retry",
        verdict: "risk_confirmed",
      },
    });
    expect(JSON.stringify(result)).not.toContain("requestFingerprint");

    const snapshot = handlers.getReleaseSnapshot(signal);
    expect(snapshot).toMatchObject({
      stateVersion: 15,
      verificationCounts: {
        riskConfirmed: 1,
        notReproduced: 0,
        inconclusive: 0,
      },
      verifications: [
        {
          verificationResultId: "V-001",
          testProposalId: "P-017",
          verdict: "risk_confirmed",
        },
      ],
    });
  });
});
