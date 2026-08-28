export type Severity = "high" | "medium" | "low";
export type RiskType =
  | "duplicate_side_effect"
  | "retry_without_stable_key"
  | "response_loss";

export interface TestSummary {
  readonly total: number;
  readonly passed: number;
  readonly failed: number;
}

export interface ReleaseRisk {
  readonly riskId: string;
  readonly evidenceId: string;
  readonly severity: Severity;
  readonly riskType: RiskType;
  readonly summary: string;
  readonly state: "unresolved" | "resolved";
}

export interface NetworkEvidence {
  readonly evidenceId: string;
  readonly routeRef: string;
  readonly method: "POST";
  readonly phase: "initial_attempt" | "retry_attempt";
  readonly statusCode: 202;
  readonly intentRef: string;
  readonly operationRefs: readonly string[];
  readonly idempotencyKeyRefs: readonly string[];
  readonly riskType: RiskType;
  readonly severity: Severity;
  readonly summary: string;
  readonly confidence: "observed" | "inferred";
}

export interface ActivityEntry {
  readonly eventId: string;
  readonly sequence: number;
  readonly actor: "agent" | "human";
  readonly action:
    | "read_release_snapshot"
    | "queried_network_evidence"
    | "proposed_test_case"
    | "approved_test_case"
    | "rejected_test_case"
    | "proposed_release_decision"
    | "confirmed_release_ready"
    | "confirmed_release_hold"
    | "rejected_release_decision";
  readonly summary: string;
  readonly fromVersion: number;
  readonly toVersion: number;
  readonly clientRequestId?: string;
}

interface ProposalBase {
  readonly proposalId: string;
  readonly clientRequestId: string;
  readonly requestFingerprint: string;
  readonly evidenceIds: readonly string[];
}

export interface TestCaseProposal extends ProposalBase {
  readonly kind: "test_case";
  readonly status: "pending" | "approved" | "rejected";
  readonly title: string;
  readonly given: string;
  readonly when: string;
  readonly then: string;
}

export interface ReleaseDecisionProposal extends ProposalBase {
  readonly kind: "release_decision";
  readonly status: "pending" | "confirmed" | "rejected";
  readonly recommendation: "ready" | "hold";
  readonly rationale: string;
  readonly testProposalId?: string;
}

export type Proposal = TestCaseProposal | ReleaseDecisionProposal;

export interface ReleaseState {
  readonly releaseId: string;
  readonly releaseName: string;
  readonly candidate: string;
  readonly build: string;
  readonly source: "synthetic";
  readonly stateVersion: number;
  readonly tests: TestSummary;
  readonly risks: readonly ReleaseRisk[];
  readonly networkEvidence: readonly NetworkEvidence[];
  readonly focusedEvidenceIds: readonly string[];
  readonly proposals: readonly Proposal[];
  readonly activity: readonly ActivityEntry[];
  readonly humanDecision: "pending" | "ready" | "hold";
}

export interface NetworkEvidenceQuery {
  readonly riskType?: RiskType;
  readonly severity?: Severity;
  readonly limit?: number;
}

export interface ReleaseSnapshot {
  readonly releaseId: string;
  readonly releaseName: string;
  readonly candidate: string;
  readonly build: string;
  readonly source: "synthetic";
  readonly stateVersion: number;
  readonly tests: TestSummary;
  readonly unresolvedRiskCounts: Readonly<Record<Severity, number>>;
  readonly coverageGaps: readonly string[];
  readonly humanDecision: ReleaseState["humanDecision"];
}

export interface NetworkEvidenceResult {
  readonly items: readonly NetworkEvidence[];
  readonly matched: number;
  readonly limit: number;
}

export function createDemoReleaseState(): ReleaseState {
  return {
    releaseId: "rel_demo_1042",
    releaseName: "Mobile Checkout 2.7.0",
    candidate: "RC3",
    build: "207",
    source: "synthetic",
    stateVersion: 12,
    tests: { total: 18, passed: 18, failed: 0 },
    risks: [
      {
        riskId: "risk_exactly_once_01",
        evidenceId: "netev_retry_017",
        severity: "high",
        riskType: "duplicate_side_effect",
        summary:
          "One payment intent produced two accepted operation refs across retry attempts.",
        state: "unresolved",
      },
      {
        riskId: "risk_response_loss_01",
        evidenceId: "netev_response_016",
        severity: "medium",
        riskType: "response_loss",
        summary:
          "The first accepted attempt did not return a usable response before the retry.",
        state: "unresolved",
      },
    ],
    networkEvidence: [
      {
        evidenceId: "netev_retry_017",
        routeRef: "route_7f3c",
        method: "POST",
        phase: "retry_attempt",
        statusCode: 202,
        intentRef: "intent_8421",
        operationRefs: ["op_01", "op_02"],
        idempotencyKeyRefs: ["idem_7f3c", "idem_b15a"],
        riskType: "duplicate_side_effect",
        severity: "high",
        summary:
          "Two accepted operation refs were observed for one intent; duplicate charge is not established.",
        confidence: "observed",
      },
      {
        evidenceId: "netev_response_016",
        routeRef: "route_7f3c",
        method: "POST",
        phase: "initial_attempt",
        statusCode: 202,
        intentRef: "intent_8421",
        operationRefs: ["op_01"],
        idempotencyKeyRefs: ["idem_7f3c"],
        riskType: "response_loss",
        severity: "medium",
        summary:
          "The accepted initial attempt lost its response before the client retried.",
        confidence: "observed",
      },
    ],
    focusedEvidenceIds: [],
    proposals: [],
    activity: [],
    humanDecision: "pending",
  };
}

export function getReleaseSnapshot(state: ReleaseState): ReleaseSnapshot {
  const unresolvedRiskCounts: Record<Severity, number> = {
    high: 0,
    medium: 0,
    low: 0,
  };

  for (const risk of state.risks) {
    if (risk.state === "unresolved") {
      unresolvedRiskCounts[risk.severity] += 1;
    }
  }

  return {
    releaseId: state.releaseId,
    releaseName: state.releaseName,
    candidate: state.candidate,
    build: state.build,
    source: state.source,
    stateVersion: state.stateVersion,
    tests: state.tests,
    unresolvedRiskCounts,
    coverageGaps: ["response_loss_after_acceptance", "stable_retry_idempotency"],
    humanDecision: state.humanDecision,
  };
}

export function queryNetworkEvidence(
  state: ReleaseState,
  query: NetworkEvidenceQuery,
): NetworkEvidenceResult {
  const requestedLimit = Number.isFinite(query.limit) ? Math.trunc(query.limit!) : 20;
  const limit = Math.max(1, Math.min(20, requestedLimit));
  const matches = state.networkEvidence.filter(
    (item) =>
      (query.riskType === undefined || item.riskType === query.riskType) &&
      (query.severity === undefined || item.severity === query.severity),
  );

  return {
    items: matches.slice(0, limit),
    matched: matches.length,
    limit,
  };
}
