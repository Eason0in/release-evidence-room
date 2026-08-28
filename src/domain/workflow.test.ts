import { createDemoReleaseState } from "./evidence";
import {
  proposeReleaseDecision,
  proposeTestCase,
  runApprovedVerification,
  reviewReleaseDecision,
  reviewTestProposal,
  type ApprovedVerificationInput,
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
    const verifiedTest = runApprovedVerification(approvedTest.state, {
      expectedStateVersion: 14,
      clientRequestId: "verify-demo-decision-01",
      testProposalId: "P-017",
      strategy: "targeted_retry",
    });
    expect(verifiedTest.ok).toBe(true);
    if (!verifiedTest.ok) return;

    const proposedDecision = proposeReleaseDecision(verifiedTest.state, {
      expectedStateVersion: 15,
      clientRequestId: "req-demo-decision-01",
      recommendation: "hold",
      rationale:
        "The approved retry verification reproduced two side effects.",
      evidenceIds: ["netev_retry_017", "netev_response_016"],
      testProposalId: "P-017",
      verificationResultId: "V-001",
    });

    expect(proposedDecision).toMatchObject({
      ok: true,
      state: { stateVersion: 16, humanDecision: "pending" },
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
      state: { stateVersion: 17, humanDecision: "hold" },
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
    const proposedTest = proposeTestCase(createDemoReleaseState(), testProposalInput);
    expect(proposedTest.ok).toBe(true);
    if (!proposedTest.ok) return;
    const approvedTest = reviewTestProposal(proposedTest.state, "P-017", "approve");
    expect(approvedTest.ok).toBe(true);
    if (!approvedTest.ok) return;
    const verifiedTest = runApprovedVerification(approvedTest.state, {
      expectedStateVersion: 14,
      clientRequestId: "verify-two-decisions",
      testProposalId: "P-017",
      strategy: "targeted_retry",
    });
    expect(verifiedTest.ok).toBe(true);
    if (!verifiedTest.ok) return;

    const firstProposal = proposeReleaseDecision(verifiedTest.state, {
      expectedStateVersion: 15,
      clientRequestId: "req-first-decision",
      recommendation: "hold",
      rationale: "Retry safety failed verification.",
      evidenceIds: ["netev_retry_017"],
      testProposalId: "P-017",
      verificationResultId: "V-001",
    });
    expect(firstProposal.ok).toBe(true);
    if (!firstProposal.ok) return;

    const secondProposal = proposeReleaseDecision(firstProposal.state, {
      expectedStateVersion: 16,
      clientRequestId: "req-second-decision",
      recommendation: "hold",
      rationale: "The same verification remains release blocking.",
      evidenceIds: ["netev_response_016"],
      testProposalId: "P-017",
      verificationResultId: "V-001",
    });
    expect(secondProposal.ok).toBe(true);
    if (!secondProposal.ok) return;

    const firstConfirmation = reviewReleaseDecision(
      secondProposal.state,
      "P-018",
      "confirm",
    );
    expect(firstConfirmation.ok).toBe(true);
    if (!firstConfirmation.ok) return;

    const secondConfirmation = reviewReleaseDecision(
      firstConfirmation.state,
      "P-019",
      "confirm",
    );

    expect(secondConfirmation).toEqual({
      ok: false,
      code: "release_already_decided",
      currentStateVersion: 18,
      message: "The release decision is already final.",
    });
    expect(firstConfirmation.state).toMatchObject({
      stateVersion: 18,
      humanDecision: "hold",
      proposals: [
        { proposalId: "P-017", status: "approved" },
        { proposalId: "P-018", status: "confirmed" },
        { proposalId: "P-019", status: "pending" },
      ],
    });
  });

  it("requires human approval before running a targeted verification", () => {
    const proposed = proposeTestCase(createDemoReleaseState(), testProposalInput);
    expect(proposed.ok).toBe(true);
    if (!proposed.ok) return;

    const result = runApprovedVerification(proposed.state, {
      expectedStateVersion: 13,
      clientRequestId: "verify-before-approval",
      testProposalId: "P-017",
      strategy: "targeted_retry",
    });

    expect(result).toMatchObject({
      ok: false,
      code: "invalid_test_proposal",
      currentStateVersion: 13,
    });
  });

  it("records a reproducible targeted verification for an approved test", () => {
    const proposed = proposeTestCase(createDemoReleaseState(), testProposalInput);
    expect(proposed.ok).toBe(true);
    if (!proposed.ok) return;
    const approved = reviewTestProposal(proposed.state, "P-017", "approve");
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;

    const input = {
      expectedStateVersion: 14,
      clientRequestId: "verify-targeted-001",
      testProposalId: "P-017",
      strategy: "targeted_retry",
    } as const;
    const result = runApprovedVerification(approved.state, input);

    expect(result).toMatchObject({
      ok: true,
      replayed: false,
      value: {
        verificationResultId: "V-001",
        testProposalId: "P-017",
        strategy: "targeted_retry",
        verdict: "risk_confirmed",
        observedSideEffects: 2,
      },
      state: { stateVersion: 15 },
    });
    if (!result.ok) return;
    expect(result.state.activity.at(-1)).toMatchObject({
      actor: "agent",
      action: "ran_approved_verification",
      fromVersion: 14,
      toVersion: 15,
    });

    const replay = runApprovedVerification(result.state, input);
    expect(replay).toMatchObject({
      ok: true,
      replayed: true,
      value: { verificationResultId: "V-001" },
      state: { stateVersion: 15 },
    });
    if (replay.ok) expect(replay.state.verifications).toHaveLength(1);
  });

  it("requires a verification result before proposing a release decision", () => {
    const proposed = proposeTestCase(createDemoReleaseState(), testProposalInput);
    expect(proposed.ok).toBe(true);
    if (!proposed.ok) return;
    const approved = reviewTestProposal(proposed.state, "P-017", "approve");
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;

    const result = proposeReleaseDecision(approved.state, {
      expectedStateVersion: 14,
      clientRequestId: "decision-without-verification",
      recommendation: "hold",
      rationale: "The approved test has not been executed.",
      evidenceIds: ["netev_retry_017"],
      testProposalId: "P-017",
      verificationResultId: "V-missing",
    });

    expect(result).toMatchObject({
      ok: false,
      code: "invalid_verification_result",
      currentStateVersion: 14,
    });
  });

  it("rejects READY when the linked verification confirms risk", () => {
    const proposed = proposeTestCase(createDemoReleaseState(), testProposalInput);
    expect(proposed.ok).toBe(true);
    if (!proposed.ok) return;
    const approved = reviewTestProposal(proposed.state, "P-017", "approve");
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    const verified = runApprovedVerification(approved.state, {
      expectedStateVersion: 14,
      clientRequestId: "verify-ready-risk",
      testProposalId: "P-017",
      strategy: "targeted_retry",
    });
    expect(verified.ok).toBe(true);
    if (!verified.ok) return;

    const result = proposeReleaseDecision(verified.state, {
      expectedStateVersion: 15,
      clientRequestId: "decision-ready-risk",
      recommendation: "ready",
      rationale: "The release is ready.",
      evidenceIds: ["netev_retry_017", "netev_response_016"],
      testProposalId: "P-017",
      verificationResultId: "V-001",
    });

    expect(result).toMatchObject({
      ok: false,
      code: "invalid_verification_result",
      currentStateVersion: 15,
    });
  });

  it("allows READY when the linked verification does not reproduce risk", () => {
    const fixture = createDemoReleaseState();
    const safeFixture = {
      ...fixture,
      networkEvidence: fixture.networkEvidence.map((item) =>
        item.phase === "retry_attempt"
          ? {
              ...item,
              operationRefs: ["op_01"],
              idempotencyKeyRefs: ["idem_7f3c"],
            }
          : item,
      ),
    };
    const proposed = proposeTestCase(safeFixture, testProposalInput);
    expect(proposed.ok).toBe(true);
    if (!proposed.ok) return;
    const approved = reviewTestProposal(proposed.state, "P-017", "approve");
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    const verified = runApprovedVerification(approved.state, {
      expectedStateVersion: 14,
      clientRequestId: "verify-ready-safe",
      testProposalId: "P-017",
      strategy: "targeted_retry",
    });
    expect(verified).toMatchObject({
      ok: true,
      value: { verdict: "not_reproduced" },
    });
    if (!verified.ok) return;

    const result = proposeReleaseDecision(verified.state, {
      expectedStateVersion: 15,
      clientRequestId: "decision-ready-safe",
      recommendation: "ready",
      rationale: "The bounded retry verification did not reproduce the risk.",
      evidenceIds: ["netev_retry_017", "netev_response_016"],
      testProposalId: "P-017",
      verificationResultId: "V-001",
    });

    expect(result).toMatchObject({
      ok: true,
      replayed: false,
      state: { stateVersion: 16, humanDecision: "pending" },
      value: { recommendation: "ready", status: "pending" },
    });
  });

  it("records a bounded seeded monkey verification", () => {
    const proposed = proposeTestCase(createDemoReleaseState(), testProposalInput);
    expect(proposed.ok).toBe(true);
    if (!proposed.ok) return;
    const approved = reviewTestProposal(proposed.state, "P-017", "approve");
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;

    const result = runApprovedVerification(approved.state, {
      expectedStateVersion: 14,
      clientRequestId: "verify-monkey-001",
      testProposalId: "P-017",
      strategy: "seeded_monkey",
      seed: 37,
      maxSteps: 20,
    });

    expect(result).toMatchObject({
      ok: true,
      value: {
        verificationResultId: "V-001",
        strategy: "seeded_monkey",
        seed: 37,
        maxSteps: 20,
        verdict: "risk_confirmed",
      },
      state: { stateVersion: 15 },
    });
  });

  it.each([
    ["negative seed", -1, 20],
    ["seed above the supported range", 2_147_483_648, 20],
    ["zero steps", 37, 0],
    ["more than 100 steps", 37, 101],
  ])("rejects %s at the domain boundary", (_label, seed, maxSteps) => {
    const proposed = proposeTestCase(createDemoReleaseState(), testProposalInput);
    expect(proposed.ok).toBe(true);
    if (!proposed.ok) return;
    const approved = reviewTestProposal(proposed.state, "P-017", "approve");
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;

    const result = runApprovedVerification(approved.state, {
      expectedStateVersion: 14,
      clientRequestId: `invalid-bound-${seed}-${maxSteps}`,
      testProposalId: "P-017",
      strategy: "seeded_monkey",
      seed,
      maxSteps,
    });

    expect(result).toMatchObject({
      ok: false,
      code: "invalid_verification_input",
      currentStateVersion: 14,
    });
    expect(approved.state.verifications).toHaveLength(0);
  });

  it("validates forbidden fields before returning an idempotent replay", () => {
    const proposed = proposeTestCase(createDemoReleaseState(), testProposalInput);
    expect(proposed.ok).toBe(true);
    if (!proposed.ok) return;
    const approved = reviewTestProposal(proposed.state, "P-017", "approve");
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    const input = {
      expectedStateVersion: 14,
      clientRequestId: "verify-replay-validation",
      testProposalId: "P-017",
      strategy: "targeted_retry",
    } as const;
    const first = runApprovedVerification(approved.state, input);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const replay = runApprovedVerification(first.state, {
      ...input,
      seed: 37,
      maxSteps: 20,
    } as unknown as ApprovedVerificationInput);

    expect(replay).toMatchObject({
      ok: false,
      code: "invalid_verification_input",
      currentStateVersion: 15,
    });
    expect(first.state.verifications).toHaveLength(1);
  });
});
