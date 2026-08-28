import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SiteRoot } from "./SiteRoot";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element was not found.");

createRoot(rootElement).render(
  <StrictMode>
    <SiteRoot pathname={window.location.pathname} storage={window.localStorage} />
  </StrictMode>,
);
