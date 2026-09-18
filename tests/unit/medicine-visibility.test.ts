// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { linkMedicineToStory } from "@/lib/medicines/editorial";
import {
  getPublicMedicine,
  listPublicMedicines,
  medicinesForPublishedStory,
  publicMedicinePaths,
} from "@/lib/medicines/queries";
import { retractStory } from "@/lib/stories/editorial";

import { resetDatabase, testDb } from "../helpers/db";
import {
  makeMedicineFixtures,
  makeStoryWithSource,
  publish,
  type MedicineFixtures,
} from "./medicine-fixtures";

/**
 * What is allowed to be on a medicine page, and what is not.
 *
 * Two promises, both of which are somebody's privacy or somebody's reputation:
 *
 * **Only published stories.** AGENTS.md rule 3 — retraction is immediate, on every public
 * surface. A medicine page is a public surface like any other, and "immediately" means on
 * the next request, not the next revalidation.
 *
 * **Only medicines an editor has written up.** `Intervention` rows are also created when a
 * person logs their own treatment (DECISIONS.md D-043). Those are somebody's medicine
 * cabinet. A public index that listed them would be a health-data leak dressed as a
 * reference work.
 */
describe("what appears on a medicine page", () => {
  let fixtures: MedicineFixtures;
  let published: { id: string; slug: string };
  let draft: { id: string; slug: string };

  beforeEach(async () => {
    await resetDatabase();
    fixtures = await makeMedicineFixtures();

    const first = await makeStoryWithSource(fixtures, { title: "An invented published story" });
    published = first.story;
    await linkMedicineToStory({
      storyId: published.id,
      interventionId: fixtures.sensitive.id,
      sourceId: first.source.id,
      context: "prescribed, aged eight",
    });
    await publish(fixtures, published.id);

    const second = await makeStoryWithSource(fixtures, { title: "An invented draft" });
    draft = second.story;
    await linkMedicineToStory({
      storyId: draft.id,
      interventionId: fixtures.sensitive.id,
      sourceId: second.source.id,
      context: "bought online",
    });
  });

  afterAll(async () => {
    await testDb.$disconnect();
  });

  it("shows the published story, with its context line and its source", async () => {
    const medicine = await getPublicMedicine(fixtures.sensitive.slug);

    expect(medicine?.stories).toHaveLength(1);
    expect(medicine?.stories[0]?.title).toBe("An invented published story");
    expect(medicine?.stories[0]?.context).toBe("prescribed, aged eight");
    expect(medicine?.stories[0]?.source?.publisher).toBe("Example Publisher");
  });

  it("does not show a story that is still a draft", async () => {
    const medicine = await getPublicMedicine(fixtures.sensitive.slug);
    expect(medicine?.stories.map((story) => story.id)).not.toContain(draft.id);
    expect(medicine?.storyCount).toBe(1);
  });

  it("does not show a story that is only in review", async () => {
    const { submitForReview } = await import("@/lib/stories/editorial");
    await submitForReview(draft.id);

    const medicine = await getPublicMedicine(fixtures.sensitive.slug);
    expect(medicine?.stories).toHaveLength(1);
  });

  it("drops a retracted story immediately, from the page and from the count", async () => {
    expect((await getPublicMedicine(fixtures.sensitive.slug))?.stories).toHaveLength(1);

    await retractStory(published.id, "An invented reason.");

    const medicine = await getPublicMedicine(fixtures.sensitive.slug);
    expect(medicine?.stories).toHaveLength(0);
    expect(medicine?.storyCount).toBe(0);

    const listed = await listPublicMedicines();
    expect(listed.find((row) => row.slug === fixtures.sensitive.slug)?.storyCount).toBe(0);
  });

  it("drops the retracted story's conditions with it", async () => {
    expect((await getPublicMedicine(fixtures.sensitive.slug))?.conditions).toHaveLength(1);

    await retractStory(published.id, "An invented reason.");

    expect((await getPublicMedicine(fixtures.sensitive.slug))?.conditions).toHaveLength(0);
  });

  it("shows the conditions the stories are about, most talked-about first", async () => {
    const medicine = await getPublicMedicine(fixtures.sensitive.slug);
    expect(medicine?.conditions).toEqual([
      { name: fixtures.condition.name, slug: fixtures.condition.slug, storyCount: 1 },
    ]);
  });

  it("keeps the medicine page itself when its only story is retracted", async () => {
    await retractStory(published.id, "An invented reason.");
    // A medicine is not a person. The page still says what the drug is, which is useful on
    // its own — unlike a public figure's page, which comes down with their only story.
    expect(await getPublicMedicine(fixtures.sensitive.slug)).not.toBeNull();
  });
});

describe("which medicines are public at all", () => {
  let fixtures: MedicineFixtures;

  beforeEach(async () => {
    await resetDatabase();
    fixtures = await makeMedicineFixtures();
  });

  afterAll(async () => {
    await testDb.$disconnect();
  });

  it("lists the ones an editor has written up", async () => {
    const slugs = (await listPublicMedicines()).map((medicine) => medicine.slug);
    expect(slugs).toContain(fixtures.sensitive.slug);
    expect(slugs).toContain(fixtures.ordinary.slug);
  });

  it("never lists one that came from somebody's own treatment log", async () => {
    const listed = await listPublicMedicines();
    expect(listed.map((medicine) => medicine.name)).not.toContain(fixtures.unwritten.name);
  });

  it("has no page for one that came from somebody's own treatment log", async () => {
    // It has no slug at all, so there is no address to try. Belt and braces: a row given a
    // slug but no description is still not public.
    await testDb.intervention.update({
      where: { id: fixtures.unwritten.id },
      data: { slug: "a-private-treatment" },
    });

    expect(await getPublicMedicine("a-private-treatment")).toBeNull();
    expect((await listPublicMedicines()).map((m) => m.slug)).not.toContain("a-private-treatment");
  });

  it("keeps an unwritten medicine out of the sitemap", async () => {
    const paths = (await publicMedicinePaths()).map((entry) => entry.path);
    expect(paths).toContain(`/medicines/${fixtures.sensitive.slug}`);
    expect(paths).toHaveLength(2);
  });
});

describe("the medicines on a story page", () => {
  let fixtures: MedicineFixtures;
  let story: { id: string; slug: string };

  beforeEach(async () => {
    await resetDatabase();
    fixtures = await makeMedicineFixtures();

    const made = await makeStoryWithSource(fixtures);
    story = made.story;
    await linkMedicineToStory({
      storyId: story.id,
      interventionId: fixtures.sensitive.id,
      sourceId: made.source.id,
      context: "prescribed after a bereavement",
    });
    await linkMedicineToStory({
      storyId: story.id,
      interventionId: fixtures.unwritten.id,
      sourceId: null,
      context: null,
    });
  });

  afterAll(async () => {
    await testDb.$disconnect();
  });

  it("returns nothing at all while the story is still a draft", async () => {
    expect(await medicinesForPublishedStory(story.id)).toEqual([]);
  });

  it("returns them once it is published", async () => {
    await publish(fixtures, story.id);

    const medicines = await medicinesForPublishedStory(story.id);
    expect(medicines).toHaveLength(2);
    const sensitive = medicines.find((m) => m.id === fixtures.sensitive.id);
    expect(sensitive?.context).toBe("prescribed after a bereavement");
    expect(sensitive?.source?.publisher).toBe("Example Publisher");
    expect(sensitive?.isSensitiveTopic).toBe(true);
  });

  it("gives no link to a medicine that has no page", async () => {
    await publish(fixtures, story.id);

    const medicines = await medicinesForPublishedStory(story.id);
    expect(medicines.find((m) => m.id === fixtures.unwritten.id)?.slug).toBeNull();
    expect(medicines.find((m) => m.id === fixtures.sensitive.id)?.slug).toBe(
      fixtures.sensitive.slug,
    );
  });

  it("returns nothing again the moment the story is retracted", async () => {
    await publish(fixtures, story.id);
    expect(await medicinesForPublishedStory(story.id)).toHaveLength(2);

    await retractStory(story.id, "An invented reason.");
    expect(await medicinesForPublishedStory(story.id)).toEqual([]);
  });
});
