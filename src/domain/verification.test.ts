import {
  createDemoReleaseState,
  createReleaseStateFromCheckoutSession,
} from "./evidence";
import {
  createCheckoutSession,
  retryPayment,
  submitPaymentWithLostResponse,
} from "../checkout/sandbox";
import { runSyntheticVerification } from "./verification";

describe("synthetic verification", () => {
  it("confirms the retry risk when one intent creates two side effects", () => {
    const result = runSyntheticVerification(createDemoReleaseState(), {
      strategy: "targeted_retry",
      evidenceIds: ["netev_retry_017", "netev_response_016"],
    });

    expect(result).toMatchObject({
      verdict: "risk_confirmed",
      observedSideEffects: 2,
      executedSteps: 2,
      assertions: [
        { name: "stable_retry_key", passed: false },
        { name: "single_side_effect", passed: false },
      ],
    });
  });

  it("reports not reproduced when the retry reuses one stable key", () => {
    const stableState = createReleaseStateFromCheckoutSession(
      retryPayment(
        submitPaymentWithLostResponse(createCheckoutSession()),
        "reuse_key",
      ),
    );

    const result = runSyntheticVerification(stableState, {
      strategy: "targeted_retry",
      evidenceIds: ["netev_retry_017", "netev_response_016"],
    });

    expect(result).toMatchObject({
      verdict: "not_reproduced",
      observedSideEffects: 1,
      assertions: [
        { name: "stable_retry_key", passed: true },
        { name: "single_side_effect", passed: true },
      ],
    });
  });

  it("stays inconclusive when evidence claims a stable key across distinct operations", () => {
    const state = createDemoReleaseState();
    const stableKeyWithTwoOperations = {
      ...state,
      networkEvidence: state.networkEvidence.map((item) =>
        item.phase === "retry_attempt"
          ? { ...item, idempotencyKeyRefs: ["idem_7f3c"] }
          : item,
      ),
    };

    const result = runSyntheticVerification(stableKeyWithTwoOperations, {
      strategy: "targeted_retry",
      evidenceIds: ["netev_retry_017", "netev_response_016"],
    });

    expect(result).toMatchObject({
      verdict: "inconclusive",
      assertions: [],
    });
  });

  it("stays inconclusive when evidence claims different keys for one operation", () => {
    const state = createDemoReleaseState();
    const oneOperationWithDifferentKeys = {
      ...state,
      networkEvidence: state.networkEvidence.map((item) =>
        item.phase === "retry_attempt"
          ? { ...item, operationRefs: ["op_01"] }
          : item,
      ),
    };

    const result = runSyntheticVerification(oneOperationWithDifferentKeys, {
      strategy: "targeted_retry",
      evidenceIds: ["netev_retry_017", "netev_response_016"],
    });

    expect(result).toMatchObject({
      verdict: "inconclusive",
      assertions: [],
    });
  });

  it("replays the checkout model instead of trusting forged operation references", () => {
    const state = createDemoReleaseState();
    const forged = {
      ...state,
      networkEvidence: state.networkEvidence.map((item) =>
        item.phase === "retry_attempt"
          ? { ...item, operationRefs: ["forged_01", "forged_02"] }
          : item,
      ),
    };

    const result = runSyntheticVerification(forged, {
      strategy: "targeted_retry",
      evidenceIds: ["netev_retry_017", "netev_response_016"],
    });

    expect(result).toMatchObject({
      verdict: "inconclusive",
      trace: [
        "1:initial_attempt:idem_7f3c:op_01",
        "2:retry_attempt:idem_b15a:op_02",
      ],
    });
  });

  it("stays inconclusive without both the accepted attempt and retry evidence", () => {
    const result = runSyntheticVerification(createDemoReleaseState(), {
      strategy: "targeted_retry",
      evidenceIds: ["netev_retry_017"],
    });

    expect(result).toMatchObject({
      verdict: "inconclusive",
      observedSideEffects: 0,
      executedSteps: 0,
    });
  });

  it("reproduces the same bounded monkey trace for the same seed", () => {
    const input = {
      strategy: "seeded_monkey",
      evidenceIds: ["netev_retry_017", "netev_response_016"],
      seed: 37,
      maxSteps: 20,
    } as const;

    const first = runSyntheticVerification(createDemoReleaseState(), input);
    const second = runSyntheticVerification(createDemoReleaseState(), input);

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      strategy: "seeded_monkey",
      seed: 37,
      maxSteps: 20,
      verdict: "risk_confirmed",
      observedSideEffects: 2,
    });
    expect(first.trace.length).toBeLessThanOrEqual(20);
  });

  it("stops a monkey run at the requested step bound", () => {
    const result = runSyntheticVerification(createDemoReleaseState(), {
      strategy: "seeded_monkey",
      evidenceIds: ["netev_retry_017", "netev_response_016"],
      seed: 37,
      maxSteps: 1,
    });

    expect(result).toMatchObject({
      strategy: "seeded_monkey",
      seed: 37,
      maxSteps: 1,
      verdict: "inconclusive",
      executedSteps: 1,
    });
    expect(result.trace).toHaveLength(1);
  });
});
