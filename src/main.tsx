import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createReleaseRoomStore } from "./domain/store";
import { ReleaseRoomRoot } from "./Root";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element was not found.");

const store = createReleaseRoomStore(window.localStorage);

createRoot(rootElement).render(
  <StrictMode>
    <ReleaseRoomRoot store={store} />
  </StrictMode>,
);
