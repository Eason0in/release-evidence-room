import {
  getReleaseSnapshot,
  queryNetworkEvidence,
  type Proposal,
} from "../domain/evidence";
import type { ReleaseRoomStore } from "../domain/store";
import {
  proposeReleaseDecision,
  proposeTestCase,
  recordAgentRead,
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

export function createReleaseEvidenceHandlers(
  store: ReleaseRoomStore,
): ReleaseEvidenceHandlers {
  return {
    getReleaseSnapshot(_signal) {
      const state = store.getState();
      const snapshot = {
        ...getReleaseSnapshot(state),
        proposalCounts: proposalCounts(state.proposals),
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
    proposeReleaseDecision(input, _signal) {
      const state = store.getState();
      const result = proposeReleaseDecision(state, input);
      if (result.ok && result.state !== state) store.setState(result.state);
      return publicWorkflowResult(result);
    },
  };
}
