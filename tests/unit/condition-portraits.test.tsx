// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StoryCardGrid } from "@/components/stories/story-card";
import type { StoryCard as StoryCardData } from "@/lib/stories/queries";

/**
 * The photographs on a condition page.
 *
 * A condition page is where somebody lands in the week they were diagnosed, and the people
 * who have talked about it are the reason they stay. So the cards carry faces — but only
 * faces we are allowed to show, and never without the credit the licence asks for.
 *
 * Three things are held here, and all three are licence conditions rather than layout:
 *   1. a photograph renders only when a readable licence sits on the same record;
 *   2. wherever photographs render, the attribution renders with them;
 *   3. somebody with no licensed picture gets their initials, not somebody else's picture.
 */

const condition = {
  name: "Breast cancer",
  slug: "breast-cancer",
  isSensitiveTopic: false,
  supportTopic: null,
};

const licence = JSON.stringify({
  author: "Gage Skidmore",
  licence: "CC BY-SA 2.0",
  licenceUrl: "https://creativecommons.org/licenses/by-sa/2.0",
  source: "https://commons.wikimedia.org/wiki/File:Example.jpg",
});

function makeCard(overrides: Partial<StoryCardData> = {}): StoryCardData {
  return {
    id: "story-1",
    slug: "an-invented-story",
    title: "An invented story",
    summary: "An invented summary, written in our own words.",
    type: "public_figure",
    disclosureType: "own",
    figure: {
      name: "Invented Person",
      slug: "invented-person",
      imageUrl: "/figures/invented-person.jpg",
      imageLicence: licence,
    },
    conditions: [condition],
    publishedAt: new Date("2025-01-15"),
    needsContentNote: false,
    ...overrides,
  };
}

describe("people on a condition page", () => {
  it("shows the photograph of somebody who has a licensed one", () => {
    render(<StoryCardGrid stories={[makeCard()]} portraits />);

    const image = document.querySelector("img");
    expect(image).not.toBeNull();
    // next/image serves the file through the optimiser, so the path arrives encoded.
    expect(decodeURIComponent(image!.getAttribute("src")!)).toContain(
      "/figures/invented-person.jpg",
    );
  });

  it("names the photographer and links the licence beneath the grid", () => {
    render(<StoryCardGrid stories={[makeCard()]} portraits />);

    const credits = screen.getByTestId("photo-credits");
    expect(credits).toHaveTextContent("Invented Person by Gage Skidmore");
    expect(within(credits).getByRole("link", { name: "CC BY-SA 2.0" })).toHaveAttribute(
      "href",
      "https://creativecommons.org/licenses/by-sa/2.0",
    );
  });

  it("leaves the picture decorative, because the name is beside it", () => {
    // "Photograph of Invented Person, Invented Person" is noise, not information.
    render(<StoryCardGrid stories={[makeCard()]} portraits />);

    expect(document.querySelector("img")!.getAttribute("alt")).toBe("");
  });

  it("shows initials, never another picture, when there is no licence", () => {
    render(
      <StoryCardGrid
        stories={[
          makeCard({
            figure: {
              name: "Marla Quintrell",
              slug: "marla-quintrell",
              imageUrl: "/figures/marla-quintrell.jpg",
              imageLicence: null,
            },
          }),
        ]}
        portraits
      />,
    );

    expect(document.querySelector("img")).toBeNull();
    expect(screen.getByText("MQ")).toBeInTheDocument();
  });

  it("treats an unreadable licence as no licence", () => {
    render(
      <StoryCardGrid
        stories={[makeCard({ figure: { ...makeCard().figure!, imageLicence: "not json" } })]}
        portraits
      />,
    );

    // Fails closed, the same way the story page does.
    expect(document.querySelector("img")).toBeNull();
    expect(screen.queryByTestId("photo-credits")).toBeNull();
  });

  it("renders no credit line when there is nothing to credit", () => {
    render(
      <StoryCardGrid
        stories={[makeCard({ figure: { ...makeCard().figure!, imageUrl: null, imageLicence: null } })]}
        portraits
      />,
    );

    expect(screen.queryByTestId("photo-credits")).toBeNull();
  });

  it("carries a community story with no figure without breaking", () => {
    render(<StoryCardGrid stories={[makeCard({ figure: null })]} portraits />);

    expect(screen.getByText("A community story")).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
  });

  it("shows no photographs, and therefore no credit, where portraits are off", () => {
    // The other story lists are unchanged. Turning the pictures on is a decision a page
    // makes, and the credit is not separable from it.
    render(<StoryCardGrid stories={[makeCard()]} />);

    expect(document.querySelector("img")).toBeNull();
    expect(screen.queryByTestId("photo-credits")).toBeNull();
  });

  it("still leads with the person's name and links the story", () => {
    render(<StoryCardGrid stories={[makeCard()]} portraits />);

    expect(screen.getByTestId("story-card-byline")).toHaveTextContent("Invented Person");
    expect(screen.getByRole("link", { name: "An invented story" })).toHaveAttribute(
      "href",
      "/stories/an-invented-story",
    );
  });
});
