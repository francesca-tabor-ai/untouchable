// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PublicFigureProfileView } from "@/components/stories/public-figure-profile";
import { StoryArticle } from "@/components/stories/story-article";
import { StoryCard } from "@/components/stories/story-card";
import type { PublicStory, StoryCard as StoryCardData } from "@/lib/stories/queries";
import { contentNoteText, needsSupportSignposting } from "@/lib/stories/safety";

/**
 * The public surfaces, rendered.
 *
 * Two promises are checked here that a query test cannot reach: the no-endorsement
 * disclaimer on every public figure page, and the content note and support signposting on a
 * sensitive-topic story. Brief 5.2 and 5.4.
 */

const ordinaryCondition = { name: "Breast cancer", slug: "breast-cancer", isSensitiveTopic: false };
const sensitiveCondition = { name: "Depression", slug: "depression", isSensitiveTopic: true };

function makeCard(overrides: Partial<StoryCardData> = {}): StoryCardData {
  return {
    id: "story-1",
    slug: "an-invented-story",
    title: "An invented story",
    summary: "An invented summary, written in our own words.",
    type: "public_figure",
    disclosureType: "own",
    figure: { name: "Invented Person", slug: "invented-person", imageUrl: null, imageLicence: null },
    conditions: [ordinaryCondition],
    publishedAt: new Date("2025-01-15"),
    needsContentNote: false,
    ...overrides,
  };
}

function makeStory(overrides: Partial<PublicStory> = {}): PublicStory {
  const source = {
    id: "source-1",
    url: "https://example.test/an-invented-interview",
    title: "An invented interview",
    publisher: "Example Publisher",
    publishedDate: new Date("2024-03-02"),
    sourceType: "interview" as const,
  };

  return {
    ...makeCard(),
    keyMoments: [
      { label: "Diagnosis", when: "Four years ago", body: "Found at a routine appointment." },
    ],
    quote: "Nine invented words, said by a person who is invented.",
    quoteSource: source,
    contentNote: null,
    needsSupportSignposting: false,
    sources: [source],
    lastReviewedAt: new Date("2025-06-01"),
    ...overrides,
  };
}

describe("a public figure's page", () => {
  it("carries the no-endorsement disclaimer, with their name in it", () => {
    render(
      <PublicFigureProfileView
        figure={{
          id: "figure-1",
          name: "Invented Person",
          slug: "invented-person",
          shortBio: "Entirely invented.",
          isDeceased: false,
          conditions: [ordinaryCondition],
        }}
        stories={[makeCard()]}
      />,
    );

    expect(
      screen.getByText("Invented Person is not affiliated with and has not endorsed UnTouchable."),
    ).toBeInTheDocument();
  });

  it("carries the disclaimer even when there is only one story and no conditions", () => {
    render(
      <PublicFigureProfileView
        figure={{
          id: "figure-2",
          name: "Another Invented Person",
          slug: "another-invented-person",
          shortBio: "Also invented.",
          isDeceased: true,
          conditions: [],
        }}
        stories={[makeCard({ conditions: [] })]}
      />,
    );

    expect(screen.getByTestId("no-endorsement")).toHaveTextContent(
      "Another Invented Person is not affiliated with and has not endorsed UnTouchable.",
    );
  });

  it("starts the page at h1 and never skips a heading level", () => {
    render(
      <PublicFigureProfileView
        figure={{
          id: "figure-3",
          name: "Invented Person",
          slug: "invented-person",
          shortBio: "Entirely invented.",
          isDeceased: false,
          conditions: [ordinaryCondition],
        }}
        stories={[makeCard()]}
      />,
    );

    const levels = screen
      .getAllByRole("heading")
      .map((heading) => Number(heading.tagName.slice(1)));

    expect(levels[0]).toBe(1);
    for (let i = 1; i < levels.length; i += 1) {
      expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
    }
  });
});

describe("a story about a sensitive topic", () => {
  const sensitiveStory = makeStory({
    conditions: [sensitiveCondition],
    needsContentNote: true,
  });

  it("shows a content note before the story", () => {
    render(<StoryArticle story={sensitiveStory} related={[]} />);
    expect(screen.getByTestId("content-note")).toBeInTheDocument();
  });

  it("prefers the editor's own content note when there is one", () => {
    render(
      <StoryArticle
        story={{ ...sensitiveStory, contentNote: "An invented note written by an editor." }}
        related={[]}
      />,
    );

    expect(screen.getByTestId("content-note")).toHaveTextContent(
      "An invented note written by an editor.",
    );
  });

  it("signposts support at the foot of the story, with the Samaritans number", () => {
    render(<StoryArticle story={sensitiveStory} related={[]} />);

    const support = screen.getByTestId("support-signposting");
    expect(within(support).getByText("116 123")).toBeInTheDocument();
    expect(within(support).getByText("111")).toBeInTheDocument();
    expect(within(support).getByText("999")).toBeInTheDocument();
  });

  // The stories hub writes no giving copy of its own, anywhere. What the charity team's
  // block does on a sensitive page is a separate guarantee, checked end to end in
  // tests/e2e/stories.spec.ts ("support, not an ask").
  it("carries no donation copy of its own", () => {
    const { container } = render(<StoryArticle story={sensitiveStory} related={[]} />);
    expect(container.textContent).not.toMatch(/donat/i);
  });
});

describe("a story that is not about a sensitive topic", () => {
  it("shows no content note and no support block", () => {
    render(<StoryArticle story={makeStory()} related={[]} />);

    expect(screen.queryByTestId("content-note")).toBeNull();
    expect(screen.queryByTestId("support-signposting")).toBeNull();
  });

  it("still shows a content note when an editor wrote one", () => {
    render(
      <StoryArticle
        story={makeStory({ contentNote: "An invented note about a difficult passage." })}
        related={[]}
      />,
    );

    expect(screen.getByTestId("content-note")).toBeInTheDocument();
  });
});

describe("every story page", () => {
  it("lists its sources, linked, with publisher and date", () => {
    render(<StoryArticle story={makeStory()} related={[]} />);

    const link = screen.getByRole("link", { name: "An invented interview" });
    expect(link).toHaveAttribute("href", "https://example.test/an-invented-interview");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(screen.getAllByText(/Example Publisher/).length).toBeGreaterThan(0);
  });

  it("shows the quote with the publisher it was said to", () => {
    render(<StoryArticle story={makeStory()} related={[]} />);

    expect(screen.getByText(/Nine invented words/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Example Publisher" })).toBeInTheDocument();
  });

  it("shows no quote at all when there is no source to attribute it to", () => {
    render(
      <StoryArticle story={makeStory({ quote: null, quoteSource: null })} related={[]} />,
    );

    expect(screen.queryByText(/Nine invented words/)).toBeNull();
  });

  it("carries the no-endorsement disclaimer for the person it is about", () => {
    render(<StoryArticle story={makeStory()} related={[]} />);

    expect(screen.getByTestId("no-endorsement")).toHaveTextContent(
      "Invented Person is not affiliated with and has not endorsed UnTouchable.",
    );
  });

  it("points at the correction form", () => {
    render(<StoryArticle story={makeStory()} related={[]} />);

    expect(
      screen.getByRole("link", { name: /correct or remove this story/i }),
    ).toHaveAttribute("href", "/corrections");
  });

  it("shows a community story without a public figure or a disclaimer", () => {
    render(
      <StoryArticle
        story={makeStory({ type: "community", figure: null })}
        related={[]}
      />,
    );

    expect(screen.queryByTestId("no-endorsement")).toBeNull();
    expect(screen.getByText(/A community story/)).toBeInTheDocument();
  });
});

describe("a story card in a list", () => {
  it("links to the story and to each condition", () => {
    render(<StoryCard story={makeCard()} />);

    expect(screen.getByRole("link", { name: "An invented story" })).toHaveAttribute(
      "href",
      "/stories/an-invented-story",
    );
    expect(screen.getByRole("link", { name: "Breast cancer" })).toHaveAttribute(
      "href",
      "/conditions/breast-cancer",
    );
  });

  it("warns before someone opens a sensitive story", () => {
    render(
      <StoryCard story={makeCard({ conditions: [sensitiveCondition], needsContentNote: true })} />,
    );

    expect(screen.getByText(/Content note/)).toBeInTheDocument();
  });

  it("says when a story is about someone the person loves", () => {
    render(<StoryCard story={makeCard({ disclosureType: "loved_one" })} />);
    expect(screen.getByText(/on someone they love/)).toBeInTheDocument();
  });
});

describe("the sensitive-topic decision itself", () => {
  it("is driven by the condition, not by whether an editor remembered", () => {
    expect(needsSupportSignposting({ conditions: [sensitiveCondition] })).toBe(true);
    expect(needsSupportSignposting({ conditions: [ordinaryCondition] })).toBe(false);
  });

  it("writes a plain note when an editor has not written one", () => {
    const note = contentNoteText({ conditions: [sensitiveCondition] });
    expect(note).toMatch(/depression/i);
    expect(note).toMatch(/You do not have to read it now/);
  });

  it("returns no note at all when none is needed", () => {
    expect(contentNoteText({ conditions: [ordinaryCondition] })).toBeNull();
  });
});

/**
 * A story can need support contacts its condition does not imply.
 *
 * Sensitivity normally belongs to the condition. But an editor writing about a ruptured
 * brain aneurysm found a passage where the person asked to be allowed to die, and had two
 * options: publish it with no signposting, or cut it. Marking brain aneurysms a sensitive
 * topic to solve it would put suicide signposting in front of every reader who has one.
 * They cut the passage. This flag is why they will not have to next time.
 */
describe("story-level support signposting", () => {
  const notSensitive = [{ name: "Brain aneurysm", isSensitiveTopic: false }];

  it("adds support contacts when the story asks for them", () => {
    expect(
      needsSupportSignposting({ conditions: notSensitive, needsSupportSignposting: true }),
    ).toBe(true);
  });

  it("leaves the condition alone — it is the story that is sensitive, not the illness", () => {
    expect(needsSupportSignposting({ conditions: notSensitive })).toBe(false);
  });

  it("still signposts from the condition when that is where the sensitivity lives", () => {
    expect(
      needsSupportSignposting({ conditions: [{ name: "Depression", isSensitiveTopic: true }] }),
    ).toBe(true);
  });

  it("gives the story a content note too, so support is never a surprise at the end", () => {
    expect(
      contentNoteText({ conditions: notSensitive, needsSupportSignposting: true }),
    ).toBeTruthy();
  });
});
