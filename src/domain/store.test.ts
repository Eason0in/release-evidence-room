import { createDemoReleaseState } from "./evidence";
import { createReleaseRoomStore, RELEASE_ROOM_STORAGE_KEY } from "./store";
import { proposeTestCase } from "./workflow";

const proposalInput = {
  expectedStateVersion: 12,
  clientRequestId: "req-store-test",
  title: "Retry after acceptance reuses the idempotency key",
  given: "The server accepts a payment attempt and its response is lost.",
  when: "The mobile client retries the same payment intent.",
  then: "The retry resolves to the original operation using the original key.",
  evidenceIds: ["netev_retry_017", "netev_response_016"],
} as const;

describe("release room store", () => {
  beforeEach(() => localStorage.clear());

  it("starts from the deterministic demo state", () => {
    const store = createReleaseRoomStore(localStorage);

    expect(store.getState()).toEqual(createDemoReleaseState());
  });

  it("persists a valid state for the next store instance", () => {
    const firstStore = createReleaseRoomStore(localStorage);
    const proposed = proposeTestCase(firstStore.getState(), proposalInput);
    expect(proposed.ok).toBe(true);
    if (!proposed.ok) return;
    firstStore.setState(proposed.state);

    const reloadedStore = createReleaseRoomStore(localStorage);

    expect(reloadedStore.getState()).toEqual(proposed.state);
  });

  it("fails closed to a clean demo when saved state is malformed", () => {
    localStorage.setItem(
      RELEASE_ROOM_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: "release-evidence-room/v1",
        state: { releaseId: "rel_demo_1042", stateVersion: "tampered" },
      }),
    );

    const store = createReleaseRoomStore(localStorage);

    expect(store.getState()).toEqual(createDemoReleaseState());
    expect(JSON.parse(localStorage.getItem(RELEASE_ROOM_STORAGE_KEY)!)).toMatchObject({
      schemaVersion: "release-evidence-room/v1",
      state: { releaseId: "rel_demo_1042", stateVersion: 12 },
    });
  });

  it("notifies subscribers and can reset the demo", () => {
    const store = createReleaseRoomStore(localStorage);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    const proposed = proposeTestCase(store.getState(), proposalInput);
    expect(proposed.ok).toBe(true);
    if (!proposed.ok) return;

    store.setState(proposed.state);
    store.reset();
    unsubscribe();
    store.setState(proposed.state);

    expect(listener).toHaveBeenCalledTimes(2);
    expect(store.getState().stateVersion).toBe(13);
  });
});
