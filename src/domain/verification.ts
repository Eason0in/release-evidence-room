import type {
  NetworkEvidence,
  ReleaseState,
  VerificationAssertion,
  VerificationStrategy,
  VerificationVerdict,
} from "./evidence";
import {
  createCheckoutSession,
  retryPayment,
  submitPaymentWithLostResponse,
  type CheckoutAttempt,
  type CheckoutSession,
} from "../checkout/sandbox";

export interface SyntheticVerificationResult {
  readonly strategy: VerificationStrategy;
  readonly verdict: VerificationVerdict;
  readonly observedSideEffects: number;
  readonly executedSteps: number;
  readonly assertions: readonly VerificationAssertion[];
  readonly trace: readonly string[];
  readonly summary: string;
  readonly seed?: number;
  readonly maxSteps?: number;
}

interface TargetedVerificationInput {
  readonly strategy: "targeted_retry";
  readonly evidenceIds: readonly string[];
}

interface MonkeyVerificationInput {
  readonly strategy: "seeded_monkey";
  readonly evidenceIds: readonly string[];
  readonly seed: number;
  readonly maxSteps: number;
}

type SyntheticVerificationInput =
  | TargetedVerificationInput
  | MonkeyVerificationInput;

function inconclusive(
  input: SyntheticVerificationInput,
  summary: string,
  trace: readonly string[] = [],
  observedSideEffects = 0,
): SyntheticVerificationResult {
  return {
    strategy: input.strategy,
    verdict: "inconclusive",
    observedSideEffects,
    executedSteps: trace.length,
    assertions: [],
    trace,
    summary,
    ...(input.strategy === "seeded_monkey"
      ? { seed: input.seed, maxSteps: input.maxSteps }
      : {}),
  };
}

function evidenceAttempts(
  state: ReleaseState,
  input: SyntheticVerificationInput,
): readonly [NetworkEvidence, NetworkEvidence] | undefined {
  const selected = state.networkEvidence.filter((item) =>
    input.evidenceIds.includes(item.evidenceId),
  );
  const initial = selected.find((item) => item.phase === "initial_attempt");
  const retry = selected.find(
    (item) =>
      item.phase === "retry_attempt" && item.intentRef === initial?.intentRef,
  );
  return initial && retry ? [initial, retry] : undefined;
}

function assertionsFor(
  initialKey: string,
  retryKey: string,
  observedSideEffects: number,
): readonly VerificationAssertion[] {
  const stableRetryKey = initialKey === retryKey;
  const singleSideEffect = observedSideEffects === 1;
  return [
    {
      name: "stable_retry_key",
      passed: stableRetryKey,
      expected: "one stable key for the original attempt and retry",
      observed: stableRetryKey ? "one stable key" : "different keys",
    },
    {
      name: "single_side_effect",
      passed: singleSideEffect,
      expected: "one committed side effect",
      observed: `${observedSideEffects} committed side effect(s)`,
    },
  ];
}

function replayCheckoutModel(state: ReleaseState): CheckoutSession {
  return retryPayment(
    submitPaymentWithLostResponse(createCheckoutSession()),
    state.evidenceSession.retryMode,
  );
}

function replayAttempts(
  session: CheckoutSession,
): readonly [CheckoutAttempt, CheckoutAttempt] | undefined {
  const initial = session.attempts.find(
    (attempt) => attempt.phase === "initial_attempt",
  );
  const retry = session.attempts.find(
    (attempt) => attempt.phase === "retry_attempt",
  );
  return initial && retry ? [initial, retry] : undefined;
}

function replayTrace(
  attempts: readonly [CheckoutAttempt, CheckoutAttempt],
): readonly string[] {
  return attempts.map(
    (attempt, index) =>
      `${index + 1}:${attempt.phase}:${attempt.idempotencyKeyRef}:${attempt.operationRef}`,
  );
}

function evidenceMatchesReplay(
  evidence: readonly [NetworkEvidence, NetworkEvidence],
  replay: readonly [CheckoutAttempt, CheckoutAttempt],
): boolean {
  return (
    JSON.stringify(evidence[0].idempotencyKeyRefs) ===
      JSON.stringify([replay[0].idempotencyKeyRef]) &&
    JSON.stringify(evidence[0].operationRefs) ===
      JSON.stringify([replay[0].operationRef]) &&
    JSON.stringify(evidence[1].idempotencyKeyRefs) ===
      JSON.stringify(replay.map((attempt) => attempt.idempotencyKeyRef)) &&
    JSON.stringify(evidence[1].operationRefs) ===
      JSON.stringify(replay.map((attempt) => attempt.operationRef))
  );
}

function runTargetedRetry(
  state: ReleaseState,
  input: TargetedVerificationInput,
): SyntheticVerificationResult {
  const evidence = evidenceAttempts(state, input);
  if (!evidence) {
    return inconclusive(
      input,
      "Both an accepted initial attempt and its retry are required.",
    );
  }

  const session = replayCheckoutModel(state);
  const attempts = replayAttempts(session);
  if (!attempts) {
    return inconclusive(
      input,
      "The checkout model did not complete both retry attempts.",
    );
  }
  const trace = replayTrace(attempts);
  if (!evidenceMatchesReplay(evidence, attempts)) {
    return inconclusive(
      input,
      "The selected evidence does not match the checkout model replay.",
      trace,
      session.observedSideEffects,
    );
  }

  const keys = attempts.map((attempt) => attempt.idempotencyKeyRef);
  const observedSideEffects = session.observedSideEffects;
  const assertions = assertionsFor(keys[0], keys[1], observedSideEffects);
  const allAssertionsPassed = assertions.every((assertion) => assertion.passed);
  return {
    strategy: input.strategy,
    verdict: allAssertionsPassed ? "not_reproduced" : "risk_confirmed",
    observedSideEffects,
    executedSteps: attempts.length,
    assertions,
    trace,
    summary: allAssertionsPassed
      ? "The bounded retry replay reused one key and produced one side effect."
      : `The bounded retry replay observed ${keys[0] === keys[1] ? "one stable key" : "different keys"} and ${observedSideEffects} side effect(s).`,
  };
}

function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1_664_525) + 1_013_904_223) >>> 0;
    return value / 4_294_967_296;
  };
}

function runSeededMonkey(
  state: ReleaseState,
  input: MonkeyVerificationInput,
): SyntheticVerificationResult {
  const evidence = evidenceAttempts(state, input);
  if (!evidence) {
    return inconclusive(
      input,
      "Both an accepted initial attempt and its retry are required.",
    );
  }
  const expectedSession = replayCheckoutModel(state);
  const expectedAttempts = replayAttempts(expectedSession);
  if (!expectedAttempts) {
    return inconclusive(
      input,
      "The checkout model did not complete both retry attempts.",
    );
  }
  if (!evidenceMatchesReplay(evidence, expectedAttempts)) {
    return inconclusive(
      input,
      "The selected evidence does not match the checkout model replay.",
      replayTrace(expectedAttempts),
      expectedSession.observedSideEffects,
    );
  }

  const initialKey = expectedAttempts[0].idempotencyKeyRef;
  const retryKey = expectedAttempts[1].idempotencyKeyRef;

  const random = seededRandom(input.seed);
  const trace: string[] = [];
  let session = createCheckoutSession();
  let phase: "idle" | "accepted" | "response_lost" | "resolved" = "idle";
  let retriedAfterLoss = false;

  for (let step = 1; step <= input.maxSteps; step += 1) {
    const actions =
      phase === "idle"
        ? (["submit", "refresh", "back"] as const)
        : phase === "accepted"
          ? (["lose_response", "refresh", "receive_response"] as const)
          : phase === "response_lost"
            ? (["retry", "refresh", "back"] as const)
            : (["inspect", "refresh", "back"] as const);
    const action = actions[Math.floor(random() * actions.length)] as string;

    if (phase === "idle" && action === "submit") {
      session = submitPaymentWithLostResponse(session);
      phase = "accepted";
    } else if (phase === "accepted" && action === "lose_response") {
      phase = "response_lost";
    } else if (phase === "accepted" && action === "receive_response") {
      phase = "resolved";
    } else if (phase === "response_lost" && action === "retry") {
      session = retryPayment(session, state.evidenceSession.retryMode);
      phase = "resolved";
      retriedAfterLoss = true;
    }
    trace.push(`${step}:${action}:${phase}`);
    if (retriedAfterLoss) break;
  }

  if (!retriedAfterLoss) {
    return inconclusive(
      input,
      "The bounded run did not reach a response-loss retry transition.",
      trace,
      session.observedSideEffects,
    );
  }

  const observedSideEffects = session.observedSideEffects;
  const assertions = assertionsFor(initialKey, retryKey, observedSideEffects);
  const allAssertionsPassed = assertions.every((assertion) => assertion.passed);
  return {
    strategy: input.strategy,
    seed: input.seed,
    maxSteps: input.maxSteps,
    verdict: allAssertionsPassed ? "not_reproduced" : "risk_confirmed",
    observedSideEffects,
    executedSteps: trace.length,
    assertions,
    trace,
    summary: allAssertionsPassed
      ? "The seeded run reached retry and preserved one side effect."
      : `The seeded run reached retry with ${initialKey === retryKey ? "one stable key" : "different keys"} and ${observedSideEffects} side effect(s).`,
  };
}

export function runSyntheticVerification(
  state: ReleaseState,
  input: SyntheticVerificationInput,
): SyntheticVerificationResult {
  return input.strategy === "targeted_retry"
    ? runTargetedRetry(state, input)
    : runSeededMonkey(state, input);
}
