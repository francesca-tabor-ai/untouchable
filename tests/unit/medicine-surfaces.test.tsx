// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MedicineCardGrid } from "@/components/medicines/medicine-card";
import {
  MedicineContentNote,
  NotMedicalAdvice,
  SubstanceSupport,
} from "@/components/medicines/medicine-safety";
import { MedicineStories } from "@/components/medicines/medicine-stories";
import { StoryArticle } from "@/components/stories/story-article";
import { StoryMedicines } from "@/components/stories/story-medicines";
import { givingLanguageProblem, pressureLanguageProblem } from "@/lib/charities/prompt-policy";
import { doseLanguageProblems } from "@/lib/medicines/dose-language";
import type {
  MedicineCard as MedicineCardData,
  MedicineStory,
  StoryMedicine,
} from "@/lib/medicines/queries";
import {
  hasSensitiveMedicine,
  medicineContentNoteText,
  medicinePageContentNote,
} from "@/lib/medicines/safety";
import type { PublicStory } from "@/lib/stories/queries";

/**
 * The medicine surfaces, rendered.
 *
 * Four promises are checked here that a query test cannot reach:
 *
 * - **Nothing dose-shaped** ever reaches a rendered page. AGENTS.md rule 15. The scan runs
 *   over the whole text content of each surface, not over the copy constants, so a sentence
 *   assembled at render time cannot slip past.
 * - **A sensitive-topic medicine carries a content note and support signposting** on the
 *   medicine page and on the story.
 * - **No donation prompt on a sensitive-topic medicine surface.** Checked as the absence of
 *   a donate affordance and against the charity team's own giving-language patterns.
 * - **A medicine page never says a medicine helped or harmed anyone.** AGENTS.md rule 9.
 */

const source = {
  id: "source-1",
  url: "https://example.test/an-invented-interview",
  title: "An invented interview",
  publisher: "Example Publisher",
  publishedDate: new Date("2024-03-02"),
};

const sensitiveMedicine: StoryMedicine = {
  id: "medicine-1",
  name: "Invented sedative",
  slug: "invented-sedative",
  type: "rx",
  isSensitiveTopic: true,
  context: "prescribed after a bereavement, and never reviewed",
  source,
};

const ordinaryMedicine: StoryMedicine = {
  id: "medicine-2",
  name: "Invented ointment",
  slug: "invented-ointment",
  type: "otc",
  isSensitiveTopic: false,
  context: null,
  source: null,
};

const unwrittenMedicine: StoryMedicine = {
  id: "medicine-3",
  name: "Invented private treatment",
  slug: null,
  type: "supplement",
  isSensitiveTopic: false,
  context: "bought online",
  source,
};

const medicineStory: MedicineStory = {
  id: "story-1",
  slug: "an-invented-story",
  title: "An invented story about sleeping badly",
  figureName: "Invented Person",
  publishedAt: new Date("2025-01-15"),
  context: "prescribed, aged eight",
  source,
  conditions: [{ name: "Invented sleeplessness", slug: "invented-sleeplessness" }],
};

const medicineCard: MedicineCardData = {
  id: "medicine-1",
  name: "Invented sedative",
  slug: "invented-sedative",
  type: "rx",
  summary:
    "An invented sedative, written up for tests. It is licensed only for short-term use, and people can become dependent on it even after a short course.",
  isSensitiveTopic: true,
  storyCount: 1,
};

function makeStory(overrides: Partial<PublicStory> = {}): PublicStory {
  const storySource = { ...source, sourceType: "interview" as const };
  return {
    id: "story-1",
    slug: "an-invented-story",
    title: "An invented story about sleeping badly",
    summary: "An invented summary, written in our own words.",
    type: "public_figure",
    disclosureType: "own",
    figure: { name: "Invented Person", slug: "invented-person" },
    conditions: [
      { name: "Invented sleeplessness", slug: "invented-sleeplessness", isSensitiveTopic: false },
    ],
    publishedAt: new Date("2025-01-15"),
    needsContentNote: false,
    keyMoments: [],
    quote: null,
    quoteSource: null,
    contentNote: null,
    sources: [storySource],
    lastReviewedAt: null,
    ...overrides,
  };
}

/* -------------------------------------------------------------------------- */
/* The dose scan                                                              */
/* -------------------------------------------------------------------------- */

describe("no surface renders a dose or a regimen", () => {
  const surfaces: { name: string; element: React.ReactElement }[] = [
    { name: "the medicines index", element: <MedicineCardGrid medicines={[medicineCard]} /> },
    {
      name: "a medicine page's stories",
      element: <MedicineStories stories={[medicineStory]} medicineName="Invented sedative" />,
    },
    {
      name: "a medicine page with no stories on it",
      element: <MedicineStories stories={[]} medicineName="Invented sedative" />,
    },
    {
      name: "a medicine page's content note",
      element: (
        <MedicineContentNote
          note={medicinePageContentNote({ name: "Invented sedative", isSensitiveTopic: true })!}
        />
      ),
    },
    { name: "the not-medical-advice line", element: <NotMedicalAdvice /> },
    { name: "the dependence signposting", element: <SubstanceSupport /> },
    {
      name: "the medicines block on a story",
      element: (
        <StoryMedicines
          medicines={[sensitiveMedicine, ordinaryMedicine, unwrittenMedicine]}
        />
      ),
    },
    {
      name: "a whole story page with medicines on it",
      element: (
        <StoryArticle
          story={makeStory()}
          related={[]}
          additionalContentNote={medicineContentNoteText([sensitiveMedicine])}
          medicinesSlot={<StoryMedicines medicines={[sensitiveMedicine]} />}
          medicineSupportSlot={<SubstanceSupport />}
        />
      ),
    },
  ];

  for (const surface of surfaces) {
    it(`${surface.name} is clean`, () => {
      const { container } = render(surface.element);
      const text = container.textContent ?? "";
      expect(text.length).toBeGreaterThan(0);
      expect(doseLanguageProblems(text)).toEqual([]);
    });
  }

  it("would fail if a dose ever reached the page", () => {
    // The scan is only worth having if it can fail. This proves it does.
    const { container } = render(
      <StoryMedicines
        medicines={[{ ...sensitiveMedicine, context: "prescribed 10mg, two tablets a day" }]}
      />,
    );
    expect(doseLanguageProblems(container.textContent ?? "").length).toBeGreaterThan(0);
  });
});

/* -------------------------------------------------------------------------- */
/* Sensitive topics                                                            */
/* -------------------------------------------------------------------------- */

describe("a sensitive-topic medicine on a story", () => {
  it("puts a content note above the story and dependence support below it", () => {
    render(
      <StoryArticle
        story={makeStory()}
        related={[]}
        additionalContentNote={medicineContentNoteText([sensitiveMedicine])}
        medicinesSlot={<StoryMedicines medicines={[sensitiveMedicine]} />}
        medicineSupportSlot={<SubstanceSupport />}
      />,
    );

    const note = screen.getByTestId("content-note");
    expect(note).toHaveTextContent(/becoming dependent on a prescribed medicine/i);

    const support = screen.getByTestId("substance-support");
    expect(within(support).getByText("0300 123 6600")).toBeInTheDocument();
    expect(within(support).getByRole("heading", { level: 2 })).toHaveTextContent(
      /come off something/i,
    );
  });

  it("joins the story's own note and the medicine note into one warning, not two", () => {
    render(
      <StoryArticle
        story={makeStory({ contentNote: "An invented note written by an editor." })}
        related={[]}
        additionalContentNote={medicineContentNoteText([sensitiveMedicine])}
        medicinesSlot={<StoryMedicines medicines={[sensitiveMedicine]} />}
        medicineSupportSlot={<SubstanceSupport />}
      />,
    );

    expect(screen.getAllByTestId("content-note")).toHaveLength(1);
    expect(screen.getByTestId("content-note")).toHaveTextContent(
      /An invented note written by an editor/,
    );
    expect(screen.getByTestId("content-note")).toHaveTextContent(/dependent/i);
  });

  it("leaves an ordinary story with neither", () => {
    render(
      <StoryArticle
        story={makeStory()}
        related={[]}
        additionalContentNote={medicineContentNoteText([ordinaryMedicine])}
        medicinesSlot={<StoryMedicines medicines={[ordinaryMedicine]} />}
        medicineSupportSlot={null}
      />,
    );

    expect(screen.queryByTestId("content-note")).not.toBeInTheDocument();
    expect(screen.queryByTestId("substance-support")).not.toBeInTheDocument();
  });

  it("makes a story sensitive on the medicine alone, so the charity block turns to support", () => {
    // The story page ORs this with the condition-based decision before choosing the
    // charity variant. None of these conditions is marked sensitive.
    expect(hasSensitiveMedicine([sensitiveMedicine])).toBe(true);
    expect(hasSensitiveMedicine([ordinaryMedicine, unwrittenMedicine])).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/* No donation prompts                                                         */
/* -------------------------------------------------------------------------- */

describe("a sensitive-topic medicine surface never asks for money", () => {
  const surfaces: { name: string; element: React.ReactElement }[] = [
    { name: "the index", element: <MedicineCardGrid medicines={[medicineCard]} /> },
    {
      name: "the stories on a medicine page",
      element: <MedicineStories stories={[medicineStory]} medicineName="Invented sedative" />,
    },
    { name: "the dependence signposting", element: <SubstanceSupport /> },
    {
      name: "the medicines block on a story",
      element: <StoryMedicines medicines={[sensitiveMedicine]} />,
    },
  ];

  for (const surface of surfaces) {
    it(`${surface.name} has no donation affordance`, () => {
      const { container } = render(surface.element);
      expect(screen.queryByRole("link", { name: /donate/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /donate/i })).not.toBeInTheDocument();
      expect(givingLanguageProblem(container.textContent ?? "")).toBeNull();
    });

    it(`${surface.name} applies no pressure`, () => {
      const { container } = render(surface.element);
      expect(pressureLanguageProblem(container.textContent ?? "")).toBeNull();
    });
  }
});

/* -------------------------------------------------------------------------- */
/* Not medical advice                                                          */
/* -------------------------------------------------------------------------- */

describe("a medicine page makes no claim about the medicine", () => {
  it("says it is not medical advice, and not a recommendation either way", () => {
    render(<NotMedicalAdvice />);
    const note = screen.getByTestId("not-medical-advice");
    expect(note).toHaveTextContent(/not medical advice/i);
    expect(note).toHaveTextContent(/not a recommendation for or against it/i);
  });

  it("never says a medicine worked, helped or harmed", () => {
    const { container } = render(
      <>
        <MedicineCardGrid medicines={[medicineCard]} />
        <MedicineStories stories={[medicineStory]} medicineName="Invented sedative" />
        <StoryMedicines medicines={[sensitiveMedicine]} />
      </>,
    );

    const text = container.textContent ?? "";
    for (const claim of [
      /\bit worked\b/i,
      /\bhelped (?:her|him|them|people)\b/i,
      /\bmade (?:her|him|them) (?:better|worse)\b/i,
      /\brecommend/i,
      /\beffective for\b/i,
      /\bside effects were\b/i,
    ]) {
      expect(text).not.toMatch(claim);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* The rest of the block                                                       */
/* -------------------------------------------------------------------------- */

describe("the medicines block on a story page", () => {
  it("links a medicine that has a page, and does not link one that has not", () => {
    render(<StoryMedicines medicines={[sensitiveMedicine, unwrittenMedicine]} />);

    expect(screen.getByRole("link", { name: "Invented sedative" })).toHaveAttribute(
      "href",
      "/medicines/invented-sedative",
    );
    expect(
      screen.queryByRole("link", { name: "Invented private treatment" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Invented private treatment")).toBeInTheDocument();
  });

  it("shows each medicine's own source", () => {
    render(<StoryMedicines medicines={[sensitiveMedicine]} />);
    expect(screen.getByRole("link", { name: "An invented interview" })).toHaveAttribute(
      "href",
      source.url,
    );
  });

  it("says plainly when a medicine has no source, rather than looking sourced", () => {
    render(<StoryMedicines medicines={[ordinaryMedicine]} />);
    expect(screen.getByText(/No source is recorded for this particular detail/i)).toBeInTheDocument();
  });

  it("renders nothing at all when a story has no medicines", () => {
    const { container } = render(<StoryMedicines medicines={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("keeps the heading order intact — h2 for the section, h3 for each medicine", () => {
    render(<StoryMedicines medicines={[sensitiveMedicine]} />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      /Medicines and treatments in this story/,
    );
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Invented sedative");
  });
});

describe("the stories on a medicine page", () => {
  it("shows each one's context line and source", () => {
    render(<MedicineStories stories={[medicineStory]} medicineName="Invented sedative" />);

    expect(screen.getByText("prescribed, aged eight")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "An invented interview" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /An invented story about sleeping badly/ })).toHaveAttribute(
      "href",
      "/stories/an-invented-story",
    );
  });

  it("says so when there is nothing to show, rather than rendering an empty list", () => {
    render(<MedicineStories stories={[]} medicineName="Invented sedative" />);
    expect(screen.getByText(/Nobody has talked about Invented sedative here yet/)).toBeInTheDocument();
    expect(screen.queryByTestId("medicine-stories")).not.toBeInTheDocument();
  });
});
