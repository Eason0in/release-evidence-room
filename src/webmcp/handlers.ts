import {
  getReleaseSnapshot,
  queryNetworkEvidence,
  type Proposal,
  type VerificationResult,
} from "../domain/evidence";
import type { ReleaseRoomStore } from "../domain/store";
import {
  proposeReleaseDecision,
  proposeTestCase,
  recordAgentRead,
  runApprovedVerification,
  type WorkflowResult,
} from "../domain/workflow";
import type { ReleaseEvidenceHandlers } from "./tools";

function proposalCounts(proposals: readonly Proposal[]) {
  return {
    pending: proposals.filter((proposal) => proposal.status === "pending").length,
    approved: proposals.filter((proposal) => proposal.status === "approved").length,
    confirmed: proposals.filter((proposal) => proposal.status === "confirmed").length,
    rejected: proposals.filter((proposal) => proposal.status === "rejected").length,
  };
}

function publicProposal(proposal: Proposal) {
  const { requestFingerprint: _requestFingerprint, ...publicValue } = proposal;
  return publicValue;
}

function publicVerification(verification: VerificationResult) {
  const { requestFingerprint: _requestFingerprint, ...publicValue } = verification;
  return publicValue;
}

function publicWorkflowResult(result: WorkflowResult<Proposal>) {
  if (!result.ok) return result;
  const { requestFingerprint: _requestFingerprint, ...proposal } = result.value;
  return {
    ok: true as const,
    replayed: result.replayed,
    stateVersion: result.state.stateVersion,
    proposal,
  };
}

function publicVerificationWorkflowResult(
  result: WorkflowResult<VerificationResult>,
) {
  if (!result.ok) return result;
  return {
    ok: true as const,
    replayed: result.replayed,
    stateVersion: result.state.stateVersion,
    verification: publicVerification(result.value),
  };
}

function verificationCounts(verifications: readonly VerificationResult[]) {
  return {
    riskConfirmed: verifications.filter(
      (verification) => verification.verdict === "risk_confirmed",
    ).length,
    notReproduced: verifications.filter(
      (verification) => verification.verdict === "not_reproduced",
    ).length,
    inconclusive: verifications.filter(
      (verification) => verification.verdict === "inconclusive",
    ).length,
  };
}

export function createReleaseEvidenceHandlers(
  store: ReleaseRoomStore,
): ReleaseEvidenceHandlers {
  return {
    getReleaseSnapshot(_signal) {
      const state = store.getState();
      const snapshot = {
        ...getReleaseSnapshot(state),
        proposalCounts: proposalCounts(state.proposals),
        proposals: state.proposals.map(publicProposal),
        verificationCounts: verificationCounts(state.verifications),
        verifications: state.verifications.map(publicVerification),
      };
      store.setState(
        recordAgentRead(
          state,
          "read_release_snapshot",
          `Snapshot v${state.stateVersion} read; no release state change.`,
        ),
      );
      return snapshot;
    },
    queryNetworkEvidence(input, _signal) {
      const state = store.getState();
      const result = queryNetworkEvidence(state, input);
      store.setState(
        recordAgentRead(
          state,
          "queried_network_evidence",
          `${result.items.length} bounded evidence item(s) returned.`,
          result.items.map((item) => item.evidenceId),
        ),
      );
      return result;
    },
    proposeTestCase(input, _signal) {
      const state = store.getState();
      const result = proposeTestCase(state, input);
      if (result.ok && result.state !== state) store.setState(result.state);
      return publicWorkflowResult(result);
    },
    runApprovedVerification(input, _signal) {
      const state = store.getState();
      const result = runApprovedVerification(state, input);
      if (result.ok && result.state !== state) store.setState(result.state);
      return publicVerificationWorkflowResult(result);
    },
    proposeReleaseDecision(input, _signal) {
      const state = store.getState();
      const result = proposeReleaseDecision(state, input);
      if (result.ok && result.state !== state) store.setState(result.state);
      return publicWorkflowResult(result);
    },
  };
}
