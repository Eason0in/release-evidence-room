import {
  createDemoReleaseState,
  getReleaseSnapshot,
  queryNetworkEvidence,
} from "./evidence";

describe("release evidence", () => {
  it("surfaces unresolved high risk even when all automated tests pass", () => {
    const state = createDemoReleaseState();

    const snapshot = getReleaseSnapshot(state);

    expect(snapshot.tests).toEqual({ total: 18, passed: 18, failed: 0 });
    expect(snapshot.unresolvedRiskCounts).toEqual({ high: 1, medium: 1, low: 0 });
    expect(snapshot.humanDecision).toBe("pending");
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
});
