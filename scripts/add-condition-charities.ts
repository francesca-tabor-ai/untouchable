import { db } from "../src/lib/db";

import { CONDITION_CHARITIES } from "./condition-charities";

/**
 * Add real charities for every condition, **unverified**.
 *
 * Run with: npx tsx scripts/add-condition-charities.ts
 *
 * Nothing this script writes is public. A listing only appears on the site once an editor has
 * checked it against the official register and pressed verify in the charity admin (rule 4,
 * D-005). The script never sets `verifiedAt` or `verifiedById`, and never changes a listing
 * that already exists — an editor may have corrected or verified it, and their record wins.
 * For an existing listing it only adds condition links that are missing.
 *
 * Safe to run more than once.
 */
async function main() {
  const conditions = await db.condition.findMany({ select: { id: true, slug: true } });
  const conditionIds = new Map(conditions.map((condition) => [condition.slug, condition.id]));

  let created = 0;
  let linked = 0;
  const missingConditions = new Set<string>();

  for (const charity of CONDITION_CHARITIES) {
    const { conditions: slugs, ...data } = charity;

    // An editor may already have added this charity under another slug. The register number
    // is what identifies it.
    let record = await db.charity.findFirst({
      where: {
        OR: [
          { slug: data.slug },
          { regulator: data.regulator, registeredNumber: data.registeredNumber },
        ],
      },
      select: { id: true },
    });

    if (!record) {
      record = await db.charity.create({
        data: { ...data, logoUrl: null, logoPermission: false, active: true },
        select: { id: true },
      });
      created += 1;
    }

    const ids = slugs.flatMap((slug) => {
      const id = conditionIds.get(slug);
      if (!id) missingConditions.add(slug);
      return id ? [id] : [];
    });

    const result = await db.charityCondition.createMany({
      data: ids.map((conditionId) => ({ charityId: record.id, conditionId })),
      skipDuplicates: true,
    });
    linked += result.count;
  }

  console.log(`charities created: ${created} (all unverified, none public until an editor verifies)`);
  console.log(`condition links added: ${linked}`);
  if (missingConditions.size > 0) {
    console.log(`not in this database, skipped: ${[...missingConditions].sort().join(", ")}`);
  }

  const uncovered = await db.condition.findMany({
    where: { charities: { none: {} } },
    select: { slug: true },
  });
  if (uncovered.length > 0) {
    console.log(`conditions still without a charity: ${uncovered.map((c) => c.slug).join(", ")}`);
  }
}

main()
  .catch((e) => {
    console.error(String(e).slice(0, 600));
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
