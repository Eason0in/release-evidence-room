import { act, fireEvent, render, screen } from "@testing-library/react";
import { createReleaseRoomStore } from "./domain/store";
import {
  proposeReleaseDecision,
  proposeTestCase,
  recordAgentRead,
  reviewTestProposal,
  runApprovedVerification,
} from "./domain/workflow";
import { App } from "./App";

const testInput = {
  expectedStateVersion: 12,
  clientRequestId: "req-ui-test",
  title: "Retry after acceptance must reuse the idempotency key",
  given: "The server accepts a payment attempt and its response is lost.",
  when: "The mobile client retries the same payment intent.",
  then: "The retry resolves to the original operation using the original key.",
  evidenceIds: ["netev_retry_017", "netev_response_016"],
} as const;

describe("Release Evidence Room", () => {
  beforeEach(() => localStorage.clear());

  it("makes the green-suite evidence gap visible on first load", () => {
    const store = createReleaseRoomStore(localStorage);

    render(<App store={store} webMcpStatus="available" />);

    expect(
      screen.getByRole("heading", { name: "Release Evidence Room" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Evidence first. Humans decide.")).toBeInTheDocument();
    expect(screen.getByText("18 / 18")).toBeInTheDocument();
    expect(screen.getByText("tests passed")).toBeInTheDocument();
    expect(
      screen.getByText(/green suite does not demonstrate duplicate-safe retry behavior/i),
    ).toBeInTheDocument();
    expect(screen.getByText("UNDECIDED")).toBeInTheDocument();
    expect(screen.getByText("WebMCP · 5 tools available")).toBeInTheDocument();
    expect(screen.getByText("No deploy action is exposed.")).toBeInTheDocument();
    expect(
      screen.queryByText(/one payment intent produced two accepted operation refs/i),
    ).not.toBeInTheDocument();
  });

  it("reveals the synthesized finding after the agent focuses evidence", () => {
    const store = createReleaseRoomStore(localStorage);
    store.setState(
      recordAgentRead(
        store.getState(),
        "queried_network_evidence",
        "1 bounded evidence item returned.",
        ["netev_retry_017"],
      ),
    );

    render(<App store={store} webMcpStatus="available" />);

    expect(
      screen.getByText(/two accepted operation refs were observed for one intent/i),
    ).toBeInTheDocument();
    expect(screen.getByText("FOCUSED EVIDENCE INTERPRETATION")).toBeInTheDocument();
    expect(screen.getByText("WebMCP · query_network_evidence")).toBeInTheDocument();
  });

  it("announces an agent proposal to assistive technology", () => {
    const store = createReleaseRoomStore(localStorage);
    render(<App store={store} webMcpStatus="available" />);
    const proposed = proposeTestCase(store.getState(), testInput);
    expect(proposed.ok).toBe(true);
    if (!proposed.ok) return;

    act(() => store.setState(proposed.state));

    expect(screen.getByRole("status")).toHaveTextContent(
      "1 proposal pending human review.",
    );
  });

  it("lets only the human approve a pending test proposal", () => {
    const store = createReleaseRoomStore(localStorage);
    const proposed = proposeTestCase(store.getState(), testInput);
    expect(proposed.ok).toBe(true);
    if (!proposed.ok) return;
    store.setState(proposed.state);

    render(<App store={store} webMcpStatus="available" />);

    expect(screen.getByText("PENDING HUMAN REVIEW")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Approve test" }));

    expect(screen.getByText("APPROVED BY HUMAN")).toBeInTheDocument();
    expect(screen.getByText("1 approved test · Awaiting verification")).toBeInTheDocument();
    expect(store.getState()).toMatchObject({
      stateVersion: 14,
      proposals: [{ proposalId: "P-017", status: "approved" }],
    });
  });

  it("shows targeted and seeded verification results linked to the approved test", () => {
    const store = createReleaseRoomStore(localStorage);
    const proposedTest = proposeTestCase(store.getState(), testInput);
    expect(proposedTest.ok).toBe(true);
    if (!proposedTest.ok) return;
    const approved = reviewTestProposal(proposedTest.state, "P-017", "approve");
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    const targeted = runApprovedVerification(approved.state, {
      expectedStateVersion: 14,
      clientRequestId: "req-ui-targeted",
      testProposalId: "P-017",
      strategy: "targeted_retry",
    });
    expect(targeted.ok).toBe(true);
    if (!targeted.ok) return;
    const monkey = runApprovedVerification(targeted.state, {
      expectedStateVersion: 15,
      clientRequestId: "req-ui-monkey",
      testProposalId: "P-017",
      strategy: "seeded_monkey",
      seed: 37,
      maxSteps: 20,
    });
    expect(monkey.ok).toBe(true);
    if (!monkey.ok) return;
    store.setState(monkey.state);

    render(<App store={store} webMcpStatus="available" />);

    expect(screen.getAllByText("RISK CONFIRMED")).toHaveLength(2);
    expect(screen.getByText("VERIFICATION · V-001")).toBeInTheDocument();
    expect(screen.getByText("TARGETED RETRY")).toBeInTheDocument();
    expect(screen.getByText("VERIFICATION · V-002")).toBeInTheDocument();
    expect(screen.getByText("SEEDED MONKEY")).toBeInTheDocument();
    expect(screen.getByText(/seed 37 · 4 of 20 steps/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(/2 side effects observed/i, {
        selector: ".verification-meta",
      }),
    ).toHaveLength(2);
  });

  it("keeps HOLD non-binding until the human confirms it", () => {
    const store = createReleaseRoomStore(localStorage);
    const proposedTest = proposeTestCase(store.getState(), testInput);
    expect(proposedTest.ok).toBe(true);
    if (!proposedTest.ok) return;
    const approved = reviewTestProposal(proposedTest.state, "P-017", "approve");
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    const verification = runApprovedVerification(approved.state, {
      expectedStateVersion: 14,
      clientRequestId: "req-ui-verification",
      testProposalId: "P-017",
      strategy: "targeted_retry",
    });
    expect(verification.ok).toBe(true);
    if (!verification.ok) return;
    const proposedDecision = proposeReleaseDecision(verification.state, {
      expectedStateVersion: 15,
      clientRequestId: "req-ui-decision",
      recommendation: "hold",
      rationale:
        "Targeted verification reproduced unstable key and duplicate operation refs.",
      evidenceIds: ["netev_retry_017", "netev_response_016"],
      testProposalId: "P-017",
      verificationResultId: "V-001",
    });
    expect(proposedDecision.ok).toBe(true);
    if (!proposedDecision.ok) return;
    store.setState(proposedDecision.state);

    render(<App store={store} webMcpStatus="available" />);

    expect(screen.getByText("UNDECIDED")).toBeInTheDocument();
    expect(screen.getByText("HOLD", { selector: ".proposal-recommendation" })).toBeInTheDocument();
    expect(screen.getByText("Test P-017 · Verification V-001")).toBeInTheDocument();
    expect(screen.queryByText(/unblock when P-017 passes/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirm HOLD" }));

    expect(screen.getByText("Human confirmed")).toBeInTheDocument();
    expect(store.getState()).toMatchObject({
      stateVersion: 17,
      humanDecision: "hold",
      proposals: [
        { proposalId: "P-017", status: "approved" },
        { proposalId: "P-018", status: "confirmed" },
      ],
      verifications: [
        { verificationResultId: "V-001", verdict: "risk_confirmed" },
      ],
    });
  });
});
