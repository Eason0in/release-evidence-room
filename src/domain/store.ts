import { createDemoReleaseState, type ReleaseState } from "./evidence";

export const RELEASE_ROOM_STORAGE_KEY = "release-evidence-room/v1";

export interface ReleaseRoomStore {
  getState(): ReleaseState;
  setState(state: ReleaseState): void;
  subscribe(listener: () => void): () => void;
  reset(): void;
}

interface StoredReleaseRoom {
  readonly schemaVersion: "release-evidence-room/v1";
  readonly state: ReleaseState;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isOneOf(value: unknown, allowed: readonly string[]): boolean {
  return typeof value === "string" && allowed.includes(value);
}

function hasProposalBase(value: Record<string, unknown>): boolean {
  return (
    typeof value.proposalId === "string" &&
    typeof value.clientRequestId === "string" &&
    typeof value.requestFingerprint === "string" &&
    isStringArray(value.evidenceIds)
  );
}

function isProposal(value: unknown): boolean {
  if (!isRecord(value) || !hasProposalBase(value)) return false;
  if (value.kind === "test_case") {
    return (
      isOneOf(value.status, ["pending", "approved", "rejected"]) &&
      typeof value.title === "string" &&
      typeof value.given === "string" &&
      typeof value.when === "string" &&
      typeof value.then === "string"
    );
  }
  if (value.kind === "release_decision") {
    return (
      isOneOf(value.status, ["pending", "confirmed", "rejected"]) &&
      isOneOf(value.recommendation, ["ready", "hold"]) &&
      typeof value.rationale === "string" &&
      (value.testProposalId === undefined || typeof value.testProposalId === "string")
    );
  }
  return false;
}

function isConsistentState(state: ReleaseState): boolean {
  const evidenceIds = new Set(state.networkEvidence.map((item) => item.evidenceId));
  if (state.risks.some((risk) => !evidenceIds.has(risk.evidenceId))) return false;
  if (state.focusedEvidenceIds.some((evidenceId) => !evidenceIds.has(evidenceId))) {
    return false;
  }
  if (state.proposals.some((proposal) =>
    proposal.evidenceIds.some((evidenceId) => !evidenceIds.has(evidenceId)))) {
    return false;
  }

  const proposalIds = new Set(state.proposals.map((proposal) => proposal.proposalId));
  const requestIds = new Set(state.proposals.map((proposal) => proposal.clientRequestId));
  if (proposalIds.size !== state.proposals.length || requestIds.size !== state.proposals.length) {
    return false;
  }

  for (const proposal of state.proposals) {
    if (proposal.kind !== "release_decision" || !proposal.testProposalId) continue;
    const linkedTest = state.proposals.find(
      (candidate) => candidate.proposalId === proposal.testProposalId,
    );
    if (linkedTest?.kind !== "test_case" || linkedTest.status !== "approved") return false;
  }

  if (state.activity.some((entry, index) => {
    const isRead =
      entry.action === "read_release_snapshot" ||
      entry.action === "queried_network_evidence";
    return (
      entry.sequence !== index + 1 ||
      entry.toVersion > state.stateVersion ||
      (isRead
        ? entry.fromVersion !== entry.toVersion
        : entry.toVersion !== entry.fromVersion + 1)
    );
  })) {
    return false;
  }

  const confirmed = state.proposals.filter(
    (proposal) => proposal.kind === "release_decision" && proposal.status === "confirmed",
  );
  if (state.humanDecision === "pending") return confirmed.length === 0;
  const confirmationAction =
    state.humanDecision === "ready"
      ? "confirmed_release_ready"
      : "confirmed_release_hold";
  const confirmedProposal = confirmed[0];
  return (
    confirmed.length === 1 &&
    confirmedProposal?.kind === "release_decision" &&
    confirmedProposal.recommendation === state.humanDecision &&
    state.activity.some(
      (entry) =>
        entry.action === confirmationAction && entry.toVersion === state.stateVersion,
    )
  );
}

function isReleaseState(value: unknown): value is ReleaseState {
  if (!isRecord(value) || !isRecord(value.tests)) return false;
  if (
    value.releaseId !== "rel_demo_1042" ||
    typeof value.releaseName !== "string" ||
    typeof value.candidate !== "string" ||
    typeof value.build !== "string" ||
    value.source !== "synthetic" ||
    !Number.isInteger(value.stateVersion) ||
    Number(value.stateVersion) < 0 ||
    !isOneOf(value.humanDecision, ["pending", "ready", "hold"])
  ) {
    return false;
  }
  if (
    !Number.isInteger(value.tests.total) ||
    !Number.isInteger(value.tests.passed) ||
    !Number.isInteger(value.tests.failed)
  ) {
    return false;
  }
  if (
    !Array.isArray(value.risks) ||
    !value.risks.every(
      (risk) =>
        isRecord(risk) &&
        typeof risk.riskId === "string" &&
        typeof risk.evidenceId === "string" &&
        isOneOf(risk.severity, ["high", "medium", "low"]) &&
        isOneOf(risk.riskType, ["duplicate_side_effect", "response_loss"]) &&
        typeof risk.summary === "string" &&
        isOneOf(risk.state, ["unresolved", "resolved"]),
    )
  ) {
    return false;
  }
  if (
    !Array.isArray(value.networkEvidence) ||
    !value.networkEvidence.every(
      (item) =>
        isRecord(item) &&
        typeof item.evidenceId === "string" &&
        typeof item.routeRef === "string" &&
        item.method === "POST" &&
        isOneOf(item.phase, ["initial_attempt", "retry_attempt"]) &&
        item.statusCode === 202 &&
        typeof item.intentRef === "string" &&
        isStringArray(item.operationRefs) &&
        isStringArray(item.idempotencyKeyRefs) &&
        isOneOf(item.riskType, ["duplicate_side_effect", "response_loss"]) &&
        isOneOf(item.severity, ["high", "medium", "low"]) &&
        typeof item.summary === "string" &&
        isOneOf(item.confidence, ["observed", "inferred"]),
    )
  ) {
    return false;
  }
  if (
    !Array.isArray(value.proposals) ||
    !value.proposals.every(isProposal)
  ) {
    return false;
  }
  if (!isStringArray(value.focusedEvidenceIds)) return false;
  const validActivity =
    Array.isArray(value.activity) &&
    value.activity.every(
      (entry) =>
        isRecord(entry) &&
        typeof entry.eventId === "string" &&
        Number.isInteger(entry.sequence) &&
        isOneOf(entry.actor, ["agent", "human"]) &&
        isOneOf(entry.action, [
          "read_release_snapshot",
          "queried_network_evidence",
          "proposed_test_case",
          "approved_test_case",
          "rejected_test_case",
          "proposed_release_decision",
          "confirmed_release_ready",
          "confirmed_release_hold",
          "rejected_release_decision",
        ]) &&
        typeof entry.summary === "string" &&
        Number.isInteger(entry.fromVersion) &&
        Number.isInteger(entry.toVersion) &&
        (entry.clientRequestId === undefined || typeof entry.clientRequestId === "string"),
    );
  return validActivity && isConsistentState(value as unknown as ReleaseState);
}

function readState(storage: Storage): ReleaseState | undefined {
  const raw = storage.getItem(RELEASE_ROOM_STORAGE_KEY);
  if (!raw) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      !isRecord(parsed) ||
      parsed.schemaVersion !== "release-evidence-room/v1" ||
      !isReleaseState(parsed.state)
    ) {
      return undefined;
    }
    return parsed.state;
  } catch {
    return undefined;
  }
}

function writeState(storage: Storage, state: ReleaseState): void {
  const stored: StoredReleaseRoom = {
    schemaVersion: "release-evidence-room/v1",
    state,
  };
  storage.setItem(RELEASE_ROOM_STORAGE_KEY, JSON.stringify(stored));
}

export function createReleaseRoomStore(storage: Storage): ReleaseRoomStore {
  let state = readState(storage) ?? createDemoReleaseState();
  const listeners = new Set<() => void>();
  writeState(storage, state);

  const setState = (nextState: ReleaseState): void => {
    state = nextState;
    writeState(storage, state);
    for (const listener of listeners) listener();
  };

  return {
    getState: () => state,
    setState,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    reset() {
      setState(createDemoReleaseState());
    },
  };
}
