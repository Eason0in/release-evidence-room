import { fireEvent, render, screen } from "@testing-library/react";
import { RELEASE_ROOM_STORAGE_KEY } from "../domain/store";
import { createReleaseRoomStore } from "../domain/store";
import { proposeTestCase } from "../domain/workflow";
import { CheckoutSandbox } from "./CheckoutSandbox";

describe("CheckoutSandbox", () => {
  beforeEach(() => localStorage.clear());

  it("sends runtime checkout evidence into the release room", () => {
    const view = render(<CheckoutSandbox storage={localStorage} />);

    expect(
      screen.getByRole("heading", { name: "Checkout QA Sandbox" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/no real payment/i)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Place order · lose response" }),
    );
    expect(screen.getByText("Response lost after acceptance")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Response lost after acceptance",
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Retry with a new key" }),
    );
    expect(screen.getByText("2 side effects observed")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "2 side effects observed",
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Send evidence to Release Room" }),
    );

    const stored = JSON.parse(localStorage.getItem(RELEASE_ROOM_STORAGE_KEY)!);
    expect(stored.state).toMatchObject({
      evidenceSession: {
        sessionId: "checkout_session_017",
        sourcePath: "/checkout",
        retryMode: "new_key",
        provenance: "checkout_runtime",
      },
      networkEvidence: [
        {
          operationRefs: ["op_01", "op_02"],
          idempotencyKeyRefs: ["idem_7f3c", "idem_b15a"],
        },
        {
          operationRefs: ["op_01"],
          idempotencyKeyRefs: ["idem_7f3c"],
        },
      ],
    });
    expect(
      screen.getByRole("link", { name: "Open Release Evidence Room" }),
    ).toHaveAttribute("href", "/");

    view.unmount();
    render(<CheckoutSandbox storage={localStorage} />);
    expect(screen.getByText("2 side effects observed")).toBeInTheDocument();
    expect(screen.getByText("idem_b15a")).toBeInTheDocument();
  });

  it("does not silently replace an existing review or its audit trail", () => {
    const store = createReleaseRoomStore(localStorage);
    const proposed = proposeTestCase(store.getState(), {
      expectedStateVersion: 12,
      clientRequestId: "req-existing-review",
      title: "Existing reviewed test",
      given: "An existing release review is in progress.",
      when: "Checkout evidence is sent again.",
      then: "The existing review remains intact.",
      evidenceIds: ["netev_retry_017"],
    });
    expect(proposed.ok).toBe(true);
    if (!proposed.ok) return;
    store.setState(proposed.state);

    render(<CheckoutSandbox storage={localStorage} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Place order · lose response" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Retry with a new key" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Send evidence to Release Room" }),
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      /existing review has activity/i,
    );
    const stored = JSON.parse(localStorage.getItem(RELEASE_ROOM_STORAGE_KEY)!);
    expect(stored.state).toMatchObject({
      stateVersion: 13,
      proposals: [{ clientRequestId: "req-existing-review" }],
      evidenceSession: { provenance: "fixture" },
    });
  });
});
