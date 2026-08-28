import { createDemoReleaseState } from "./evidence";
import { createReleaseRoomStore, RELEASE_ROOM_STORAGE_KEY } from "./store";
import {
  proposeReleaseDecision,
  proposeTestCase,
  reviewTestProposal,
  runApprovedVerification,
} from "./workflow";

const proposalInput = {
  expectedStateVersion: 12,
  clientRequestId: "req-store-test",
  title: "Retry after acceptance reuses the idempotency key",
  given: "The server accepts a payment attempt and its response is lost.",
  when: "The mobile client retries the same payment intent.",
  then: "The retry resolves to the original operation using the original key.",
  evidenceIds: ["netev_retry_017", "netev_response_016"],
} as const;

describe("release room store", () => {
  beforeEach(() => localStorage.clear());

  it("starts from the deterministic demo state", () => {
    const store = createReleaseRoomStore(localStorage);

    expect(store.getState()).toEqual(createDemoReleaseState());
  });

  it("persists a valid state for the next store instance", () => {
    const firstStore = createReleaseRoomStore(localStorage);
    const proposed = proposeTestCase(firstStore.getState(), proposalInput);
    expect(proposed.ok).toBe(true);
    if (!proposed.ok) return;
    firstStore.setState(proposed.state);

    const reloadedStore = createReleaseRoomStore(localStorage);

    expect(reloadedStore.getState()).toEqual(proposed.state);
  });

  it("fails closed to a clean demo when saved state is malformed", () => {
    localStorage.setItem(
      RELEASE_ROOM_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: "release-evidence-room/v1",
        state: { releaseId: "rel_demo_1042", stateVersion: "tampered" },
      }),
    );

    const store = createReleaseRoomStore(localStorage);

    expect(store.getState()).toEqual(createDemoReleaseState());
    expect(JSON.parse(localStorage.getItem(RELEASE_ROOM_STORAGE_KEY)!)).toMatchObject({
      schemaVersion: "release-evidence-room/v2",
      state: { releaseId: "rel_demo_1042", stateVersion: 12 },
    });
  });

  it.each([
    ["network evidence phase", (state: ReturnType<typeof createDemoReleaseState>) => ({
      ...state,
      networkEvidence: [{ ...state.networkEvidence[0], phase: "tampered" }],
    })],
    ["network evidence severity", (state: ReturnType<typeof createDemoReleaseState>) => ({
      ...state,
      networkEvidence: [{ ...state.networkEvidence[0], severity: "critical" }],
    })],
    ["release recommendation", (state: ReturnType<typeof createDemoReleaseState>) => ({
      ...state,
      proposals: [{
        proposalId: "P-017",
        kind: "release_decision",
        status: "pending",
        clientRequestId: "req-tampered",
        requestFingerprint: "tampered",
        recommendation: "ship_it",
        rationale: "Tampered local state.",
        evidenceIds: ["netev_retry_017"],
      }],
    })],
    ["human decision without a matching confirmed proposal", (state: ReturnType<typeof createDemoReleaseState>) => ({
      ...state,
      humanDecision: "ready",
    })],
  ])("fails closed when persisted %s is invalid", (_label, mutate) => {
    const fixture = createDemoReleaseState();
    localStorage.setItem(
      RELEASE_ROOM_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: "release-evidence-room/v2",
        state: mutate(fixture),
      }),
    );

    const store = createReleaseRoomStore(localStorage);

    expect(store.getState()).toEqual(fixture);
  });

  it("notifies subscribers and can reset the demo", () => {
    const store = createReleaseRoomStore(localStorage);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    const proposed = proposeTestCase(store.getState(), proposalInput);
    expect(proposed.ok).toBe(true);
    if (!proposed.ok) return;

    store.setState(proposed.state);
    store.reset();
    unsubscribe();
    store.setState(proposed.state);

    expect(listener).toHaveBeenCalledTimes(2);
    expect(store.getState().stateVersion).toBe(13);
  });

  it("persists only consistent verification results", () => {
    const firstStore = createReleaseRoomStore(localStorage);
    const proposed = proposeTestCase(firstStore.getState(), proposalInput);
    expect(proposed.ok).toBe(true);
    if (!proposed.ok) return;
    const approved = reviewTestProposal(proposed.state, "P-017", "approve");
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    const verified = runApprovedVerification(approved.state, {
      expectedStateVersion: 14,
      clientRequestId: "verify-store-001",
      testProposalId: "P-017",
      strategy: "seeded_monkey",
      seed: 37,
      maxSteps: 20,
    });
    expect(verified.ok).toBe(true);
    if (!verified.ok) return;
    firstStore.setState(verified.state);

    expect(createReleaseRoomStore(localStorage).getState()).toEqual(verified.state);

    const stored = JSON.parse(localStorage.getItem(RELEASE_ROOM_STORAGE_KEY)!);
    stored.state.verifications[0].testProposalId = "P-missing";
    localStorage.setItem(RELEASE_ROOM_STORAGE_KEY, JSON.stringify(stored));

    expect(createReleaseRoomStore(localStorage).getState()).toEqual(
      createDemoReleaseState(),
    );
  });

  it("fails closed when persisted READY has a forged not-reproduced verdict", () => {
    const proposed = proposeTestCase(createDemoReleaseState(), proposalInput);
    expect(proposed.ok).toBe(true);
    if (!proposed.ok) return;
    const approved = reviewTestProposal(proposed.state, "P-017", "approve");
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    const verified = runApprovedVerification(approved.state, {
      expectedStateVersion: 14,
      clientRequestId: "verify-store-ready-tamper",
      testProposalId: "P-017",
      strategy: "targeted_retry",
    });
    expect(verified.ok).toBe(true);
    if (!verified.ok) return;
    const held = proposeReleaseDecision(verified.state, {
      expectedStateVersion: 15,
      clientRequestId: "decision-store-ready-tamper",
      recommendation: "hold",
      rationale: "The bounded verifier confirmed the modeled risk.",
      evidenceIds: ["netev_retry_017", "netev_response_016"],
      testProposalId: "P-017",
      verificationResultId: "V-001",
    });
    expect(held.ok).toBe(true);
    if (!held.ok) return;
    const tamperedState = structuredClone(held.state);
    const decision = tamperedState.proposals.find(
      (proposal) => proposal.kind === "release_decision",
    );
    if (!decision || decision.kind !== "release_decision") return;
    Object.assign(decision, { recommendation: "ready" });
    Object.assign(tamperedState.verifications[0], {
      verdict: "not_reproduced",
    });
    localStorage.setItem(
      RELEASE_ROOM_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: "release-evidence-room/v2",
        state: tamperedState,
      }),
    );

    expect(createReleaseRoomStore(localStorage).getState()).toEqual(
      createDemoReleaseState(),
    );
  });
});
