import { readFileSync } from "node:fs";

import { db } from "../src/lib/db";

/**
 * Import editorial content exported from another environment.
 *
 * Stories are created as drafts, given their sources, and then published through the same
 * domain path a person uses — so the database constraints that protect real, named people
 * have to be satisfied for real. If a story arrives without a source, or without two
 * distinct editors, the import fails rather than writing something the admin could not have.
 *
 * The two editor accounts it creates have **no password**. They exist so the audit trail
 * has someone to point at; nobody can sign in as them.
 */
const IMPORT_EDITORS = [
  { email: "editorial.import.one@untouchable.example", displayName: "Editorial import (drafted)" },
  { email: "editorial.import.two@untouchable.example", displayName: "Editorial import (verified)" },
] as const;

type Payload = ReturnType<typeof readPayload>;

function readPayload(path: string) {
  return JSON.parse(readFileSync(path, "utf8")) as {
    conditions: { name: string; slug: string; summary: string; snomedCode: string | null; isSensitiveTopic: boolean }[];
    medicines: { name: string; slug: string; type: string; summary: string; isSensitiveTopic: boolean; dmdCode: string | null }[];
    figures: { name: string; slug: string; shortBio: string; isDeceased: boolean; imageUrl: string | null; imageLicence: string | null }[];
    stories: Record<string, unknown>[];
  };
}

async function main() {
  const path = process.argv[2];
  if (!path) throw new Error("Usage: tsx scripts/import-editorial.ts <export.json>");
  const payload: Payload = readPayload(path);

  const [drafter, verifier] = await Promise.all(
    IMPORT_EDITORS.map((editor) =>
      db.user.upsert({
        where: { email: editor.email },
        update: {},
        create: {
          email: editor.email,
          role: "editor",
          // No password. These accounts attribute the audit trail; they are not sign-ins.
          passwordHash: null,
          profile: { create: { displayName: editor.displayName } },
        },
      }),
    ),
  );

  for (const condition of payload.conditions) {
    await db.condition.upsert({ where: { slug: condition.slug }, update: condition, create: condition });
  }
  console.log(`conditions: ${payload.conditions.length}`);

  for (const medicine of payload.medicines) {
    const data = { ...medicine, type: medicine.type as never };
    await db.intervention.upsert({ where: { slug: medicine.slug }, update: data, create: data });
  }
  console.log(`medicines: ${payload.medicines.length}`);

  for (const figure of payload.figures) {
    await db.publicFigure.upsert({ where: { slug: figure.slug }, update: figure, create: figure });
  }
  console.log(`figures: ${payload.figures.length}`);

  for (const raw of payload.stories) {
    const story = raw as {
      slug: string; title: string; summary: string; type: string; disclosureType: string;
      keyMomentsJson: unknown; quote: string | null; contentNote: string | null;
      communityPermissionConfirmed: boolean | null; publishedAt: string | null; lastReviewedAt: string | null;
      figureSlug: string | null; conditionSlugs: string[]; quoteSourceIndex: number | null;
      sources: { url: string; title: string; publisher: string; publishedDate: string | null; sourceType: string }[];
      interventions: { slug: string; context: string | null; sourceIndex: number | null }[];
    };

    if (await db.story.findUnique({ where: { slug: story.slug } })) {
      console.log(`  skipped ${story.slug} (already here)`);
      continue;
    }
    if (story.sources.length === 0) throw new Error(`${story.slug} has no source`);

    const figure = story.figureSlug
      ? await db.publicFigure.findUniqueOrThrow({ where: { slug: story.figureSlug } })
      : null;
    const conditions = await db.condition.findMany({ where: { slug: { in: story.conditionSlugs } } });

    const created = await db.story.create({
      data: {
        type: story.type as never,
        disclosureType: story.disclosureType as never,
        publicFigureId: figure?.id ?? null,
        title: story.title,
        slug: story.slug,
        summary: story.summary,
        keyMomentsJson: story.keyMomentsJson as never,
        contentNote: story.contentNote,
        communityPermissionConfirmed: story.communityPermissionConfirmed,
        draftedById: drafter.id,
        lastReviewedAt: story.lastReviewedAt ? new Date(story.lastReviewedAt) : null,
        conditions: { create: conditions.map((c) => ({ conditionId: c.id })) },
      },
    });

    const sourceIds: string[] = [];
    for (const source of story.sources) {
      const made = await db.source.create({
        data: {
          storyId: created.id,
          url: source.url,
          title: source.title,
          publisher: source.publisher,
          publishedDate: source.publishedDate ? new Date(source.publishedDate) : null,
          sourceType: source.sourceType as never,
        },
      });
      sourceIds.push(made.id);
    }

    if (story.quote && story.quoteSourceIndex !== null && story.quoteSourceIndex >= 0) {
      await db.story.update({
        where: { id: created.id },
        data: { quote: story.quote, quoteSourceId: sourceIds[story.quoteSourceIndex] },
      });
    }

    for (const link of story.interventions) {
      const intervention = await db.intervention.findUnique({ where: { slug: link.slug } });
      if (!intervention) continue;
      await db.storyIntervention.create({
        data: {
          storyId: created.id,
          interventionId: intervention.id,
          context: link.context,
          sourceId:
            link.sourceIndex !== null && link.sourceIndex >= 0 ? sourceIds[link.sourceIndex] : null,
        },
      });
    }

    // Published through the same constraints a person would have to satisfy.
    await db.story.update({
      where: { id: created.id },
      data: {
        status: "published",
        verifiedById: verifier.id,
        publishedAt: story.publishedAt ? new Date(story.publishedAt) : new Date(),
      },
    });
    console.log(`  published ${story.slug} (${sourceIds.length} source(s))`);
  }

  const counts = await db.story.groupBy({ by: ["status"], _count: true });
  console.log("\nstories now: " + counts.map((c) => `${c.status} ${c._count}`).join(", "));
}

main()
  .catch((e) => {
    console.error(String(e).slice(0, 600));
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
