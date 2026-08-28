import { render, screen } from "@testing-library/react";
import { SiteRoot } from "./SiteRoot";

describe("SiteRoot", () => {
  beforeEach(() => {
    localStorage.clear();
    document.title = "Release Evidence Room";
    document.head.querySelector('link[rel="canonical"]')?.remove();
    const canonical = document.createElement("link");
    canonical.rel = "canonical";
    canonical.href = "https://release-evidence-room.vercel.app/";
    document.head.append(canonical);
  });

  it("routes the public checkout path to the test target", () => {
    render(
      <SiteRoot pathname="/checkout" storage={localStorage} registry={null} />,
    );

    expect(
      screen.getByRole("heading", { name: "Checkout QA Sandbox" }),
    ).toBeInTheDocument();
    expect(document.title).toBe("Checkout QA Sandbox · Release Evidence Room");
    expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://release-evidence-room.vercel.app/checkout",
    );
  });

  it("keeps the release room at the canonical root", () => {
    render(<SiteRoot pathname="/" storage={localStorage} registry={null} />);

    expect(
      screen.getByRole("heading", { name: "Release Evidence Room" }),
    ).toBeInTheDocument();
    expect(document.title).toBe("Release Evidence Room");
  });
});
