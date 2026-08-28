import { useEffect, useMemo } from "react";
import { CheckoutSandbox } from "./checkout/CheckoutSandbox";
import { createReleaseRoomStore } from "./domain/store";
import { ReleaseRoomRoot } from "./Root";
import type { ToolRegistry } from "./webmcp/tools";

interface SiteRootProps {
  readonly pathname: string;
  readonly storage: Storage;
  readonly registry?: ToolRegistry | null;
}

export function SiteRoot({ pathname, storage, registry }: SiteRootProps) {
  const store = useMemo(() => createReleaseRoomStore(storage), [storage]);
  const checkoutRoute = pathname === "/checkout";

  useEffect(() => {
    document.title = checkoutRoute
      ? "Checkout QA Sandbox · Release Evidence Room"
      : "Release Evidence Room";
    document.head
      .querySelector('link[rel="canonical"]')
      ?.setAttribute(
        "href",
        checkoutRoute
          ? "https://release-evidence-room.vercel.app/checkout"
          : "https://release-evidence-room.vercel.app/",
      );
  }, [checkoutRoute]);

  return checkoutRoute ? (
    <CheckoutSandbox storage={storage} />
  ) : (
    <ReleaseRoomRoot store={store} registry={registry} />
  );
}
