import {
  createDemoReleaseState,
  createReleaseStateFromCheckoutSession,
  getReleaseSnapshot,
  queryNetworkEvidence,
} from "./evidence";
import {
  createCheckoutSession,
  retryPayment,
  submitPaymentWithLostResponse,
} from "../checkout/sandbox";

describe("release evidence", () => {
  it("surfaces unresolved high risk even when all automated tests pass", () => {
    const state = createDemoReleaseState();

    const snapshot = getReleaseSnapshot(state);

    expect(snapshot.tests).toEqual({ total: 18, passed: 18, failed: 0 });
    expect(snapshot.unresolvedRiskCounts).toEqual({ high: 1, medium: 1, low: 0 });
    expect(snapshot.humanDecision).toBe("pending");
    expect(snapshot.evidenceSession.provenance).toBe("fixture");
  });

  it("returns bounded opaque network evidence for the retry risk", () => {
    const state = createDemoReleaseState();

    const result = queryNetworkEvidence(state, {
      riskType: "duplicate_side_effect",
      severity: "high",
      limit: 5,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      evidenceId: "netev_retry_017",
      routeRef: "route_7f3c",
      riskType: "duplicate_side_effect",
      severity: "high",
    });
    expect(JSON.stringify(result)).not.toMatch(
      /host|hostname|path|query|header|body|cookie|credential|address|timestamp|filePath/i,
    );
  });

  it("caps result size even when a caller asks for more", () => {
    const state = createDemoReleaseState();

    const result = queryNetworkEvidence(state, { limit: 999 });

    expect(result.limit).toBe(20);
    expect(result.items.length).toBeLessThanOrEqual(20);
  });

  it("builds release evidence from the public checkout sandbox session", () => {
    const checkout = retryPayment(
      submitPaymentWithLostResponse(createCheckoutSession()),
      "new_key",
    );

    const state = createReleaseStateFromCheckoutSession(checkout);

    expect(state.evidenceSession).toEqual({
      sessionId: "checkout_session_017",
      sourcePath: "/checkout",
      scenario: "response_loss_retry",
      retryMode: "new_key",
      provenance: "checkout_runtime",
    });
    expect(state.networkEvidence).toEqual([
      expect.objectContaining({
        evidenceId: "netev_retry_017",
        operationRefs: ["op_01", "op_02"],
        idempotencyKeyRefs: ["idem_7f3c", "idem_b15a"],
        severity: "high",
      }),
      expect.objectContaining({
        evidenceId: "netev_response_016",
        operationRefs: ["op_01"],
        idempotencyKeyRefs: ["idem_7f3c"],
      }),
    ]);
    expect(getReleaseSnapshot(state).unresolvedRiskCounts.high).toBe(1);
  });

  it("does not invent a duplicate-side-effect risk for a safe retry", () => {
    const checkout = retryPayment(
      submitPaymentWithLostResponse(createCheckoutSession()),
      "reuse_key",
    );

    const state = createReleaseStateFromCheckoutSession(checkout);

    expect(state.networkEvidence[0]).toMatchObject({
      operationRefs: ["op_01", "op_01"],
      idempotencyKeyRefs: ["idem_7f3c", "idem_7f3c"],
      severity: "low",
    });
    expect(getReleaseSnapshot(state).unresolvedRiskCounts.high).toBe(0);
  });
});
