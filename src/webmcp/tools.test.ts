import {
  createReleaseEvidenceTools,
  registerReleaseEvidenceTools,
  releaseToolSchemas,
  ToolInputError,
  type ReleaseEvidenceHandlers,
  type ToolRegistry,
} from "./tools";

function createHandlers(): ReleaseEvidenceHandlers {
  return {
    getReleaseSnapshot: vi.fn(() => ({ releaseId: "rel_demo_1042" })),
    queryNetworkEvidence: vi.fn((input) => ({ input })),
    proposeTestCase: vi.fn((input) => ({ input })),
    runApprovedVerification: vi.fn((input) => ({ input })),
    proposeReleaseDecision: vi.fn((input) => ({ input })),
  };
}

describe("WebMCP tools", () => {
  it("defines exactly five uniquely named tools with strict schemas", () => {
    const tools = createReleaseEvidenceTools(createHandlers());

    expect(tools.map((tool) => tool.name)).toEqual([
      "get_release_snapshot",
      "query_network_evidence",
      "propose_test_case",
      "run_approved_verification",
      "propose_release_decision",
    ]);
    expect(new Set(tools.map((tool) => tool.name))).toHaveLength(5);
    for (const tool of tools) {
      expect(tool.inputSchema).toMatchObject({
        type: "object",
        additionalProperties: false,
      });
    }
    expect(tools[0].annotations?.readOnlyHint).toBe(false);
    expect(tools[1].annotations?.readOnlyHint).toBe(false);
    expect(tools[2].annotations?.readOnlyHint).toBe(false);
    expect(tools[3].annotations?.readOnlyHint).toBe(false);
    expect(tools[4].annotations?.readOnlyHint).toBe(false);
  });

  it("rejects risk filters that have no evidence in the room", async () => {
    const handlers = createHandlers();
    const tool = createReleaseEvidenceTools(handlers)[1];

    await expect(
      Promise.resolve().then(() =>
        tool.execute(
          { riskType: "retry_without_stable_key" },
          { signal: new AbortController().signal },
        ),
      ),
    ).rejects.toBeInstanceOf(ToolInputError);
    expect(handlers.queryNetworkEvidence).not.toHaveBeenCalled();
  });

  it("gives native agents schema guidance that matches runtime validation", () => {
    expect(releaseToolSchemas.testCase.properties.clientRequestId).toMatchObject({
      pattern: "^[A-Za-z0-9._:-]+$",
      description: expect.stringMatching(/retry identical content/i),
    });
    expect(releaseToolSchemas.testCase.properties.expectedStateVersion).toMatchObject({
      maximum: Number.MAX_SAFE_INTEGER,
      description: expect.stringMatching(/latest get_release_snapshot/i),
    });
    expect(releaseToolSchemas.verification.properties.expectedStateVersion).toMatchObject({
      maximum: Number.MAX_SAFE_INTEGER,
    });
    expect(releaseToolSchemas.releaseDecision.properties.expectedStateVersion).toMatchObject({
      maximum: Number.MAX_SAFE_INTEGER,
    });
    expect(releaseToolSchemas.testCase.properties.evidenceIds).toMatchObject({
      description: expect.stringMatching(/query_network_evidence/i),
    });
    expect(releaseToolSchemas.releaseDecision.properties.testProposalId).toMatchObject({
      description: expect.stringMatching(/approved test/i),
    });
    expect(releaseToolSchemas.verification.properties.strategy).toMatchObject({
      enum: ["targeted_retry", "seeded_monkey"],
    });
    expect(releaseToolSchemas.verification.properties.maxSteps).toMatchObject({
      minimum: 1,
      maximum: 100,
    });
    expect(releaseToolSchemas.verification.oneOf).toEqual([
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
    ]);
    expect(releaseToolSchemas.releaseDecision.properties.verificationResultId).toMatchObject({
      description: expect.stringMatching(/verification result/i),
    });
  });

  it("quietly preserves the normal UI when WebMCP is unavailable", async () => {
    const result = await registerReleaseEvidenceTools(createHandlers(), undefined);

    expect(result).toBeNull();
  });

  it("registers all tools with one disposable signal", async () => {
    const signals: AbortSignal[] = [];
    const registry: ToolRegistry = {
      registerTool: vi.fn(async (_tool, options) => {
        signals.push(options!.signal!);
      }),
    };

    const dispose = await registerReleaseEvidenceTools(createHandlers(), registry);

    expect(registry.registerTool).toHaveBeenCalledTimes(5);
    expect(new Set(signals)).toHaveLength(1);
    expect(signals[0].aborted).toBe(false);
    dispose?.();
    expect(signals[0].aborted).toBe(true);
  });

  it("aborts prior registrations when a later registration fails", async () => {
    let firstSignal: AbortSignal | undefined;
    const registry: ToolRegistry = {
      registerTool: vi
        .fn()
        .mockImplementationOnce(async (_tool, options) => {
          firstSignal = options.signal;
        })
        .mockRejectedValueOnce(new Error("registration failed")),
    };

    await expect(
      registerReleaseEvidenceTools(createHandlers(), registry),
    ).rejects.toThrow("registration failed");
    expect(firstSignal?.aborted).toBe(true);
  });

  it("rejects extra snapshot input before calling the handler", async () => {
    const handlers = createHandlers();
    const tool = createReleaseEvidenceTools(handlers)[0];

    await expect(
      Promise.resolve().then(() =>
        tool.execute({ unexpected: true }, { signal: new AbortController().signal }),
      ),
    ).rejects.toBeInstanceOf(ToolInputError);
    expect(handlers.getReleaseSnapshot).not.toHaveBeenCalled();
  });

  it("rejects malformed proposal input before calling the handler", async () => {
    const handlers = createHandlers();
    const tool = createReleaseEvidenceTools(handlers)[2];

    await expect(
      Promise.resolve().then(() =>
        tool.execute(
          {
            expectedStateVersion: 12,
            clientRequestId: "req-01",
            title: "Missing evidence",
            given: "Given",
            when: "When",
            then: "Then",
            evidenceIds: [],
          },
          { signal: new AbortController().signal },
        ),
      ),
    ).rejects.toMatchObject({ code: "invalid_tool_input" });
    expect(handlers.proposeTestCase).not.toHaveBeenCalled();
  });

  it("passes normalized valid input and the invocation signal to handlers", async () => {
    const handlers = createHandlers();
    const tools = createReleaseEvidenceTools(handlers);
    const controller = new AbortController();

    await tools[1].execute(
      { riskType: "duplicate_side_effect", severity: "high", limit: 5 },
      { signal: controller.signal },
    );
    await tools[2].execute(
      {
        expectedStateVersion: 12,
        clientRequestId: "req-demo-test-01",
        title: "Retry safely",
        given: "The first accepted response is lost.",
        when: "The same intent is retried.",
        then: "The original key and operation are reused.",
        evidenceIds: ["netev_retry_017"],
      },
      { signal: controller.signal },
    );

    expect(handlers.queryNetworkEvidence).toHaveBeenCalledWith(
      { riskType: "duplicate_side_effect", severity: "high", limit: 5 },
      controller.signal,
    );
    expect(handlers.proposeTestCase).toHaveBeenCalledWith(
      expect.objectContaining({ clientRequestId: "req-demo-test-01" }),
      controller.signal,
    );
  });

  it("accepts only bounded verification strategies", async () => {
    const handlers = createHandlers();
    const tool = createReleaseEvidenceTools(handlers)[3];
    const controller = new AbortController();

    await tool.execute(
      {
        expectedStateVersion: 14,
        clientRequestId: "verify-targeted-001",
        testProposalId: "P-017",
        strategy: "targeted_retry",
      },
      { signal: controller.signal },
    );
    await tool.execute(
      {
        expectedStateVersion: 15,
        clientRequestId: "verify-monkey-001",
        testProposalId: "P-017",
        strategy: "seeded_monkey",
        seed: 37,
        maxSteps: 20,
      },
      { signal: controller.signal },
    );

    expect(handlers.runApprovedVerification).toHaveBeenNthCalledWith(
      1,
      {
        expectedStateVersion: 14,
        clientRequestId: "verify-targeted-001",
        testProposalId: "P-017",
        strategy: "targeted_retry",
      },
      controller.signal,
    );
    expect(handlers.runApprovedVerification).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ strategy: "seeded_monkey", seed: 37, maxSteps: 20 }),
      controller.signal,
    );

    await expect(
      Promise.resolve().then(() =>
        tool.execute(
          {
            expectedStateVersion: 15,
            clientRequestId: "verify-unbounded",
            testProposalId: "P-017",
            strategy: "seeded_monkey",
            seed: 37,
            maxSteps: 101,
          },
          { signal: controller.signal },
        ),
      ),
    ).rejects.toBeInstanceOf(ToolInputError);
  });

  it("executes when a WebMCP host omits callback options", async () => {
    const handlers = createHandlers();
    const tool = createReleaseEvidenceTools(handlers)[0];

    await Reflect.apply(tool.execute, undefined, [{}]);

    expect(handlers.getReleaseSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ aborted: false }),
    );
  });
});
