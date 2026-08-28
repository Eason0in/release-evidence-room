import {
  createCheckoutSession,
  retryPayment,
  submitPaymentWithLostResponse,
} from "./sandbox";

describe("checkout sandbox", () => {
  it("reuses one side effect when a lost response is retried with the same key", () => {
    const submitted = submitPaymentWithLostResponse(createCheckoutSession());
    const retried = retryPayment(submitted, "reuse_key");

    expect(retried).toMatchObject({
      status: "completed",
      retryMode: "reuse_key",
      observedSideEffects: 1,
      attempts: [
        {
          phase: "initial_attempt",
          idempotencyKeyRef: "idem_7f3c",
          operationRef: "op_01",
          response: "lost",
        },
        {
          phase: "retry_attempt",
          idempotencyKeyRef: "idem_7f3c",
          operationRef: "op_01",
          response: "received",
        },
      ],
    });
  });

  it("reproduces two side effects when a lost response is retried with a new key", () => {
    const submitted = submitPaymentWithLostResponse(createCheckoutSession());
    const retried = retryPayment(submitted, "new_key");

    expect(retried).toMatchObject({
      sessionId: "checkout_session_017",
      status: "completed",
      retryMode: "new_key",
      observedSideEffects: 2,
      attempts: [
        {
          phase: "initial_attempt",
          idempotencyKeyRef: "idem_7f3c",
          operationRef: "op_01",
          response: "lost",
        },
        {
          phase: "retry_attempt",
          idempotencyKeyRef: "idem_b15a",
          operationRef: "op_02",
          response: "received",
        },
      ],
    });
  });
});
