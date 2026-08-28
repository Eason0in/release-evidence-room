import { render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { createReleaseRoomStore } from "./domain/store";
import type { ToolRegistry } from "./webmcp/tools";
import { ReleaseRoomRoot } from "./Root";

describe("ReleaseRoomRoot", () => {
  beforeEach(() => localStorage.clear());

  it("reports four available tools after WebMCP registration", async () => {
    const registry: ToolRegistry = {
      registerTool: vi.fn(async () => undefined),
    };

    render(
      <ReleaseRoomRoot
        store={createReleaseRoomStore(localStorage)}
        registry={registry}
      />,
    );

    expect(screen.getByText("WebMCP · registering tools")).toBeInTheDocument();
    await screen.findByText("WebMCP · 4 tools available");
    expect(registry.registerTool).toHaveBeenCalledTimes(4);
  });

  it("keeps the full UI available without WebMCP", async () => {
    render(
      <ReleaseRoomRoot
        store={createReleaseRoomStore(localStorage)}
        registry={null}
      />,
    );

    await waitFor(() =>
      expect(
        screen.getByText("WebMCP · activates in a supported browser"),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("18 / 18")).toBeInTheDocument();
  });

  it("survives the development StrictMode registration cycle", async () => {
    const registered = new Set<string>();
    const registry: ToolRegistry = {
      registerTool: vi.fn(async (tool, options) => {
        if (registered.has(tool.name)) throw new Error(`duplicate ${tool.name}`);
        registered.add(tool.name);
        options?.signal?.addEventListener(
          "abort",
          () => registered.delete(tool.name),
          { once: true },
        );
        await Promise.resolve();
      }),
    };

    render(
      <StrictMode>
        <ReleaseRoomRoot
          store={createReleaseRoomStore(localStorage)}
          registry={registry}
        />
      </StrictMode>,
    );

    await screen.findByText("WebMCP · 4 tools available");
    expect([...registered].sort()).toEqual([
      "get_release_snapshot",
      "propose_release_decision",
      "propose_test_case",
      "query_network_evidence",
    ]);
  });
});
