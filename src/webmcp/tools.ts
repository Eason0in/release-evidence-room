import type { NetworkEvidenceQuery } from "../domain/evidence";
import type {
  ApprovedVerificationInput,
  ReleaseDecisionProposalInput,
  TestCaseProposalInput,
} from "../domain/workflow";

export type ToolRegistry = Pick<WebMCP.ModelContext, "registerTool">;

export interface ReleaseEvidenceHandlers {
  getReleaseSnapshot(signal: AbortSignal): WebMCP.MaybePromise<unknown>;
  queryNetworkEvidence(
    input: NetworkEvidenceQuery,
    signal: AbortSignal,
  ): WebMCP.MaybePromise<unknown>;
  proposeTestCase(
    input: TestCaseProposalInput,
    signal: AbortSignal,
  ): WebMCP.MaybePromise<unknown>;
  runApprovedVerification(
    input: ApprovedVerificationInput,
    signal: AbortSignal,
  ): WebMCP.MaybePromise<unknown>;
  proposeReleaseDecision(
    input: ReleaseDecisionProposalInput,
    signal: AbortSignal,
  ): WebMCP.MaybePromise<unknown>;
}

export class ToolInputError extends Error {
  readonly code = "invalid_tool_input";

  constructor(message: string) {
    super(message);
    this.name = "ToolInputError";
  }
}

export const releaseToolSchemas = {
  snapshot: {
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false,
  },
  networkQuery: {
    type: "object",
    properties: {
      riskType: {
        type: "string",
        enum: [
          "duplicate_side_effect",
          "response_loss",
        ],
        description: "Optional risk category already present in this room.",
      },
      severity: {
        type: "string",
        enum: ["high", "medium", "low"],
        description: "Optional severity filter for page-owned evidence.",
      },
      limit: {
        type: "integer",
        minimum: 1,
        maximum: 20,
        default: 20,
        description: "Maximum evidence items to return.",
      },
    },
    required: [],
    additionalProperties: false,
  },
  testCase: {
    type: "object",
    properties: {
      expectedStateVersion: {
        type: "integer",
        minimum: 0,
        maximum: Number.MAX_SAFE_INTEGER,
        description: "Copy stateVersion from the latest get_release_snapshot result.",
      },
      clientRequestId: {
        type: "string",
        minLength: 1,
        maxLength: 80,
        pattern: "^[A-Za-z0-9._:-]+$",
        description: "Use a unique ID per logical proposal; reuse it only to retry identical content.",
      },
      title: {
        type: "string",
        minLength: 1,
        maxLength: 120,
        pattern: ".*\\S.*",
        description: "Concise name for the missing regression test.",
      },
      given: {
        type: "string",
        minLength: 1,
        maxLength: 500,
        pattern: ".*\\S.*",
        description: "Test precondition grounded in room evidence.",
      },
      when: {
        type: "string",
        minLength: 1,
        maxLength: 500,
        pattern: ".*\\S.*",
        description: "Action or failure condition exercised by the test.",
      },
      then: {
        type: "string",
        minLength: 1,
        maxLength: 500,
        pattern: ".*\\S.*",
        description: "Observable safety outcome the test must assert.",
      },
      evidenceIds: {
        type: "array",
        minItems: 1,
        maxItems: 10,
        uniqueItems: true,
        items: {
          type: "string",
          minLength: 1,
          maxLength: 80,
          pattern: ".*\\S.*",
        },
        description: "Use evidence IDs returned by query_network_evidence.",
      },
    },
    required: [
      "expectedStateVersion",
      "clientRequestId",
      "title",
      "given",
      "when",
      "then",
      "evidenceIds",
    ],
    additionalProperties: false,
  },
  verification: {
    type: "object",
    properties: {
      expectedStateVersion: {
        type: "integer",
        minimum: 0,
        maximum: Number.MAX_SAFE_INTEGER,
        description: "Copy stateVersion from the latest get_release_snapshot result.",
      },
      clientRequestId: {
        type: "string",
        minLength: 1,
        maxLength: 80,
        pattern: "^[A-Za-z0-9._:-]+$",
        description: "Use a unique ID per logical run; reuse it only to retry identical input.",
      },
      testProposalId: {
        type: "string",
        minLength: 1,
        maxLength: 80,
        pattern: ".*\\S.*",
        description: "An approved test proposal to execute in the bounded synthetic sandbox.",
      },
      strategy: {
        type: "string",
        enum: ["targeted_retry", "seeded_monkey"],
        description: "Run the exact retry replay or a reproducible bounded state-machine exploration.",
      },
      seed: {
        type: "integer",
        minimum: 0,
        maximum: 2147483647,
        description: "Required only for seeded_monkey so the same trace can be reproduced.",
      },
      maxSteps: {
        type: "integer",
        minimum: 1,
        maximum: 100,
        description: "Required only for seeded_monkey; hard bounds the explored transitions.",
      },
    },
    required: [
      "expectedStateVersion",
      "clientRequestId",
      "testProposalId",
      "strategy",
    ],
    oneOf: [
      {
        properties: { strategy: { const: "targeted_retry" } },
        not: {
          anyOf: [{ required: ["seed"] }, { required: ["maxSteps"] }],
        },
      },
      {
        properties: { strategy: { const: "seeded_monkey" } },
        required: ["seed", "maxSteps"],
      },
    ],
    additionalProperties: false,
  },
  releaseDecision: {
    type: "object",
    properties: {
      expectedStateVersion: {
        type: "integer",
        minimum: 0,
        maximum: Number.MAX_SAFE_INTEGER,
        description: "Copy stateVersion from the latest get_release_snapshot result.",
      },
      clientRequestId: {
        type: "string",
        minLength: 1,
        maxLength: 80,
        pattern: "^[A-Za-z0-9._:-]+$",
        description: "Use a unique ID per logical proposal; reuse it only to retry identical content.",
      },
      recommendation: {
        type: "string",
        enum: ["ready", "hold"],
        description: "Non-binding recommendation; only a human can confirm it.",
      },
      rationale: {
        type: "string",
        minLength: 1,
        maxLength: 1000,
        pattern: ".*\\S.*",
        description: "Evidence-grounded explanation for the recommendation.",
      },
      evidenceIds: {
        type: "array",
        minItems: 1,
        maxItems: 10,
        uniqueItems: true,
        items: {
          type: "string",
          minLength: 1,
          maxLength: 80,
          pattern: ".*\\S.*",
        },
        description: "Use evidence IDs returned by query_network_evidence.",
      },
      testProposalId: {
        type: "string",
        minLength: 1,
        maxLength: 80,
        pattern: ".*\\S.*",
        description: "ID of the approved test proposal that this decision depends on.",
      },
      verificationResultId: {
        type: "string",
        minLength: 1,
        maxLength: 80,
        pattern: ".*\\S.*",
        description: "Verification result ID returned by run_approved_verification for the approved test.",
      },
    },
    required: [
      "expectedStateVersion",
      "clientRequestId",
      "recommendation",
      "rationale",
      "evidenceIds",
      "testProposalId",
      "verificationResultId",
    ],
    additionalProperties: false,
  },
} as const;

function asRecord(input: Record<string, unknown>): Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ToolInputError("Tool input must be an object.");
  }
  return input;
}

function assertKeys(
  input: Record<string, unknown>,
  allowed: readonly string[],
  required: readonly string[],
): void {
  const unexpected = Object.keys(input).find((key) => !allowed.includes(key));
  if (unexpected) throw new ToolInputError(`Unexpected field: ${unexpected}.`);
  const missing = required.find((key) => !(key in input));
  if (missing) throw new ToolInputError(`Missing required field: ${missing}.`);
}

function readString(
  input: Record<string, unknown>,
  key: string,
  maximum: number,
): string {
  const value = input[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ToolInputError(`${key} must be a non-empty string.`);
  }
  const normalized = value.trim();
  if (normalized.length > maximum) {
    throw new ToolInputError(`${key} must be at most ${maximum} characters.`);
  }
  return normalized;
}

function readInteger(
  input: Record<string, unknown>,
  key: string,
  minimum: number,
  maximum: number,
): number {
  const value = input[key];
  if (!Number.isInteger(value) || Number(value) < minimum || Number(value) > maximum) {
    throw new ToolInputError(
      `${key} must be an integer between ${minimum} and ${maximum}.`,
    );
  }
  return Number(value);
}

function readEvidenceIds(input: Record<string, unknown>): string[] {
  const value = input.evidenceIds;
  if (!Array.isArray(value) || value.length < 1 || value.length > 10) {
    throw new ToolInputError("evidenceIds must contain between 1 and 10 IDs.");
  }
  const evidenceIds = value.map((item) => {
    if (typeof item !== "string" || item.trim().length === 0 || item.length > 80) {
      throw new ToolInputError("Each evidence ID must be a non-empty string.");
    }
    return item.trim();
  });
  if (new Set(evidenceIds).size !== evidenceIds.length) {
    throw new ToolInputError("evidenceIds must be unique.");
  }
  return evidenceIds;
}

function readClientRequestId(input: Record<string, unknown>): string {
  const clientRequestId = readString(input, "clientRequestId", 80);
  if (!/^[A-Za-z0-9._:-]+$/.test(clientRequestId)) {
    throw new ToolInputError(
      "clientRequestId may contain only letters, numbers, dot, underscore, colon, and hyphen.",
    );
  }
  return clientRequestId;
}

function parseSnapshotInput(input: Record<string, unknown>): Record<string, never> {
  const record = asRecord(input);
  assertKeys(record, [], []);
  return {};
}

function parseNetworkQuery(input: Record<string, unknown>): NetworkEvidenceQuery {
  const record = asRecord(input);
  assertKeys(record, ["riskType", "severity", "limit"], []);
  const riskTypes = [
    "duplicate_side_effect",
    "response_loss",
  ] as const;
  const severities = ["high", "medium", "low"] as const;
  const riskType = record.riskType;
  const severity = record.severity;
  if (riskType !== undefined && !riskTypes.includes(riskType as (typeof riskTypes)[number])) {
    throw new ToolInputError("riskType is not supported.");
  }
  if (severity !== undefined && !severities.includes(severity as (typeof severities)[number])) {
    throw new ToolInputError("severity is not supported.");
  }
  return {
    ...(riskType === undefined ? {} : { riskType: riskType as NetworkEvidenceQuery["riskType"] }),
    ...(severity === undefined ? {} : { severity: severity as NetworkEvidenceQuery["severity"] }),
    ...(record.limit === undefined
      ? {}
      : { limit: readInteger(record, "limit", 1, 20) }),
  };
}

function parseTestCase(input: Record<string, unknown>): TestCaseProposalInput {
  const record = asRecord(input);
  const fields = [
    "expectedStateVersion",
    "clientRequestId",
    "title",
    "given",
    "when",
    "then",
    "evidenceIds",
  ];
  assertKeys(record, fields, fields);
  return {
    expectedStateVersion: readInteger(
      record,
      "expectedStateVersion",
      0,
      Number.MAX_SAFE_INTEGER,
    ),
    clientRequestId: readClientRequestId(record),
    title: readString(record, "title", 120),
    given: readString(record, "given", 500),
    when: readString(record, "when", 500),
    then: readString(record, "then", 500),
    evidenceIds: readEvidenceIds(record),
  };
}

function parseReleaseDecision(
  input: Record<string, unknown>,
): ReleaseDecisionProposalInput {
  const record = asRecord(input);
  const required = [
    "expectedStateVersion",
    "clientRequestId",
    "recommendation",
    "rationale",
    "evidenceIds",
    "testProposalId",
    "verificationResultId",
  ];
  assertKeys(record, required, required);
  if (record.recommendation !== "ready" && record.recommendation !== "hold") {
    throw new ToolInputError("recommendation must be ready or hold.");
  }
  return {
    expectedStateVersion: readInteger(
      record,
      "expectedStateVersion",
      0,
      Number.MAX_SAFE_INTEGER,
    ),
    clientRequestId: readClientRequestId(record),
    recommendation: record.recommendation,
    rationale: readString(record, "rationale", 1000),
    evidenceIds: readEvidenceIds(record),
    testProposalId: readString(record, "testProposalId", 80),
    verificationResultId: readString(record, "verificationResultId", 80),
  };
}

function parseApprovedVerification(
  input: Record<string, unknown>,
): ApprovedVerificationInput {
  const record = asRecord(input);
  const base = [
    "expectedStateVersion",
    "clientRequestId",
    "testProposalId",
    "strategy",
  ];
  assertKeys(record, [...base, "seed", "maxSteps"], base);
  const common = {
    expectedStateVersion: readInteger(
      record,
      "expectedStateVersion",
      0,
      Number.MAX_SAFE_INTEGER,
    ),
    clientRequestId: readClientRequestId(record),
    testProposalId: readString(record, "testProposalId", 80),
  };
  if (record.strategy === "targeted_retry") {
    if (record.seed !== undefined || record.maxSteps !== undefined) {
      throw new ToolInputError(
        "seed and maxSteps are only supported for seeded_monkey.",
      );
    }
    return { ...common, strategy: record.strategy };
  }
  if (record.strategy !== "seeded_monkey") {
    throw new ToolInputError("strategy is not supported.");
  }
  if (record.seed === undefined || record.maxSteps === undefined) {
    throw new ToolInputError(
      "seeded_monkey requires both seed and maxSteps.",
    );
  }
  return {
    ...common,
    strategy: record.strategy,
    seed: readInteger(record, "seed", 0, 2_147_483_647),
    maxSteps: readInteger(record, "maxSteps", 1, 100),
  };
}

function assertActive(signal: AbortSignal): void {
  if (signal.aborted) throw new DOMException("Tool execution aborted.", "AbortError");
}

function getExecutionSignal(
  options: WebMCP.ToolExecuteCallbackOptions | undefined,
): AbortSignal {
  return options?.signal ?? new AbortController().signal;
}

export function createReleaseEvidenceTools(
  handlers: ReleaseEvidenceHandlers,
): WebMCP.ModelContextTool[] {
  return [
    {
      name: "get_release_snapshot",
      title: "Get release snapshot",
      description:
        "Read the active synthetic release, checks, evidence gaps, every proposal with its ID and status, human decision, and current state version. Use the returned stateVersion for the next proposal. Appends a local audit entry but makes no release change.",
      inputSchema: releaseToolSchemas.snapshot,
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      async execute(input, options) {
        const signal = getExecutionSignal(options);
        assertActive(signal);
        parseSnapshotInput(input);
        return handlers.getReleaseSnapshot(signal);
      },
    },
    {
      name: "query_network_evidence",
      title: "Query network evidence",
      description:
        "Filter only the bounded, redacted network evidence already present in this page. Updates local focus and audit state, but never fetches a URL, changes source evidence, or returns raw traffic.",
      inputSchema: releaseToolSchemas.networkQuery,
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      async execute(input, options) {
        const signal = getExecutionSignal(options);
        assertActive(signal);
        return handlers.queryNetworkEvidence(parseNetworkQuery(input), signal);
      },
    },
    {
      name: "propose_test_case",
      title: "Propose a test case",
      description:
        "Create an evidence-linked pending test proposal for human review. Does not approve or execute the test.",
      inputSchema: releaseToolSchemas.testCase,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input, options) {
        const signal = getExecutionSignal(options);
        assertActive(signal);
        return handlers.proposeTestCase(parseTestCase(input), signal);
      },
    },
    {
      name: "run_approved_verification",
      title: "Run approved verification",
      description:
        "Execute an approved test proposal only inside this page's bounded synthetic sandbox. Supports an exact retry replay or a seeded state-machine monkey run with at most 100 steps. Returns risk_confirmed, not_reproduced, or inconclusive; never calls a live service or runs arbitrary code.",
      inputSchema: releaseToolSchemas.verification,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input, options) {
        const signal = getExecutionSignal(options);
        assertActive(signal);
        return handlers.runApprovedVerification(
          parseApprovedVerification(input),
          signal,
        );
      },
    },
    {
      name: "propose_release_decision",
      title: "Propose a release decision",
      description:
        "Create a non-binding READY or HOLD proposal grounded in room evidence. Requires an approved test proposal and its matching verification result; READY additionally requires a not_reproduced verdict. Cannot confirm, deploy, or release.",
      inputSchema: releaseToolSchemas.releaseDecision,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input, options) {
        const signal = getExecutionSignal(options);
        assertActive(signal);
        return handlers.proposeReleaseDecision(parseReleaseDecision(input), signal);
      },
    },
  ];
}

function detectRegistry(): ToolRegistry | undefined {
  return typeof document === "undefined" ? undefined : document.modelContext;
}

export async function registerReleaseEvidenceTools(
  handlers: ReleaseEvidenceHandlers,
  registry: ToolRegistry | undefined = detectRegistry(),
  controller: AbortController = new AbortController(),
): Promise<(() => void) | null> {
  if (!registry) return null;
  try {
    for (const tool of createReleaseEvidenceTools(handlers)) {
      assertActive(controller.signal);
      await registry.registerTool(tool, { signal: controller.signal });
    }
  } catch (error) {
    controller.abort();
    throw error;
  }
  return () => controller.abort();
}
