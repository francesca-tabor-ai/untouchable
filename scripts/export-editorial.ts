import { writeFileSync } from "node:fs";

import { db } from "../src/lib/db";

/**
 * Export the editorial content — conditions, medicines, public figures and published
 * stories with their sources — so it can be moved into another environment.
 *
 * This exists because editorial content is entered by people through the admin, not
 * committed by engineers, so it does not travel with the code. The output is deliberately
 * NOT committed: it describes real, named human beings, and the repository is not where
 * that belongs. See DECISIONS.md PL-15.
 *
 * Nothing about any patient is included. No users, no consent records, no tracking, no
 * accounts, no password hashes — only what is already published on the public site.
 */
async function main() {
  const conditions = await db.condition.findMany({
    orderBy: { slug: "asc" },
    // supportTopic travels with the condition. It was left out when the field was added, so
    // production rendered crisis contacts and nothing else — no Rape Crisis on a story about
    // sexual abuse, no FRANK on one about addiction. The block is only as good as the export.
    select: {
      name: true,
      slug: true,
      summary: true,
      snomedCode: true,
      isSensitiveTopic: true,
      supportTopic: true,
    },
  });

  const medicines = await db.intervention.findMany({
    where: { summary: { not: null } },
    orderBy: { name: "asc" },
    select: { name: true, slug: true, type: true, summary: true, isSensitiveTopic: true, dmdCode: true },
  });

  const figures = await db.publicFigure.findMany({
    where: {
      stories: {
        some: {
          status: "published",
          sources: { some: { NOT: { url: { contains: "example.test" } } } },
        },
      },
    },
    orderBy: { slug: "asc" },
    select: { name: true, slug: true, shortBio: true, isDeceased: true, imageUrl: true, imageLicence: true },
  });

  // Fictional development stories are excluded. They exist to exercise the system, and a
  // public site presenting invented people's health as real would be exactly the kind of
  // thing this platform is built to refuse.
  //
  // The discriminator is the sources: every seeded story cites example.test, and a real one
  // cannot. That is self-maintaining — a new fictional story is excluded without anyone
  // remembering to add it to a list.
  const stories = await db.story.findMany({
    where: {
      status: "published",
      sources: { some: { NOT: { url: { contains: "example.test" } } } },
    },
    orderBy: { publishedAt: "asc" },
    select: {
      type: true,
      disclosureType: true,
      title: true,
      slug: true,
      summary: true,
      keyMomentsJson: true,
      quote: true,
      contentNote: true,
      needsSupportSignposting: true,
      communityPermissionConfirmed: true,
      publishedAt: true,
      lastReviewedAt: true,
      publicFigure: { select: { slug: true } },
      conditions: { select: { condition: { select: { slug: true } } } },
      sources: {
        orderBy: { createdAt: "asc" },
        select: { id: true, url: true, title: true, publisher: true, publishedDate: true, sourceType: true },
      },
      quoteSourceId: true,
      interventions: {
        select: { intervention: { select: { slug: true } }, context: true, sourceId: true },
      },
    },
  });

  const payload = {
    exportedAt: new Date().toISOString(),
    note: "Editorial content only. No patient data, no accounts, no consent records.",
    conditions,
    medicines,
    figures,
    stories: stories.map((story) => ({
      ...story,
      figureSlug: story.publicFigure?.slug ?? null,
      conditionSlugs: story.conditions.map((c) => c.condition.slug),
      // Sources are identified by their position, because their ids will differ on the far side.
      quoteSourceIndex: story.quoteSourceId
        ? story.sources.findIndex((s) => s.id === story.quoteSourceId)
        : null,
      interventions: story.interventions.map((link) => ({
        slug: link.intervention.slug,
        context: link.context,
        sourceIndex: link.sourceId ? story.sources.findIndex((s) => s.id === link.sourceId) : null,
      })),
      publicFigure: undefined,
      conditions: undefined,
      quoteSourceId: undefined,
      sources: story.sources.map(({ id: _id, ...rest }) => rest),
    })),
  };

  const path = process.argv[2] ?? "editorial-export.json";
  writeFileSync(path, JSON.stringify(payload, null, 2));
  console.log(
    `wrote ${path}: ${conditions.length} conditions, ${medicines.length} medicines, ` +
      `${figures.length} figures, ${stories.length} published stories`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
