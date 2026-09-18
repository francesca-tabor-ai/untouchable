import { testDb } from "../helpers/db";

/**
 * Fixtures for the medicines suites (tests/unit/medicine-*.test.ts).
 *
 * Every person, story and source invented, as everywhere else in this repository. The
 * medicines are named after nothing real either: a test does not need a real drug, and a
 * fixture that names one would end up quoted somewhere it should not be.
 */

let counter = 0;

export function unique(prefix: string) {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

export interface MedicineFixtures {
  drafter: { id: string };
  verifier: { id: string };
  condition: { id: string; name: string; slug: string };
  figure: { id: string; name: string };
  /** Written up by an editor, dependence-flagged: it has a page and a content note. */
  sensitive: { id: string; name: string; slug: string };
  /** Written up, ordinary. */
  ordinary: { id: string; name: string; slug: string };
  /** No summary — the shape `findOrCreateIntervention` leaves behind. Never public. */
  unwritten: { id: string; name: string };
}

async function makeEditor() {
  counter += 1;
  return testDb.user.create({
    data: {
      email: `medicine-editor-${Date.now()}-${counter}@example.test`,
      role: "editor",
      ageConfirmedAt: new Date(),
    },
    select: { id: true },
  });
}

export async function makeMedicineFixtures(): Promise<MedicineFixtures> {
  const [drafter, verifier] = await Promise.all([makeEditor(), makeEditor()]);

  const condition = await testDb.condition.create({
    data: {
      name: "Invented sleeplessness",
      slug: unique("invented-sleeplessness"),
      summary: "An invented condition summary for tests.",
      isSensitiveTopic: false,
    },
    select: { id: true, name: true, slug: true },
  });

  const figure = await testDb.publicFigure.create({
    data: {
      name: "Invented Person",
      slug: unique("invented-person"),
      shortBio: "Entirely invented, for tests.",
    },
    select: { id: true, name: true },
  });

  const sensitive = await testDb.intervention.create({
    data: {
      name: unique("Invented sedative"),
      slug: unique("invented-sedative"),
      type: "rx",
      isSensitiveTopic: true,
      summary:
        "An invented sedative, written up for tests. People can become dependent on it, which is what makes it a sensitive topic here.",
    },
    select: { id: true, name: true, slug: true },
  });

  const ordinary = await testDb.intervention.create({
    data: {
      name: unique("Invented ointment"),
      slug: unique("invented-ointment"),
      type: "otc",
      isSensitiveTopic: false,
      summary: "An invented ointment, written up for tests. Nobody becomes dependent on it.",
    },
    select: { id: true, name: true, slug: true },
  });

  // The shape a person's own treatment log leaves behind: a name, and nothing else.
  const unwritten = await testDb.intervention.create({
    data: { name: unique("Invented private treatment"), type: "supplement" },
    select: { id: true, name: true },
  });

  return {
    drafter,
    verifier,
    condition,
    figure,
    // Both were created with a slug; Prisma types it nullable because the column is.
    sensitive: { ...sensitive, slug: sensitive.slug as string },
    ordinary: { ...ordinary, slug: ordinary.slug as string },
    unwritten,
  };
}

export async function makeStoryWithSource(
  fixtures: MedicineFixtures,
  overrides: { title?: string } = {},
) {
  const story = await testDb.story.create({
    data: {
      type: "public_figure",
      publicFigureId: fixtures.figure.id,
      disclosureType: "own",
      title: overrides.title ?? "An invented story about sleeping badly",
      slug: unique("invented-story"),
      summary:
        "Written in our own words for a test. Long enough to be a real summary, and about nobody at all.",
      status: "draft",
      draftedById: fixtures.drafter.id,
      conditions: { create: [{ conditionId: fixtures.condition.id }] },
    },
    select: { id: true, slug: true },
  });

  const source = await testDb.source.create({
    data: {
      storyId: story.id,
      url: `https://example.test/${unique("source")}`,
      title: "An invented interview",
      publisher: "Example Publisher",
      publishedDate: new Date("2024-01-01"),
      sourceType: "interview",
    },
    select: { id: true, title: true, publisher: true },
  });

  return { story, source };
}

/** Take a draft through the real two-step route, the way an editor would. */
export async function publish(fixtures: MedicineFixtures, storyId: string) {
  const { submitForReview, verifyAndPublish } = await import("@/lib/stories/editorial");
  await submitForReview(storyId);
  return verifyAndPublish(storyId, fixtures.verifier.id);
}
