import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FigurePortrait, parseAttribution } from "@/components/stories/figure-portrait";

/**
 * Every photograph on this platform is freely licensed and carries its credit.
 *
 * Seven press and agency images were offered for these pages and all seven were refused by
 * the database, which will not store an `imageUrl` without an `imageLicence`. This is the
 * other half of that rule: even with a URL present, nothing renders unless the attribution
 * the licence requires can be rendered with it.
 */
describe("a public figure's portrait", () => {
  const licence = JSON.stringify({
    author: "Gage Skidmore",
    licence: "CC BY-SA 2.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/2.0",
    source: "https://commons.wikimedia.org/wiki/File:Example.jpg",
  });

  it("shows the photograph and names the photographer", () => {
    render(<FigurePortrait name="A Person" figure={{ imageUrl: "/figures/a.jpg", imageLicence: licence }} />);

    expect(screen.getByAltText("Photograph of A Person")).toBeInTheDocument();
    expect(screen.getByText(/Gage Skidmore/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "CC BY-SA 2.0" })).toBeInTheDocument();
  });

  it("renders nothing at all when there is no licence", () => {
    const { container } = render(
      <FigurePortrait name="A Person" figure={{ imageUrl: "/figures/a.jpg", imageLicence: null }} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the licence cannot be read", () => {
    const { container } = render(
      <FigurePortrait name="A Person" figure={{ imageUrl: "/figures/a.jpg", imageLicence: "not json" }} />,
    );

    // Fails closed. An unreadable licence is treated as no licence.
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when there is a licence but no image", () => {
    const { container } = render(
      <FigurePortrait name="A Person" figure={{ imageUrl: null, imageLicence: licence }} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("refuses a licence record with no author, because attribution is the requirement", () => {
    expect(parseAttribution(JSON.stringify({ licence: "CC BY 4.0" }))).toBeNull();
  });
});
