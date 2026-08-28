import { createDemoReleaseState } from "./evidence";
import {
  proposeReleaseDecision,
  proposeTestCase,
  reviewReleaseDecision,
  reviewTestProposal,
} from "./workflow";

const testProposalInput = {
  expectedStateVersion: 12,
  clientRequestId: "req-demo-test-01",
  title: "Retry after acceptance reuses the idempotency key",
  given: "The server accepts a payment attempt and its response is lost.",
  when: "The mobile client retries the same payment intent.",
  then: "The retry resolves to the original operation using the original key.",
  evidenceIds: ["netev_retry_017", "netev_response_016"],
} as const;

describe("proposal workflow", () => {
  it("creates a pending test proposal without approving it", () => {
    const state = createDemoReleaseState();

    const result = proposeTestCase(state, testProposalInput);

    expect(result).toMatchObject({
      ok: true,
      replayed: false,
      value: { proposalId: "P-017", kind: "test_case", status: "pending" },
      state: { stateVersion: 13, humanDecision: "pending" },
    });
    if (result.ok) {
      expect(result.state.activity.at(-1)).toMatchObject({
        actor: "agent",
        action: "proposed_test_case",
        fromVersion: 12,
        toVersion: 13,
      });
    }
  });

  it("replays the original result for a duplicate client request", () => {
    const first = proposeTestCase(createDemoReleaseState(), testProposalInput);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const replay = proposeTestCase(first.state, testProposalInput);

    expect(replay).toMatchObject({
      ok: true,
      replayed: true,
      value: { proposalId: "P-017" },
      state: { stateVersion: 13 },
    });
    if (replay.ok) {
      expect(replay.state.proposals).toHaveLength(1);
      expect(replay.state.activity).toHaveLength(1);
    }
  });

  it("rejects a stale state version without mutating state", () => {
    const state = createDemoReleaseState();

    const result = proposeTestCase(state, {
      ...testProposalInput,
      expectedStateVersion: 11,
      clientRequestId: "req-stale-test",
    });

    expect(result).toEqual({
      ok: false,
      code: "state_conflict",
      currentStateVersion: 12,
      message: "Expected state version 11, but current version is 12.",
    });
    expect(state.stateVersion).toBe(12);
    expect(state.proposals).toHaveLength(0);
  });

  it("rejects proposal evidence that is not present in the room", () => {
    const result = proposeTestCase(createDemoReleaseState(), {
      ...testProposalInput,
      clientRequestId: "req-invalid-evidence",
      evidenceIds: ["netev_missing"],
    });

    expect(result).toMatchObject({
      ok: false,
      code: "invalid_evidence",
      currentStateVersion: 12,
    });
  });

  it("requires a human action to approve a proposed test", () => {
    const proposed = proposeTestCase(createDemoReleaseState(), testProposalInput);
    expect(proposed.ok).toBe(true);
    if (!proposed.ok) return;

    const reviewed = reviewTestProposal(proposed.state, "P-017", "approve");

    expect(reviewed).toMatchObject({
      ok: true,
      state: { stateVersion: 14 },
      value: { proposalId: "P-017", status: "approved" },
    });
    if (reviewed.ok) {
      expect(reviewed.state.activity.at(-1)).toMatchObject({
        actor: "human",
        action: "approved_test_case",
      });
    }
  });

  it("keeps the release undecided until a human confirms HOLD", () => {
    const proposedTest = proposeTestCase(createDemoReleaseState(), testProposalInput);
    expect(proposedTest.ok).toBe(true);
    if (!proposedTest.ok) return;
    const approvedTest = reviewTestProposal(proposedTest.state, "P-017", "approve");
    expect(approvedTest.ok).toBe(true);
    if (!approvedTest.ok) return;

    const proposedDecision = proposeReleaseDecision(approvedTest.state, {
      expectedStateVersion: 14,
      clientRequestId: "req-demo-decision-01",
      recommendation: "hold",
      rationale:
        "Exactly-once behavior is unproven until the approved retry test passes.",
      evidenceIds: ["netev_retry_017", "netev_response_016"],
      testProposalId: "P-017",
    });

    expect(proposedDecision).toMatchObject({
      ok: true,
      state: { stateVersion: 15, humanDecision: "pending" },
      value: { proposalId: "P-018", status: "pending", recommendation: "hold" },
    });
    if (!proposedDecision.ok) return;

    const confirmed = reviewReleaseDecision(
      proposedDecision.state,
      "P-018",
      "confirm",
    );

    expect(confirmed).toMatchObject({
      ok: true,
      state: { stateVersion: 16, humanDecision: "hold" },
      value: { proposalId: "P-018", status: "confirmed" },
    });
    if (confirmed.ok) {
      expect(confirmed.state.activity.at(-1)).toMatchObject({
        actor: "human",
        action: "confirmed_release_hold",
      });
    }
  });

  it("rejects a second final release confirmation", () => {
    const firstProposal = proposeReleaseDecision(createDemoReleaseState(), {
      expectedStateVersion: 12,
      clientRequestId: "req-first-decision",
      recommendation: "hold",
      rationale: "Retry safety remains unproven.",
      evidenceIds: ["netev_retry_017"],
    });
    expect(firstProposal.ok).toBe(true);
    if (!firstProposal.ok) return;

    const secondProposal = proposeReleaseDecision(firstProposal.state, {
      expectedStateVersion: 13,
      clientRequestId: "req-second-decision",
      recommendation: "ready",
      rationale: "All automated checks passed.",
      evidenceIds: ["netev_response_016"],
    });
    expect(secondProposal.ok).toBe(true);
    if (!secondProposal.ok) return;

    const firstConfirmation = reviewReleaseDecision(
      secondProposal.state,
      "P-017",
      "confirm",
    );
    expect(firstConfirmation.ok).toBe(true);
    if (!firstConfirmation.ok) return;

    const secondConfirmation = reviewReleaseDecision(
      firstConfirmation.state,
      "P-018",
      "confirm",
    );

    expect(secondConfirmation).toEqual({
      ok: false,
      code: "release_already_decided",
      currentStateVersion: 15,
      message: "The release decision is already final.",
    });
    expect(firstConfirmation.state).toMatchObject({
      stateVersion: 15,
      humanDecision: "hold",
      proposals: [
        { proposalId: "P-017", status: "confirmed" },
        { proposalId: "P-018", status: "pending" },
      ],
    });
  });
});
