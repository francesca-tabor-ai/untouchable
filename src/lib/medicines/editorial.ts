import { db } from "@/lib/db";
import { StoryRuleError, withRuleErrors } from "@/lib/stories/errors";

import { doseLanguageMessage, doseLanguageProblem } from "./dose-language";
import type { MedicineInput, StoryMedicineInput } from "./schemas";
import type { MedicineType } from "./queries";

/**
 * The editorial side of medicines: linking a story to one, and adding one that is not in
 * the list yet.
 *
 * Authentication, authorisation and audit happen at the route boundary, as everywhere else
 * in the editorial layer. Everything here takes ids a guard has already established.
 *
 * The rule this module exists to hold is the source rule. Brief 5.2 requires a source for
 * every story. Saying that a named person took a particular drug is a heavier claim than
 * naming their condition — it is a claim about their body, their prescription and often
 * their addiction — so each medicine link carries its own source, the way a claim about
 * the charities they support already does. `medicineLinksMissingSource` is what the
 * publishing panel asks before a second editor presses publish.
 */

export interface MedicineOption {
  id: string;
  name: string;
  type: MedicineType;
  slug: string | null;
  isSensitiveTopic: boolean;
  /** True when an editor has written the plain-English description. No summary, no page. */
  hasSummary: boolean;
}

/**
 * The medicines an editor can pick from.
 *
 * Restricted to rows that have a slug — that is, rows with an editorial identity. Rows
 * created by `findOrCreateIntervention` when somebody logs their own treatment have no slug
 * and are deliberately not offered here: that list is a private medicine cabinet, not a
 * reference work, and an editorial picker is not the place for it. Anything genuinely
 * missing is added through `createMedicine`, which adopts an existing row if there is one.
 */
export async function listMedicineOptions(): Promise<MedicineOption[]> {
  const rows = await db.intervention.findMany({
    where: { slug: { not: null } },
    select: { id: true, name: true, type: true, slug: true, summary: true, isSensitiveTopic: true },
    orderBy: [{ name: "asc" }],
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    slug: row.slug,
    isSensitiveTopic: row.isSensitiveTopic,
    hasSummary: Boolean(row.summary),
  }));
}

export interface EditorialMedicineLink {
  interventionId: string;
  name: string;
  slug: string | null;
  type: MedicineType;
  isSensitiveTopic: boolean;
  hasSummary: boolean;
  context: string | null;
  source: { id: string; title: string; publisher: string; url: string } | null;
}

/** Every medicine on one story, whatever its status. The admin sees drafts too. */
export async function medicineLinksForStory(storyId: string): Promise<EditorialMedicineLink[]> {
  const rows = await db.storyIntervention.findMany({
    where: { storyId },
    select: {
      interventionId: true,
      context: true,
      source: { select: { id: true, title: true, publisher: true, url: true } },
      intervention: {
        select: { name: true, slug: true, type: true, summary: true, isSensitiveTopic: true },
      },
    },
    orderBy: { intervention: { name: "asc" } },
  });

  return rows.map((row) => ({
    interventionId: row.interventionId,
    name: row.intervention.name,
    slug: row.intervention.slug,
    type: row.intervention.type,
    isSensitiveTopic: row.intervention.isSensitiveTopic,
    hasSummary: Boolean(row.intervention.summary),
    context: row.context,
    source: row.source,
  }));
}

/**
 * The medicine links on a story that have no source behind them.
 *
 * This is the list the publishing panel shows a verifying editor. It does not block
 * publication — an editor who has read the sources may decide a story already carries the
 * claim — but it will never be silent about it. A page that says a named person took a
 * named drug, with nothing to point at, is the single worst thing this hub could publish.
 */
export async function medicineLinksMissingSource(
  storyId: string,
): Promise<{ interventionId: string; name: string }[]> {
  const rows = await db.storyIntervention.findMany({
    where: { storyId, sourceId: null },
    select: { interventionId: true, intervention: { select: { name: true } } },
    orderBy: { intervention: { name: "asc" } },
  });
  return rows.map((row) => ({ interventionId: row.interventionId, name: row.intervention.name }));
}

/**
 * Link a story to a medicine, or change the link that is already there.
 *
 * A source, if given, has to be one of the sources already on this story. Attributing a
 * claim about one person to a source filed under someone else is the kind of mistake that
 * only shows up in a complaint.
 */
export async function linkMedicineToStory(input: StoryMedicineInput) {
  return withRuleErrors(async () => {
    const story = await db.story.findUnique({
      where: { id: input.storyId },
      select: { id: true, sources: { select: { id: true } } },
    });
    if (!story) throw new StoryRuleError("That story no longer exists.");

    const intervention = await db.intervention.findUnique({
      where: { id: input.interventionId },
      select: { id: true },
    });
    if (!intervention) {
      throw new StoryRuleError("That medicine no longer exists.", "interventionId");
    }

    if (input.sourceId && !story.sources.some((source) => source.id === input.sourceId)) {
      throw new StoryRuleError(
        "A medicine can only be attributed to a source on this story. Add the source first.",
        "sourceId",
      );
    }

    // Belt and braces: the schema already refuses dose-shaped text, and so does the form.
    // This is the layer a second interface onto this data cannot skip.
    if (input.context) {
      const problem = doseLanguageProblem(input.context);
      if (problem) throw new StoryRuleError(doseLanguageMessage(problem), "context");
    }

    return db.storyIntervention.upsert({
      where: {
        storyId_interventionId: {
          storyId: input.storyId,
          interventionId: input.interventionId,
        },
      },
      update: { sourceId: input.sourceId, context: input.context },
      create: {
        storyId: input.storyId,
        interventionId: input.interventionId,
        sourceId: input.sourceId,
        context: input.context,
      },
      select: { storyId: true, interventionId: true },
    });
  });
}

export async function unlinkMedicineFromStory(storyId: string, interventionId: string) {
  return withRuleErrors(async () => {
    const existing = await db.storyIntervention.findUnique({
      where: { storyId_interventionId: { storyId, interventionId } },
      select: { storyId: true },
    });
    if (!existing) throw new StoryRuleError("That medicine is no longer on this story.");

    await db.storyIntervention.delete({
      where: { storyId_interventionId: { storyId, interventionId } },
    });
    return { storyId };
  });
}

/**
 * Add a medicine an editor could not find.
 *
 * If a row already exists for this name and type it is adopted rather than duplicated —
 * somebody's own treatment log may already have created "Nitrazepam", and a second row
 * would split the medicine in two and fail the unique constraint besides. Adopting one adds
 * an editorial identity to a row that had none; it reads nothing from anybody's tracking
 * and shows nothing from it.
 */
export async function createMedicine(input: MedicineInput) {
  return withRuleErrors(async () => {
    const slugTaken = await db.intervention.findUnique({
      where: { slug: input.slug },
      select: { id: true, name: true },
    });
    const existing = await db.intervention.findFirst({
      where: { type: input.type, name: { equals: input.name, mode: "insensitive" } },
      select: { id: true, slug: true, summary: true },
    });

    if (slugTaken && slugTaken.id !== existing?.id) {
      throw new StoryRuleError(
        `${slugTaken.name} already uses that web address. Choose another one.`,
        "slug",
      );
    }

    if (existing) {
      if (existing.summary) {
        throw new StoryRuleError(
          "That medicine is already in the list. Pick it above instead of adding it again.",
          "name",
        );
      }
      return db.intervention.update({
        where: { id: existing.id },
        data: {
          slug: input.slug,
          summary: input.summary,
          isSensitiveTopic: input.isSensitiveTopic,
        },
        select: { id: true, name: true, slug: true },
      });
    }

    return db.intervention.create({
      data: {
        name: input.name,
        slug: input.slug,
        type: input.type,
        summary: input.summary,
        isSensitiveTopic: input.isSensitiveTopic,
      },
      select: { id: true, name: true, slug: true },
    });
  });
}
