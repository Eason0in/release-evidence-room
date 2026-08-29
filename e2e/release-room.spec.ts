import { expect, test } from "@playwright/test";

const demoRecording = process.env.DEMO_RECORDING === "1";

type BrowserTool = {
  execute(
    input: Record<string, unknown>,
    options?: { signal: AbortSignal },
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
  await page.goto("/checkout");

  await expect(
    page.getByRole("heading", { name: "Checkout QA Sandbox" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Place order · lose response" }).click();
  await expect(
    page.getByText("Response lost after acceptance", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Retry with a new key" }).click();
  await expect(
    page.getByText("2 side effects observed", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Send evidence to Release Room" }).click();
  await page.getByRole("link", { name: "Open Release Evidence Room" }).click();

  await expect(
    page.getByRole("heading", { name: "Release Evidence Room" }),
  ).toBeVisible();
  await expect(page.getByText("checkout_session_017")).toBeVisible();
  await expect(page.getByText("CHECKOUT RUNTIME")).toBeVisible();
  await expect(page.getByText("idem_7f3c · idem_b15a")).toBeVisible();
  await expect(page.getByText("op_01 · op_02")).toBeVisible();
  await expect(page.getByText("WebMCP · 5 tools available")).toBeVisible();
  await expect(page.getByText("18 / 18")).toBeVisible();
  await addDemoWatermark(page);
  await demoPause(page, 5_000);
  await demoOverlay(
    page,
    "SIMULATED USER PROMPT",
    "Review this release candidate for payment-retry safety.",
    "Query both the accepted initial attempt and its retry. Propose one test linked to both records, but do not approve it for me.",
    6_000,
  );

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
      "run_approved_verification",
    ].sort(),
  );
  expect(toolNames.some((name) => name.includes("deploy"))).toBe(false);

  await demoToolCall(page, "get_release_snapshot", "Read state v12 and its coverage gaps.");
  await invokeTool(page, "get_release_snapshot", {});
  await demoPause(page, 3_000);
  await demoToolCall(
    page,
    "query_network_evidence",
    "Read both page-owned attempts required for the retry replay.",
  );
  await invokeTool(page, "query_network_evidence", {
    limit: 5,
  });
  await expect(page.getByText("AGENT FOCUS")).toBeVisible();
  await expect(page.locator('[data-evidence-id="netev_response_016"]')).toHaveClass(
    /focused-row/,
  );
  await expect(page.locator('[data-evidence-id="netev_retry_017"]')).toHaveClass(
    /focused-row/,
  );
  await demoFocus(page, ".evidence-panel");
  await demoPause(page, 7_000);

  await demoToolCall(
    page,
    "propose_test_case",
    "Create a pending evidence-linked test proposal.",
  );
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

  await demoToolCall(page, "get_release_snapshot", "Read the human-approved test at state v14.");
  await invokeTool(page, "get_release_snapshot", {});
  await demoPause(page, 2_000);
  await demoToolCall(
    page,
    "run_approved_verification",
    "Replay the approved retry case in the bounded synthetic ledger.",
  );
  await invokeTool(page, "run_approved_verification", {
    expectedStateVersion: 14,
    clientRequestId: "req-e2e-targeted-01",
    testProposalId: "P-017",
    strategy: "targeted_retry",
  });
  await expect(page.getByText("VERIFICATION · V-001")).toBeVisible();
  await expect(page.getByText("TARGETED RETRY", { exact: true })).toBeVisible();
  await demoPause(page, 4_000);
  await demoToolCall(
    page,
    "run_approved_verification",
    "Explore the same approved boundary with seed 37 and at most 20 steps.",
  );
  await invokeTool(page, "run_approved_verification", {
    expectedStateVersion: 15,
    clientRequestId: "req-e2e-monkey-01",
    testProposalId: "P-017",
    strategy: "seeded_monkey",
    seed: 37,
    maxSteps: 20,
  });
  await expect(page.getByText("VERIFICATION · V-002")).toBeVisible();
  await expect(page.getByText("SEEDED MONKEY", { exact: true })).toBeVisible();
  await expect(page.getByText(/seed 37 · 4 of 20 steps/i)).toBeVisible();
  await demoPause(page, 4_000);
  await demoToolCall(
    page,
    "propose_release_decision",
    "Recommend HOLD without changing the human decision.",
  );
  await invokeTool(page, "propose_release_decision", {
    expectedStateVersion: 16,
    clientRequestId: "req-e2e-decision-01",
    recommendation: "hold",
    rationale:
      "Both approved sandbox strategies reproduced duplicate side effects.",
    evidenceIds: ["netev_retry_017", "netev_response_016"],
    testProposalId: "P-017",
    verificationResultId: "V-002",
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
    JSON.parse(localStorage.getItem("release-evidence-room/v3")!),
  );
  expect(persisted.state).toMatchObject({
    stateVersion: 18,
    humanDecision: "hold",
    proposals: [
      { proposalId: "P-017", status: "approved" },
      { proposalId: "P-018", status: "confirmed" },
    ],
    verifications: [
      {
        verificationResultId: "V-001",
        strategy: "targeted_retry",
        verdict: "risk_confirmed",
      },
      {
        verificationResultId: "V-002",
        strategy: "seeded_monkey",
        verdict: "risk_confirmed",
        seed: 37,
        maxSteps: 20,
      },
    ],
  });
  expect(persisted.state.activity).toHaveLength(9);
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

async function demoToolCall(
  page: import("@playwright/test").Page,
  name: string,
  summary: string,
): Promise<void> {
  await demoOverlay(page, "INTEGRATION CALLBACK", name, summary, 2_200);
}

async function addDemoWatermark(
  page: import("@playwright/test").Page,
): Promise<void> {
  if (!demoRecording) return;
  await page.evaluate(() => {
    const watermark = document.createElement("div");
    watermark.id = "demo-watermark";
    watermark.textContent = "SIMULATED INTEGRATION TEST · NOT NATIVE EVIDENCE";
    Object.assign(watermark.style, {
      position: "fixed",
      zIndex: "9998",
      right: "22px",
      bottom: "22px",
      padding: "9px 12px",
      color: "#ffbd59",
      background: "rgba(9, 13, 18, .94)",
      border: "1px solid #ffbd59",
      font: "700 10px ui-monospace, monospace",
      letterSpacing: ".08em",
    });
    document.body.append(watermark);
  });
}

async function demoOverlay(
  page: import("@playwright/test").Page,
  eyebrow: string,
  title: string,
  copy: string,
  milliseconds: number,
): Promise<void> {
  if (!demoRecording) return;
  await page.evaluate(
    ({ overlayEyebrow, overlayTitle, overlayCopy }) => {
      document.getElementById("demo-overlay")?.remove();
      const overlay = document.createElement("aside");
      overlay.id = "demo-overlay";
      overlay.setAttribute("aria-label", `${overlayEyebrow}: ${overlayTitle}`);
      Object.assign(overlay.style, {
        position: "fixed",
        zIndex: "9999",
        top: "22px",
        right: "22px",
        width: "min(520px, calc(100vw - 44px))",
        padding: "18px 20px",
        color: "#eaf1f6",
        background: "rgba(9, 13, 18, .96)",
        border: "1px solid #6fc9ec",
        boxShadow: "0 18px 50px rgba(0, 0, 0, .45)",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      });
      const label = document.createElement("p");
      label.textContent = overlayEyebrow;
      Object.assign(label.style, {
        margin: "0 0 8px",
        color: "#6fc9ec",
        font: "700 11px ui-monospace, monospace",
        letterSpacing: ".14em",
      });
      const heading = document.createElement("strong");
      heading.textContent = overlayTitle;
      Object.assign(heading.style, {
        display: "block",
        font: "800 20px ui-monospace, monospace",
        overflowWrap: "anywhere",
      });
      const detail = document.createElement("p");
      detail.textContent = overlayCopy;
      Object.assign(detail.style, {
        margin: "10px 0 0",
        color: "#b8c4cd",
        fontSize: "14px",
        lineHeight: "1.45",
      });
      overlay.append(label, heading, detail);
      document.body.append(overlay);
    },
    {
      overlayEyebrow: eyebrow,
      overlayTitle: title,
      overlayCopy: copy,
    },
  );
  await page.waitForTimeout(milliseconds);
  await page.evaluate(() => document.getElementById("demo-overlay")?.remove());
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
      return tools[toolName].execute(toolInput);
    },
    { toolName: name, toolInput: input },
  );
}
