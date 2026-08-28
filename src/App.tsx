import { useState, useSyncExternalStore } from "react";
import type {
  ActivityEntry,
  ReleaseDecisionProposal,
  TestCaseProposal,
} from "./domain/evidence";
import type { ReleaseRoomStore } from "./domain/store";
import { reviewReleaseDecision, reviewTestProposal } from "./domain/workflow";
import "./styles.css";

export type WebMcpStatus = "available" | "unsupported" | "registering" | "error";

interface AppProps {
  readonly store: ReleaseRoomStore;
  readonly webMcpStatus: WebMcpStatus;
}

export function App(_props: AppProps) {
  const { store, webMcpStatus } = _props;
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  const [notice, setNotice] = useState("");
  const approvedTests = state.proposals.filter(
    (proposal) => proposal.kind === "test_case" && proposal.status === "approved",
  ).length;
  const pendingProposalCount = state.proposals.filter(
    (proposal) => proposal.status === "pending",
  ).length;
  const focusedRiskEvidence = state.networkEvidence.find(
    (item) =>
      state.focusedEvidenceIds.includes(item.evidenceId) &&
      item.riskType === "duplicate_side_effect",
  );

  const handleTestReview = (
    proposal: TestCaseProposal,
    action: "approve" | "reject",
  ) => {
    const result = reviewTestProposal(state, proposal.proposalId, action);
    if (!result.ok) {
      setNotice(result.message);
      return;
    }
    store.setState(result.state);
    setNotice(
      action === "approve"
        ? `${proposal.proposalId} approved by human; the test has not run.`
        : `${proposal.proposalId} rejected by human.`,
    );
  };

  const handleDecisionReview = (
    proposal: ReleaseDecisionProposal,
    action: "confirm" | "reject",
  ) => {
    const result = reviewReleaseDecision(state, proposal.proposalId, action);
    if (!result.ok) {
      setNotice(result.message);
      return;
    }
    store.setState(result.state);
    setNotice(
      action === "confirm"
        ? `${proposal.recommendation.toUpperCase()} confirmed by human.`
        : `${proposal.proposalId} rejected by human.`,
    );
  };

  const resetDemo = () => {
    store.reset();
    setNotice("Demo reset to the deterministic synthetic fixture.");
  };

  return (
    <main className="room-shell">
      <header className="release-header">
        <div className="brand-block">
          <p className="eyebrow">AGENT-NATIVE RELEASE REVIEW</p>
          <h1>Release Evidence Room</h1>
          <p className="tagline">Evidence first. Humans decide.</p>
        </div>
        <div className="header-center" aria-label="Active release">
          <p className="release-name">{state.releaseName}</p>
          <p className="release-meta">
            {state.candidate} · Build {state.build} · {state.releaseId}
          </p>
          <div className="badge-row">
            <span className="badge badge-neutral">SYNTHETIC DATA · LOCAL STATE</span>
            <span className="badge badge-webmcp">{webMcpLabel(webMcpStatus)}</span>
          </div>
        </div>
        <div className="decision-block">
          <p className="eyebrow">RELEASE DECISION</p>
          <p className={`decision decision-${state.humanDecision}`}>
            {state.humanDecision === "pending"
              ? "UNDECIDED"
              : state.humanDecision.toUpperCase()}
          </p>
          <p className="decision-owner">
            {state.humanDecision === "pending" ? "Human decision required" : "Human confirmed"}
          </p>
          <button className="reset-button" type="button" onClick={resetDemo}>
            Reset demo
          </button>
        </div>
      </header>

      <section className="coverage-panel" aria-labelledby="coverage-title">
        <div className="section-label">
          <span>01</span>
          <h2 id="coverage-title">Release coverage</h2>
        </div>
        <div className="coverage-grid">
          <article className="metric metric-pass">
            <p className="metric-label">AUTOMATED SUITE</p>
            <p className="metric-value">
              {state.tests.passed} / {state.tests.total}
            </p>
            <p className="metric-copy">tests passed</p>
            <p className="metric-note">0 failed · 0 skipped</p>
          </article>
          <article className="metric metric-gap">
            <p className="metric-label">EXACTLY-ONCE BRANCH</p>
            <p className="metric-value">{approvedTests === 0 ? "0 tests" : approvedTests}</p>
            <p className="metric-copy">
              {approvedTests === 0
                ? "Missing response-loss coverage"
                : `${approvedTests} approved test · Not run`}
            </p>
            <p className="metric-note">Stable retry key remains unproven</p>
          </article>
          <article className="metric metric-signal">
            <p className="metric-label">NETWORK SIGNAL</p>
            <p className="metric-value">{state.networkEvidence.length} clusters</p>
            <p className="metric-copy">Bounded retry evidence</p>
            <p className="metric-note">Available for agent query and human inspection</p>
          </article>
        </div>
        <div className="review-callout">
          <span className="callout-mark" aria-hidden="true">!</span>
          <div>
            <strong>Review required</strong>
            <p>A green suite does not demonstrate duplicate-safe retry behavior.</p>
          </div>
        </div>
      </section>

      <div className="workspace-grid">
        <section className="panel evidence-panel" aria-labelledby="evidence-title">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">02 · SANITIZED SOURCE</p>
              <h2 id="evidence-title">Evidence explorer</h2>
            </div>
            <p className="panel-stat">2 bounded synthetic clusters</p>
          </div>
          {state.focusedEvidenceIds.length > 0 && (
            <div className="agent-focus" aria-live="polite">
              <span>AGENT FOCUS</span>
              {state.focusedEvidenceIds.length} OF {state.networkEvidence.length} CLUSTERS
            </div>
          )}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Evidence</th>
                  <th>Phase</th>
                  <th>Route ref</th>
                  <th>Key refs</th>
                  <th>Operation refs</th>
                  <th>Signal</th>
                </tr>
              </thead>
              <tbody>
                {state.networkEvidence.map((item) => {
                  const isFocused = state.focusedEvidenceIds.includes(item.evidenceId);
                  return (
                    <tr
                      key={item.evidenceId}
                      className={isFocused ? "focused-row" : undefined}
                      data-evidence-id={item.evidenceId}
                    >
                      <td><code>{item.evidenceId}</code></td>
                      <td>{item.phase.replace("_", " ")}</td>
                      <td><code>{item.routeRef}</code></td>
                      <td>{item.idempotencyKeyRefs.join(" · ")}</td>
                      <td>{item.operationRefs.join(" · ")}</td>
                      <td><span className={`severity severity-${item.severity}`}>{item.severity}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {focusedRiskEvidence && (
            <div className="agent-finding" aria-live="polite">
              <p className="metric-label">FOCUSED EVIDENCE INTERPRETATION</p>
              <p>{focusedRiskEvidence.summary}</p>
              <strong>
                Bounded observation—not proof of a duplicate charge.
              </strong>
            </div>
          )}
        </section>

        <section className="panel inbox-panel" aria-labelledby="inbox-title">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">03 · HUMAN CONTROL</p>
              <h2 id="inbox-title">Proposal inbox</h2>
            </div>
            <span className="version-chip">STATE v{state.stateVersion}</span>
          </div>
          <div className="proposal-stack">
            {state.proposals.length === 0 ? (
              <div className="empty-inbox">
                <span aria-hidden="true">＋</span>
                <p>No proposals yet.</p>
                <small>
                  Agent proposals appear here for human review. Nothing is applied automatically.
                </small>
              </div>
            ) : (
              state.proposals.map((proposal) =>
                proposal.kind === "test_case" ? (
                  <TestProposalCard
                    key={proposal.proposalId}
                    proposal={proposal}
                    onReview={handleTestReview}
                  />
                ) : (
                  <DecisionProposalCard
                    key={proposal.proposalId}
                    proposal={proposal}
                    onReview={handleDecisionReview}
                  />
                ),
              )
            )}
          </div>
          <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {pendingProposalCount === 1
              ? "1 proposal pending human review."
              : `${pendingProposalCount} proposals pending human review.`}
          </p>
          <p className="notice" aria-live="polite">{notice}</p>
        </section>
      </div>

      <section className="panel timeline-panel" aria-labelledby="timeline-title">
        <div className="panel-heading timeline-heading">
          <div>
            <p className="panel-kicker">04 · AUDITABLE HANDOFF</p>
            <h2 id="timeline-title">Evidence &amp; decision trail</h2>
          </div>
          <p className="panel-stat">Every read, proposal, and human action is attributed.</p>
        </div>
        {state.activity.length === 0 ? (
          <p className="timeline-empty">Waiting for the first agent tool call.</p>
        ) : (
          <ol className="timeline-list">
            {state.activity.map((entry) => (
              <TimelineItem key={entry.eventId} entry={entry} />
            ))}
          </ol>
        )}
        <footer className="safety-footer">
          <span className="safety-dot" aria-hidden="true" />
          <strong>No deploy action is exposed.</strong>
          <span>Agents read and propose. Humans approve and decide.</span>
        </footer>
      </section>
    </main>
  );
}

function webMcpLabel(status: WebMcpStatus): string {
  switch (status) {
    case "available":
      return "WebMCP · 4 tools available";
    case "registering":
      return "WebMCP · registering tools";
    case "error":
      return "WebMCP · registration unavailable";
    default:
      return "WebMCP · activates in a supported browser";
  }
}

function TestProposalCard({
  proposal,
  onReview,
}: {
  readonly proposal: TestCaseProposal;
  readonly onReview: (proposal: TestCaseProposal, action: "approve" | "reject") => void;
}) {
  return (
    <article className="proposal-card proposal-test">
      <div className="proposal-topline">
        <span>TEST PROPOSAL · {proposal.proposalId}</span>
        <strong>{proposal.status === "pending" ? "PENDING HUMAN REVIEW" : proposal.status === "approved" ? "APPROVED BY HUMAN" : "REJECTED BY HUMAN"}</strong>
      </div>
      <h3>{proposal.title}</h3>
      <dl className="scenario-list">
        <div><dt>GIVEN</dt><dd>{proposal.given}</dd></div>
        <div><dt>WHEN</dt><dd>{proposal.when}</dd></div>
        <div><dt>THEN</dt><dd>{proposal.then}</dd></div>
      </dl>
      <p className="evidence-refs">Evidence · {proposal.evidenceIds.join(" · ")}</p>
      {proposal.status === "pending" ? (
        <div className="button-row">
          <button className="primary-action" type="button" onClick={() => onReview(proposal, "approve")}>Approve test</button>
          <button className="secondary-action" type="button" onClick={() => onReview(proposal, "reject")}>Reject</button>
        </div>
      ) : proposal.status === "approved" ? (
        <p className="applied-note">Required for release · Not executed</p>
      ) : null}
    </article>
  );
}

function DecisionProposalCard({
  proposal,
  onReview,
}: {
  readonly proposal: ReleaseDecisionProposal;
  readonly onReview: (
    proposal: ReleaseDecisionProposal,
    action: "confirm" | "reject",
  ) => void;
}) {
  return (
    <article className="proposal-card proposal-decision">
      <div className="proposal-topline">
        <span>RELEASE PROPOSAL · {proposal.proposalId}</span>
        <strong>{proposal.status === "pending" ? "PENDING HUMAN REVIEW" : proposal.status === "confirmed" ? "CONFIRMED BY HUMAN" : "REJECTED BY HUMAN"}</strong>
      </div>
      <p className="proposal-recommendation">{proposal.recommendation.toUpperCase()}</p>
      <h3>Why</h3>
      <p>{proposal.rationale}</p>
      {proposal.testProposalId && <p className="unblock-note">Unblock when {proposal.testProposalId} passes.</p>}
      <p className="evidence-refs">Evidence · {proposal.evidenceIds.join(" · ")}</p>
      {proposal.status === "pending" && (
        <div className="button-row">
          <button className="danger-action" type="button" onClick={() => onReview(proposal, "confirm")}>Confirm {proposal.recommendation.toUpperCase()}</button>
          <button className="secondary-action" type="button" onClick={() => onReview(proposal, "reject")}>Reject proposal</button>
        </div>
      )}
    </article>
  );
}

function TimelineItem({ entry }: { readonly entry: ActivityEntry }) {
  const toolName = toolNameForActivity(entry.action);
  return (
    <li>
      <span className={`actor actor-${entry.actor}`}>{entry.actor}</span>
      <div>
        <strong>{entry.action.replaceAll("_", " ")}</strong>
        {toolName && <span className="timeline-tool">WebMCP · {toolName}</span>}
        <p>{entry.summary}</p>
      </div>
      <code>
        v{entry.fromVersion} {entry.fromVersion === entry.toVersion ? "read" : `→ v${entry.toVersion}`}
      </code>
    </li>
  );
}

function toolNameForActivity(action: ActivityEntry["action"]): string | undefined {
  switch (action) {
    case "read_release_snapshot":
      return "get_release_snapshot";
    case "queried_network_evidence":
      return "query_network_evidence";
    case "proposed_test_case":
      return "propose_test_case";
    case "proposed_release_decision":
      return "propose_release_decision";
    default:
      return undefined;
  }
}
