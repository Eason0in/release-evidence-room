import type {
  NetworkEvidence,
  ReleaseState,
  VerificationAssertion,
  VerificationStrategy,
  VerificationVerdict,
} from "./evidence";

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

function attemptKey(item: NetworkEvidence): string | undefined {
  return item.phase === "initial_attempt"
    ? item.idempotencyKeyRefs[0]
    : item.idempotencyKeyRefs.at(-1);
}

function attemptOperation(item: NetworkEvidence): string | undefined {
  return item.phase === "initial_attempt"
    ? item.operationRefs[0]
    : item.operationRefs.at(-1);
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

function runTargetedRetry(
  state: ReleaseState,
  input: TargetedVerificationInput,
): SyntheticVerificationResult {
  const attempts = evidenceAttempts(state, input);
  if (!attempts) {
    return inconclusive(
      input,
      "Both an accepted initial attempt and its retry are required.",
    );
  }

  const keys = attempts.map(attemptKey);
  if (!keys[0] || !keys[1]) {
    return inconclusive(
      input,
      "Each attempt requires an idempotency key reference.",
    );
  }

  const operations = attempts.map(attemptOperation);
  if (!operations[0] || !operations[1]) {
    return inconclusive(
      input,
      "Each attempt requires an operation reference.",
    );
  }

  const observedSideEffects = new Set(operations).size;
  const assertions = assertionsFor(keys[0], keys[1], observedSideEffects);
  const allAssertionsPassed = assertions.every((assertion) => assertion.passed);
  return {
    strategy: input.strategy,
    verdict: allAssertionsPassed ? "not_reproduced" : "risk_confirmed",
    observedSideEffects,
    executedSteps: attempts.length,
    assertions,
    trace: attempts.map(
      (attempt, index) =>
        `${index + 1}:${attempt.phase}:${keys[index]}:${operations[index]}`,
    ),
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
  const attempts = evidenceAttempts(state, input);
  if (!attempts) {
    return inconclusive(
      input,
      "Both an accepted initial attempt and its retry are required.",
    );
  }
  const initialKey = attemptKey(attempts[0]);
  const retryKey = attemptKey(attempts[1]);
  if (!initialKey || !retryKey) {
    return inconclusive(
      input,
      "Each attempt requires an idempotency key reference.",
    );
  }
  const initialOperation = attemptOperation(attempts[0]);
  const retryOperation = attemptOperation(attempts[1]);
  if (!initialOperation || !retryOperation) {
    return inconclusive(
      input,
      "Each attempt requires an operation reference.",
    );
  }

  const random = seededRandom(input.seed);
  const ledger = new Set<string>();
  const trace: string[] = [];
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
      ledger.add(initialOperation);
      phase = "accepted";
    } else if (phase === "accepted" && action === "lose_response") {
      phase = "response_lost";
    } else if (phase === "accepted" && action === "receive_response") {
      phase = "resolved";
    } else if (phase === "response_lost" && action === "retry") {
      ledger.add(retryOperation);
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
      ledger.size,
    );
  }

  const observedSideEffects = ledger.size;
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
