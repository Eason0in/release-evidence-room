import { render, screen, waitFor } from "@testing-library/react";
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
});
