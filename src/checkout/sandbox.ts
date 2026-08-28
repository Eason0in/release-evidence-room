export type CheckoutRetryMode = "reuse_key" | "new_key";

export interface CheckoutAttempt {
  readonly phase: "initial_attempt" | "retry_attempt";
  readonly idempotencyKeyRef: string;
  readonly operationRef: string;
  readonly response: "lost" | "received";
}

export interface CheckoutSession {
  readonly sessionId: string;
  readonly status: "ready" | "response_lost" | "completed";
  readonly retryMode?: CheckoutRetryMode;
  readonly observedSideEffects: number;
  readonly attempts: readonly CheckoutAttempt[];
}

export const CHECKOUT_SANDBOX_STORAGE_KEY = "checkout-qa-sandbox/v1";

export function createCheckoutSession(): CheckoutSession {
  return {
    sessionId: "checkout_session_017",
    status: "ready",
    observedSideEffects: 0,
    attempts: [],
  };
}

export function submitPaymentWithLostResponse(
  session: CheckoutSession,
): CheckoutSession {
  if (session.status !== "ready") return session;
  return {
    ...session,
    status: "response_lost",
    observedSideEffects: 1,
    attempts: [
      {
        phase: "initial_attempt",
        idempotencyKeyRef: "idem_7f3c",
        operationRef: "op_01",
        response: "lost",
      },
    ],
  };
}

export function retryPayment(
  session: CheckoutSession,
  retryMode: CheckoutRetryMode,
): CheckoutSession {
  if (session.status !== "response_lost") return session;
  const reuseKey = retryMode === "reuse_key";
  return {
    ...session,
    status: "completed",
    retryMode,
    observedSideEffects: reuseKey ? 1 : 2,
    attempts: [
      ...session.attempts,
      {
        phase: "retry_attempt",
        idempotencyKeyRef: reuseKey ? "idem_7f3c" : "idem_b15a",
        operationRef: reuseKey ? "op_01" : "op_02",
        response: "received",
      },
    ],
  };
}

function knownSessions(): readonly CheckoutSession[] {
  const ready = createCheckoutSession();
  const responseLost = submitPaymentWithLostResponse(ready);
  return [
    ready,
    responseLost,
    retryPayment(responseLost, "reuse_key"),
    retryPayment(responseLost, "new_key"),
  ];
}

export function readCheckoutSession(storage: Storage): CheckoutSession {
  const raw = storage.getItem(CHECKOUT_SANDBOX_STORAGE_KEY);
  if (!raw) return createCheckoutSession();
  try {
    const parsed: unknown = JSON.parse(raw);
    return knownSessions().find(
      (candidate) => JSON.stringify(candidate) === JSON.stringify(parsed),
    ) ?? createCheckoutSession();
  } catch {
    return createCheckoutSession();
  }
}

export function writeCheckoutSession(
  storage: Storage,
  session: CheckoutSession,
): void {
  storage.setItem(CHECKOUT_SANDBOX_STORAGE_KEY, JSON.stringify(session));
}
