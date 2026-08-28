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

function isReleaseState(value: unknown): value is ReleaseState {
  if (!isRecord(value) || !isRecord(value.tests)) return false;
  if (
    value.releaseId !== "rel_demo_1042" ||
    typeof value.releaseName !== "string" ||
    typeof value.candidate !== "string" ||
    typeof value.build !== "string" ||
    value.source !== "synthetic" ||
    !Number.isInteger(value.stateVersion) ||
    !["pending", "ready", "hold"].includes(String(value.humanDecision))
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
        typeof risk.summary === "string",
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
        isStringArray(item.operationRefs) &&
        isStringArray(item.idempotencyKeyRefs),
    )
  ) {
    return false;
  }
  if (
    !Array.isArray(value.proposals) ||
    !value.proposals.every(
      (proposal) =>
        isRecord(proposal) &&
        typeof proposal.proposalId === "string" &&
        typeof proposal.clientRequestId === "string" &&
        typeof proposal.requestFingerprint === "string" &&
        isStringArray(proposal.evidenceIds) &&
        ["test_case", "release_decision"].includes(String(proposal.kind)),
    )
  ) {
    return false;
  }
  if (!isStringArray(value.focusedEvidenceIds)) return false;
  return (
    Array.isArray(value.activity) &&
    value.activity.every(
      (entry) =>
        isRecord(entry) &&
        typeof entry.eventId === "string" &&
        Number.isInteger(entry.sequence) &&
        ["agent", "human"].includes(String(entry.actor)) &&
        typeof entry.action === "string",
    )
  );
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
