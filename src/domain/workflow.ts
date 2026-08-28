import type {
  ActivityEntry,
  Proposal,
  ReleaseDecisionProposal,
  ReleaseState,
  TestCaseProposal,
  VerificationResult,
} from "./evidence";
import { runSyntheticVerification } from "./verification";

export interface TestCaseProposalInput {
  readonly expectedStateVersion: number;
  readonly clientRequestId: string;
  readonly title: string;
  readonly given: string;
  readonly when: string;
  readonly then: string;
  readonly evidenceIds: readonly string[];
}

export interface ReleaseDecisionProposalInput {
  readonly expectedStateVersion: number;
  readonly clientRequestId: string;
  readonly recommendation: "ready" | "hold";
  readonly rationale: string;
  readonly evidenceIds: readonly string[];
  readonly testProposalId: string;
  readonly verificationResultId: string;
}

interface ApprovedVerificationInputBase {
  readonly expectedStateVersion: number;
  readonly clientRequestId: string;
  readonly testProposalId: string;
}

export type ApprovedVerificationInput = ApprovedVerificationInputBase &
  (
    | { readonly strategy: "targeted_retry" }
    | {
        readonly strategy: "seeded_monkey";
        readonly seed: number;
        readonly maxSteps: number;
      }
  );

type WorkflowErrorCode =
  | "state_conflict"
  | "invalid_evidence"
  | "invalid_test_proposal"
  | "invalid_verification_input"
  | "invalid_verification_result"
  | "request_id_reused"
  | "proposal_not_found"
  | "proposal_not_pending"
  | "release_already_decided";

export interface WorkflowError {
  readonly ok: false;
  readonly code: WorkflowErrorCode;
  readonly currentStateVersion: number;
  readonly message: string;
}

export interface WorkflowSuccess<T> {
  readonly ok: true;
  readonly replayed: boolean;
  readonly state: ReleaseState;
  readonly value: T;
}

export type WorkflowResult<T> = WorkflowSuccess<T> | WorkflowError;

export function recordAgentRead(
  state: ReleaseState,
  action: "read_release_snapshot" | "queried_network_evidence",
  summary: string,
  focusedEvidenceIds: readonly string[] = state.focusedEvidenceIds,
): ReleaseState {
  const activity: ActivityEntry = {
    eventId: `A-${String(state.activity.length + 1).padStart(3, "0")}`,
    sequence: state.activity.length + 1,
    actor: "agent",
    action,
    summary,
    fromVersion: state.stateVersion,
    toVersion: state.stateVersion,
  };
  return {
    ...state,
    focusedEvidenceIds: [...focusedEvidenceIds],
    activity: [...state.activity, activity],
  };
}

function fingerprintTestCase(input: TestCaseProposalInput): string {
  return JSON.stringify({
    kind: "test_case",
    title: input.title,
    given: input.given,
    when: input.when,
    then: input.then,
    evidenceIds: [...input.evidenceIds].sort(),
  });
}

function fingerprintReleaseDecision(input: ReleaseDecisionProposalInput): string {
  return JSON.stringify({
    kind: "release_decision",
    recommendation: input.recommendation,
    rationale: input.rationale,
    evidenceIds: [...input.evidenceIds].sort(),
    testProposalId: input.testProposalId,
    verificationResultId: input.verificationResultId,
  });
}

function fingerprintVerification(input: ApprovedVerificationInput): string {
  return JSON.stringify({
    kind: "verification",
    testProposalId: input.testProposalId,
    strategy: input.strategy,
    seed: input.strategy === "seeded_monkey" ? input.seed : null,
    maxSteps: input.strategy === "seeded_monkey" ? input.maxSteps : null,
  });
}

function findReplay<T extends Proposal>(
  state: ReleaseState,
  clientRequestId: string,
  fingerprint: string,
  kind: T["kind"],
): WorkflowResult<T> | undefined {
  const existing = state.proposals.find(
    (proposal) => proposal.clientRequestId === clientRequestId,
  );
  if (!existing) {
    if (
      state.verifications.some(
        (verification) => verification.clientRequestId === clientRequestId,
      )
    ) {
      return {
        ok: false,
        code: "request_id_reused",
        currentStateVersion: state.stateVersion,
        message: `Client request ID ${clientRequestId} was already used for different content.`,
      };
    }
    return undefined;
  }

  if (existing.requestFingerprint !== fingerprint || existing.kind !== kind) {
    return {
      ok: false,
      code: "request_id_reused",
      currentStateVersion: state.stateVersion,
      message: `Client request ID ${clientRequestId} was already used for different content.`,
    };
  }

  return {
    ok: true,
    replayed: true,
    state,
    value: existing as T,
  };
}

function checkStateVersion(
  state: ReleaseState,
  expectedStateVersion: number,
): WorkflowError | undefined {
  if (expectedStateVersion === state.stateVersion) return undefined;
  return {
    ok: false,
    code: "state_conflict",
    currentStateVersion: state.stateVersion,
    message: `Expected state version ${expectedStateVersion}, but current version is ${state.stateVersion}.`,
  };
}

function checkEvidence(
  state: ReleaseState,
  evidenceIds: readonly string[],
): WorkflowError | undefined {
  const available = new Set(state.networkEvidence.map((item) => item.evidenceId));
  const invalid = evidenceIds.find((evidenceId) => !available.has(evidenceId));
  if (!invalid) return undefined;
  return {
    ok: false,
    code: "invalid_evidence",
    currentStateVersion: state.stateVersion,
    message: `Evidence ${invalid} is not present in this room.`,
  };
}

function checkVerificationInput(
  state: ReleaseState,
  input: ApprovedVerificationInput,
): WorkflowError | undefined {
  if (
    input.strategy !== "targeted_retry" &&
    input.strategy !== "seeded_monkey"
  ) {
    return {
      ok: false,
      code: "invalid_verification_input",
      currentStateVersion: state.stateVersion,
      message: "Verification strategy is not supported.",
    };
  }
  if (
    input.strategy === "targeted_retry" &&
    ("seed" in input || "maxSteps" in input)
  ) {
    return {
      ok: false,
      code: "invalid_verification_input",
      currentStateVersion: state.stateVersion,
      message: "targeted_retry does not accept seed or maxSteps.",
    };
  }
  if (
    input.strategy === "seeded_monkey" &&
    (!Number.isInteger(input.seed) ||
      input.seed < 0 ||
      input.seed > 2_147_483_647 ||
      !Number.isInteger(input.maxSteps) ||
      input.maxSteps < 1 ||
      input.maxSteps > 100)
  ) {
    return {
      ok: false,
      code: "invalid_verification_input",
      currentStateVersion: state.stateVersion,
      message: "seeded_monkey requires seed 0–2147483647 and maxSteps 1–100.",
    };
  }
  return undefined;
}

function proposalId(state: ReleaseState): string {
  return `P-${String(17 + state.proposals.length).padStart(3, "0")}`;
}

function appendMutation<T extends Proposal>(
  state: ReleaseState,
  proposal: T,
  event: Omit<ActivityEntry, "eventId" | "sequence" | "fromVersion" | "toVersion">,
): WorkflowSuccess<T> {
  const nextVersion = state.stateVersion + 1;
  const activity: ActivityEntry = {
    ...event,
    eventId: `A-${String(state.activity.length + 1).padStart(3, "0")}`,
    sequence: state.activity.length + 1,
    fromVersion: state.stateVersion,
    toVersion: nextVersion,
  };
  const nextState: ReleaseState = {
    ...state,
    stateVersion: nextVersion,
    proposals: [...state.proposals, proposal],
    activity: [...state.activity, activity],
  };
  return { ok: true, replayed: false, state: nextState, value: proposal };
}

export function proposeTestCase(
  state: ReleaseState,
  input: TestCaseProposalInput,
): WorkflowResult<TestCaseProposal> {
  const requestFingerprint = fingerprintTestCase(input);
  const replay = findReplay<TestCaseProposal>(
    state,
    input.clientRequestId,
    requestFingerprint,
    "test_case",
  );
  if (replay) return replay;

  const conflict = checkStateVersion(state, input.expectedStateVersion);
  if (conflict) return conflict;
  const invalidEvidence = checkEvidence(state, input.evidenceIds);
  if (invalidEvidence) return invalidEvidence;

  const proposal: TestCaseProposal = {
    proposalId: proposalId(state),
    kind: "test_case",
    status: "pending",
    clientRequestId: input.clientRequestId,
    requestFingerprint,
    title: input.title,
    given: input.given,
    when: input.when,
    then: input.then,
    evidenceIds: [...input.evidenceIds],
  };

  return appendMutation(state, proposal, {
    actor: "agent",
    action: "proposed_test_case",
    summary: `${proposal.proposalId} is pending human review.`,
    clientRequestId: input.clientRequestId,
  });
}

export function proposeReleaseDecision(
  state: ReleaseState,
  input: ReleaseDecisionProposalInput,
): WorkflowResult<ReleaseDecisionProposal> {
  const requestFingerprint = fingerprintReleaseDecision(input);
  const replay = findReplay<ReleaseDecisionProposal>(
    state,
    input.clientRequestId,
    requestFingerprint,
    "release_decision",
  );
  if (replay) return replay;

  const conflict = checkStateVersion(state, input.expectedStateVersion);
  if (conflict) return conflict;
  const invalidEvidence = checkEvidence(state, input.evidenceIds);
  if (invalidEvidence) return invalidEvidence;

  const testProposal = state.proposals.find(
    (proposal) => proposal.proposalId === input.testProposalId,
  );
  if (testProposal?.kind !== "test_case" || testProposal.status !== "approved") {
    return {
      ok: false,
      code: "invalid_test_proposal",
      currentStateVersion: state.stateVersion,
      message: `Test proposal ${input.testProposalId} is not approved.`,
    };
  }

  const verification = state.verifications.find(
    (candidate) =>
      candidate.verificationResultId === input.verificationResultId &&
      candidate.testProposalId === input.testProposalId,
  );
  if (!verification) {
    return {
      ok: false,
      code: "invalid_verification_result",
      currentStateVersion: state.stateVersion,
      message: `Verification result ${input.verificationResultId} does not validate ${input.testProposalId}.`,
    };
  }
  if (input.recommendation === "ready" && verification.verdict !== "not_reproduced") {
    return {
      ok: false,
      code: "invalid_verification_result",
      currentStateVersion: state.stateVersion,
      message: `READY requires a not_reproduced verification result.`,
    };
  }

  const proposal: ReleaseDecisionProposal = {
    proposalId: proposalId(state),
    kind: "release_decision",
    status: "pending",
    clientRequestId: input.clientRequestId,
    requestFingerprint,
    recommendation: input.recommendation,
    rationale: input.rationale,
    evidenceIds: [...input.evidenceIds],
    testProposalId: input.testProposalId,
    verificationResultId: input.verificationResultId,
  };

  return appendMutation(state, proposal, {
    actor: "agent",
    action: "proposed_release_decision",
    summary: `${proposal.proposalId} recommends ${proposal.recommendation.toUpperCase()} and awaits a human decision.`,
    clientRequestId: input.clientRequestId,
  });
}

export function runApprovedVerification(
  state: ReleaseState,
  input: ApprovedVerificationInput,
): WorkflowResult<VerificationResult> {
  const invalidInput = checkVerificationInput(state, input);
  if (invalidInput) return invalidInput;
  const requestFingerprint = fingerprintVerification(input);
  const existing = state.verifications.find(
    (verification) => verification.clientRequestId === input.clientRequestId,
  );
  if (existing) {
    if (existing.requestFingerprint !== requestFingerprint) {
      return {
        ok: false,
        code: "request_id_reused",
        currentStateVersion: state.stateVersion,
        message: `Client request ID ${input.clientRequestId} was already used for different content.`,
      };
    }
    return { ok: true, replayed: true, state, value: existing };
  }
  if (
    state.proposals.some(
      (proposal) => proposal.clientRequestId === input.clientRequestId,
    )
  ) {
    return {
      ok: false,
      code: "request_id_reused",
      currentStateVersion: state.stateVersion,
      message: `Client request ID ${input.clientRequestId} was already used for different content.`,
    };
  }

  const conflict = checkStateVersion(state, input.expectedStateVersion);
  if (conflict) return conflict;
  const testProposal = state.proposals.find(
    (proposal) => proposal.proposalId === input.testProposalId,
  );
  if (testProposal?.kind !== "test_case" || testProposal.status !== "approved") {
    return {
      ok: false,
      code: "invalid_test_proposal",
      currentStateVersion: state.stateVersion,
      message: `Test proposal ${input.testProposalId} is not approved.`,
    };
  }
  const outcome =
    input.strategy === "targeted_retry"
      ? runSyntheticVerification(state, {
          strategy: input.strategy,
          evidenceIds: testProposal.evidenceIds,
        })
      : runSyntheticVerification(state, {
          strategy: input.strategy,
          evidenceIds: testProposal.evidenceIds,
          seed: input.seed,
          maxSteps: input.maxSteps,
        });
  const verification: VerificationResult = {
    verificationResultId: `V-${String(state.verifications.length + 1).padStart(3, "0")}`,
    clientRequestId: input.clientRequestId,
    requestFingerprint,
    testProposalId: input.testProposalId,
    ...outcome,
  };
  const nextVersion = state.stateVersion + 1;
  const activity: ActivityEntry = {
    eventId: `A-${String(state.activity.length + 1).padStart(3, "0")}`,
    sequence: state.activity.length + 1,
    actor: "agent",
    action: "ran_approved_verification",
    summary: `${verification.verificationResultId} completed with ${verification.verdict}.`,
    fromVersion: state.stateVersion,
    toVersion: nextVersion,
    clientRequestId: input.clientRequestId,
  };
  const nextState: ReleaseState = {
    ...state,
    stateVersion: nextVersion,
    verifications: [...state.verifications, verification],
    activity: [...state.activity, activity],
  };
  return { ok: true, replayed: false, state: nextState, value: verification };
}

function reviewProposal<T extends Proposal>(
  state: ReleaseState,
  proposalIdValue: string,
  kind: T["kind"],
  update: (proposal: T) => T,
  event: Omit<ActivityEntry, "eventId" | "sequence" | "fromVersion" | "toVersion">,
  humanDecision: ReleaseState["humanDecision"] = state.humanDecision,
): WorkflowResult<T> {
  const proposalIndex = state.proposals.findIndex(
    (proposal) => proposal.proposalId === proposalIdValue,
  );
  const current = state.proposals[proposalIndex];
  if (!current || current.kind !== kind) {
    return {
      ok: false,
      code: "proposal_not_found",
      currentStateVersion: state.stateVersion,
      message: `Proposal ${proposalIdValue} was not found.`,
    };
  }
  if (current.status !== "pending") {
    return {
      ok: false,
      code: "proposal_not_pending",
      currentStateVersion: state.stateVersion,
      message: `Proposal ${proposalIdValue} is not pending.`,
    };
  }

  const reviewed = update(current as T);
  const nextVersion = state.stateVersion + 1;
  const activity: ActivityEntry = {
    ...event,
    eventId: `A-${String(state.activity.length + 1).padStart(3, "0")}`,
    sequence: state.activity.length + 1,
    fromVersion: state.stateVersion,
    toVersion: nextVersion,
  };
  const proposals = [...state.proposals];
  proposals[proposalIndex] = reviewed;
  const nextState: ReleaseState = {
    ...state,
    stateVersion: nextVersion,
    humanDecision,
    proposals,
    activity: [...state.activity, activity],
  };
  return { ok: true, replayed: false, state: nextState, value: reviewed };
}

export function reviewTestProposal(
  state: ReleaseState,
  proposalIdValue: string,
  action: "approve" | "reject",
): WorkflowResult<TestCaseProposal> {
  return reviewProposal<TestCaseProposal>(
    state,
    proposalIdValue,
    "test_case",
    (proposal) => ({
      ...proposal,
      status: action === "approve" ? "approved" : "rejected",
    }),
    {
      actor: "human",
      action: action === "approve" ? "approved_test_case" : "rejected_test_case",
      summary: `${proposalIdValue} was ${action === "approve" ? "approved" : "rejected"} by a human.`,
    },
  );
}

export function reviewReleaseDecision(
  state: ReleaseState,
  proposalIdValue: string,
  action: "confirm" | "reject",
): WorkflowResult<ReleaseDecisionProposal> {
  if (action === "confirm" && state.humanDecision !== "pending") {
    return {
      ok: false,
      code: "release_already_decided",
      currentStateVersion: state.stateVersion,
      message: "The release decision is already final.",
    };
  }

  const proposal = state.proposals.find(
    (candidate) => candidate.proposalId === proposalIdValue,
  );
  const recommendation =
    proposal?.kind === "release_decision" ? proposal.recommendation : undefined;
  const humanDecision =
    action === "confirm" && recommendation ? recommendation : state.humanDecision;
  const eventAction =
    action === "reject"
      ? "rejected_release_decision"
      : recommendation === "ready"
        ? "confirmed_release_ready"
        : "confirmed_release_hold";

  return reviewProposal<ReleaseDecisionProposal>(
    state,
    proposalIdValue,
    "release_decision",
    (current) => ({
      ...current,
      status: action === "confirm" ? "confirmed" : "rejected",
    }),
    {
      actor: "human",
      action: eventAction,
      summary:
        action === "confirm"
          ? `${proposalIdValue} was confirmed by a human.`
          : `${proposalIdValue} was rejected by a human.`,
    },
    humanDecision,
  );
}
