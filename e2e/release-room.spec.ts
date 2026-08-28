import { expect, test } from "@playwright/test";

const demoRecording = process.env.DEMO_RECORDING === "1";

type BrowserTool = {
  execute(
    input: Record<string, unknown>,
    options: { signal: AbortSignal },
  ): Promise<unknown> | unknown;
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const tools: Record<string, BrowserTool> = {};
    Object.defineProperty(window, "__releaseEvidenceTools", {
      value: tools,
      configurable: true,
    });
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: {
        async registerTool(tool: BrowserTool & { name: string }) {
          tools[tool.name] = tool;
        },
      },
    });
  });
});

test("agent proposes and a human confirms HOLD", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Release Evidence Room" }),
  ).toBeVisible();
  await expect(page.getByText("WebMCP · 4 tools available")).toBeVisible();
  await expect(page.getByText("18 / 18")).toBeVisible();
  await demoPause(page, 5_000);

  const toolNames = await page.evaluate(() =>
    Object.keys(
      (window as unknown as { __releaseEvidenceTools: Record<string, BrowserTool> })
        .__releaseEvidenceTools,
    ),
  );
  expect(toolNames.sort()).toEqual(
    [
      "get_release_snapshot",
      "propose_release_decision",
      "propose_test_case",
      "query_network_evidence",
    ].sort(),
  );
  expect(toolNames.some((name) => name.includes("deploy"))).toBe(false);

  await invokeTool(page, "get_release_snapshot", {});
  await demoPause(page, 3_000);
  await invokeTool(page, "query_network_evidence", {
    riskType: "duplicate_side_effect",
    severity: "high",
    limit: 5,
  });
  await expect(page.getByText("AGENT FOCUS")).toBeVisible();
  await expect(page.locator('[data-evidence-id="netev_retry_017"]')).toHaveClass(
    /focused-row/,
  );
  await demoFocus(page, ".evidence-panel");
  await demoPause(page, 7_000);

  await invokeTool(page, "propose_test_case", {
    expectedStateVersion: 12,
    clientRequestId: "req-e2e-test-01",
    title: "Retry after acceptance must reuse the idempotency key",
    given: "The server accepts a payment attempt and its response is lost.",
    when: "The mobile client retries the same payment intent.",
    then: "The retry resolves to the original operation using the original key.",
    evidenceIds: ["netev_retry_017", "netev_response_016"],
  });
  await expect(page.getByText("PENDING HUMAN REVIEW", { exact: true })).toBeVisible();
  await demoFocus(page, ".inbox-panel");
  await demoPause(page, 6_000);
  await page.getByRole("button", { name: "Approve test" }).click();
  await expect(page.getByText("APPROVED BY HUMAN", { exact: true })).toBeVisible();
  await demoPause(page, 6_000);

  await invokeTool(page, "get_release_snapshot", {});
  await demoPause(page, 2_000);
  await invokeTool(page, "propose_release_decision", {
    expectedStateVersion: 14,
    clientRequestId: "req-e2e-decision-01",
    recommendation: "hold",
    rationale:
      "Exactly-once behavior is unproven until the approved retry test passes.",
    evidenceIds: ["netev_retry_017", "netev_response_016"],
    testProposalId: "P-017",
  });

  await expect(page.locator(".proposal-recommendation")).toHaveText("HOLD");
  await expect(page.locator(".decision")).toHaveText("UNDECIDED");
  await demoFocus(page, ".inbox-panel");
  await demoPause(page, 7_000);
  await page.getByRole("button", { name: "Confirm HOLD" }).click();
  await expect(page.locator(".decision")).toHaveText("HOLD");
  await expect(page.getByText("Human confirmed")).toBeVisible();
  await demoFocus(page, ".release-header");
  await demoPause(page, 5_000);
  await demoFocus(page, ".timeline-panel");
  await demoPause(page, 8_000);

  const persisted = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("release-evidence-room/v1")!),
  );
  expect(persisted.state).toMatchObject({
    stateVersion: 16,
    humanDecision: "hold",
    proposals: [
      { proposalId: "P-017", status: "approved" },
      { proposalId: "P-018", status: "confirmed" },
    ],
  });
  expect(persisted.state.activity).toHaveLength(7);
});

async function demoPause(
  page: import("@playwright/test").Page,
  milliseconds: number,
): Promise<void> {
  if (demoRecording) await page.waitForTimeout(milliseconds);
}

async function demoFocus(
  page: import("@playwright/test").Page,
  selector: string,
): Promise<void> {
  if (demoRecording) await page.locator(selector).scrollIntoViewIfNeeded();
}

async function invokeTool(
  page: import("@playwright/test").Page,
  name: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  return page.evaluate(
    async ({ toolName, toolInput }) => {
      const tools = (
        window as unknown as {
          __releaseEvidenceTools: Record<string, BrowserTool>;
        }
      ).__releaseEvidenceTools;
      return tools[toolName].execute(toolInput, {
        signal: new AbortController().signal,
      });
    },
    { toolName: name, toolInput: input },
  );
}
