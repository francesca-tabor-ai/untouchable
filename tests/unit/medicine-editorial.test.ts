// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import {
  createMedicine,
  linkMedicineToStory,
  listMedicineOptions,
  medicineLinksForStory,
  medicineLinksMissingSource,
  unlinkMedicineFromStory,
} from "@/lib/medicines/editorial";
import { StoryRuleError } from "@/lib/stories/errors";

import { resetDatabase, testDb } from "../helpers/db";
import {
  makeMedicineFixtures,
  makeStoryWithSource,
  type MedicineFixtures,
} from "./medicine-fixtures";

/**
 * Linking a story to a medicine, in the admin.
 *
 * The rule under test is the source rule. Saying a named person took a particular drug is a
 * claim about their body, their prescription and often their addiction — heavier than
 * naming their condition, and it carries its own source. A link without one is never
 * refused outright, but it is never silent either: `medicineLinksMissingSource` is what the
 * publishing panel shows the second editor before they press publish.
 */
describe("putting a medicine on a story", () => {
  let fixtures: MedicineFixtures;
  let story: { id: string; slug: string };
  let source: { id: string; title: string; publisher: string };

  beforeEach(async () => {
    await resetDatabase();
    fixtures = await makeMedicineFixtures();
    const made = await makeStoryWithSource(fixtures);
    story = made.story;
    source = made.source;
  });

  afterAll(async () => {
    await testDb.$disconnect();
  });

  it("records the medicine, its source and its context line", async () => {
    await linkMedicineToStory({
      storyId: story.id,
      interventionId: fixtures.sensitive.id,
      sourceId: source.id,
      context: "prescribed, aged eight",
    });

    const links = await medicineLinksForStory(story.id);
    expect(links).toHaveLength(1);
    expect(links[0]?.name).toBe(fixtures.sensitive.name);
    expect(links[0]?.context).toBe("prescribed, aged eight");
    expect(links[0]?.source?.id).toBe(source.id);
  });

  it("takes more than one medicine on one story", async () => {
    await linkMedicineToStory({
      storyId: story.id,
      interventionId: fixtures.sensitive.id,
      sourceId: source.id,
      context: "prescribed after a bereavement",
    });
    await linkMedicineToStory({
      storyId: story.id,
      interventionId: fixtures.ordinary.id,
      sourceId: source.id,
      context: null,
    });

    expect(await medicineLinksForStory(story.id)).toHaveLength(2);
  });

  it("changes the link rather than adding a second one", async () => {
    await linkMedicineToStory({
      storyId: story.id,
      interventionId: fixtures.sensitive.id,
      sourceId: null,
      context: null,
    });
    await linkMedicineToStory({
      storyId: story.id,
      interventionId: fixtures.sensitive.id,
      sourceId: source.id,
      context: "came off it in 2019",
    });

    const links = await medicineLinksForStory(story.id);
    expect(links).toHaveLength(1);
    expect(links[0]?.context).toBe("came off it in 2019");
  });

  it("removes one", async () => {
    await linkMedicineToStory({
      storyId: story.id,
      interventionId: fixtures.sensitive.id,
      sourceId: source.id,
      context: null,
    });
    await unlinkMedicineFromStory(story.id, fixtures.sensitive.id);

    expect(await medicineLinksForStory(story.id)).toHaveLength(0);
  });

  it("refuses a source that belongs to a different story", async () => {
    const other = await makeStoryWithSource(fixtures, { title: "Another invented story" });

    await expect(
      linkMedicineToStory({
        storyId: story.id,
        interventionId: fixtures.sensitive.id,
        sourceId: other.source.id,
        context: null,
      }),
    ).rejects.toBeInstanceOf(StoryRuleError);
  });

  it("refuses a dose in the context line, even if the form let it through", async () => {
    await expect(
      linkMedicineToStory({
        storyId: story.id,
        interventionId: fixtures.sensitive.id,
        sourceId: source.id,
        context: "prescribed 10mg at night",
      }),
    ).rejects.toThrow(/never publish/i);
  });
});

describe("the flag a verifying editor sees", () => {
  let fixtures: MedicineFixtures;
  let story: { id: string; slug: string };
  let source: { id: string };

  beforeEach(async () => {
    await resetDatabase();
    fixtures = await makeMedicineFixtures();
    const made = await makeStoryWithSource(fixtures);
    story = made.story;
    source = made.source;
  });

  afterAll(async () => {
    await testDb.$disconnect();
  });

  it("names a medicine that has no source behind it", async () => {
    await linkMedicineToStory({
      storyId: story.id,
      interventionId: fixtures.sensitive.id,
      sourceId: null,
      context: "prescribed, aged eight",
    });

    const missing = await medicineLinksMissingSource(story.id);
    expect(missing.map((row) => row.name)).toEqual([fixtures.sensitive.name]);
  });

  it("says nothing once the source is attached", async () => {
    await linkMedicineToStory({
      storyId: story.id,
      interventionId: fixtures.sensitive.id,
      sourceId: null,
      context: null,
    });
    expect(await medicineLinksMissingSource(story.id)).toHaveLength(1);

    await linkMedicineToStory({
      storyId: story.id,
      interventionId: fixtures.sensitive.id,
      sourceId: source.id,
      context: null,
    });
    expect(await medicineLinksMissingSource(story.id)).toHaveLength(0);
  });

  it("comes back if the source is later removed from the story", async () => {
    await linkMedicineToStory({
      storyId: story.id,
      interventionId: fixtures.sensitive.id,
      sourceId: source.id,
      context: null,
    });
    expect(await medicineLinksMissingSource(story.id)).toHaveLength(0);

    // The story keeps a second source so the removal is allowed at all.
    await testDb.source.create({
      data: {
        storyId: story.id,
        url: "https://example.test/another-invented-source",
        title: "Another invented interview",
        publisher: "Example Publisher",
        sourceType: "interview",
      },
    });
    const { removeSource } = await import("@/lib/stories/editorial");
    await removeSource(source.id);

    // `StoryIntervention.sourceId` is ON DELETE SET NULL: the link survives, the
    // attribution does not, and the flag is back — which is exactly right.
    expect(await medicineLinksMissingSource(story.id)).toHaveLength(1);
  });

  it("says nothing about a story with no medicines at all", async () => {
    expect(await medicineLinksMissingSource(story.id)).toHaveLength(0);
  });
});

describe("adding a medicine that is not in the list", () => {
  let fixtures: MedicineFixtures;

  beforeEach(async () => {
    await resetDatabase();
    fixtures = await makeMedicineFixtures();
  });

  afterAll(async () => {
    await testDb.$disconnect();
  });

  it("creates it, with its plain-English description and its sensitivity", async () => {
    const created = await createMedicine({
      name: "Another invented sedative",
      slug: "another-invented-sedative",
      type: "rx",
      summary:
        "An invented sedative for tests. Licensed only for short-term use, and people can become dependent on it.",
      isSensitiveTopic: true,
    });

    const row = await testDb.intervention.findUnique({ where: { id: created.id } });
    expect(row?.slug).toBe("another-invented-sedative");
    expect(row?.isSensitiveTopic).toBe(true);
  });

  it("adopts a row somebody's own treatment log already created, rather than duplicating it", async () => {
    const created = await createMedicine({
      name: fixtures.unwritten.name,
      slug: "an-adopted-treatment",
      type: "supplement",
      summary:
        "An invented treatment for tests, written up by an editor after somebody had already logged it themselves.",
      isSensitiveTopic: false,
    });

    expect(created.id).toBe(fixtures.unwritten.id);
    const rows = await testDb.intervention.findMany({
      where: { name: fixtures.unwritten.name },
    });
    expect(rows).toHaveLength(1);
  });

  it("refuses a web address another medicine already uses", async () => {
    await expect(
      createMedicine({
        name: "A differently invented sedative",
        slug: fixtures.ordinary.slug,
        type: "rx",
        summary:
          "An invented sedative for tests, long enough to look like a real plain-English description.",
        isSensitiveTopic: false,
      }),
    ).rejects.toThrow(/web address/i);
  });

  it("refuses one that is already written up, and says to pick it instead", async () => {
    await expect(
      createMedicine({
        name: fixtures.ordinary.name,
        slug: "a-second-address-for-the-same-thing",
        type: "otc",
        summary:
          "An invented ointment for tests, long enough to look like a real plain-English description.",
        isSensitiveTopic: false,
      }),
    ).rejects.toThrow(/already in the list/i);
  });
});

describe("the medicines an editor can pick from", () => {
  let fixtures: MedicineFixtures;

  beforeEach(async () => {
    await resetDatabase();
    fixtures = await makeMedicineFixtures();
  });

  afterAll(async () => {
    await testDb.$disconnect();
  });

  it("offers the ones with an editorial identity", async () => {
    const options = await listMedicineOptions();
    expect(options.map((option) => option.id)).toContain(fixtures.sensitive.id);
    expect(options.map((option) => option.id)).toContain(fixtures.ordinary.id);
  });

  it("does not offer somebody's own logged treatment", async () => {
    const options = await listMedicineOptions();
    expect(options.map((option) => option.id)).not.toContain(fixtures.unwritten.id);
  });

  it("says which ones have no public page yet", async () => {
    await testDb.intervention.update({
      where: { id: fixtures.ordinary.id },
      data: { summary: null },
    });

    const options = await listMedicineOptions();
    expect(options.find((option) => option.id === fixtures.ordinary.id)?.hasSummary).toBe(false);
    expect(options.find((option) => option.id === fixtures.sensitive.id)?.hasSummary).toBe(true);
  });
});
