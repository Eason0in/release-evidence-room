import { useEffect, useMemo, useState } from "react";
import { App, type WebMcpStatus } from "./App";
import type { ReleaseRoomStore } from "./domain/store";
import { createReleaseEvidenceHandlers } from "./webmcp/handlers";
import {
  registerReleaseEvidenceTools,
  type ToolRegistry,
} from "./webmcp/tools";

interface ReleaseRoomRootProps {
  readonly store: ReleaseRoomStore;
  readonly registry?: ToolRegistry | null;
}

function browserRegistry(): ToolRegistry | undefined {
  return typeof document === "undefined" ? undefined : document.modelContext;
}

export function ReleaseRoomRoot({ store, registry }: ReleaseRoomRootProps) {
  const resolvedAtRender = registry === null ? undefined : registry ?? browserRegistry();
  const [status, setStatus] = useState<WebMcpStatus>(
    resolvedAtRender ? "registering" : "unsupported",
  );
  const handlers = useMemo(() => createReleaseEvidenceHandlers(store), [store]);

  useEffect(() => {
    const resolvedRegistry = registry === null ? undefined : registry ?? browserRegistry();
    if (!resolvedRegistry) {
      setStatus("unsupported");
      return;
    }

    let active = true;
    let dispose: (() => void) | null = null;
    const registrationController = new AbortController();
    setStatus("registering");
    void registerReleaseEvidenceTools(
      handlers,
      resolvedRegistry,
      registrationController,
    )
      .then((registeredDispose) => {
        if (!active) {
          registeredDispose?.();
          return;
        }
        dispose = registeredDispose;
        setStatus(registeredDispose ? "available" : "unsupported");
      })
      .catch(() => {
        if (active) setStatus("error");
      });

    return () => {
      active = false;
      registrationController.abort();
      dispose?.();
    };
  }, [handlers, registry]);

  return <App store={store} webMcpStatus={status} />;
}
