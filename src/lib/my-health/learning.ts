import { db } from "@/lib/db";
import { listPublicMedicines, type MedicineCard } from "@/lib/medicines/queries";
import { listPublishedStories, type StoryCard } from "@/lib/stories/queries";

/**
 * My health → Education, chosen for one person.
 *
 * "Personalised" here means one thing only: we show the pages we already publish about the
 * conditions somebody has told us they have, and the medicines they have logged. Nothing is
 * written for them, nothing is generated, and nothing is ranked by what might suit them —
 * the brief rules out AI-generated insight of any kind, and AGENTS.md rule 9 rules out
 * advice. The medicine pages come from the NHS, the BNF and the eMC (rule 14), and the
 * stories are published ones only, so a retraction takes them off this page too (rule 3).
 */

const STORIES_PER_CONDITION = 3;

export interface ConditionReading {
  id: string;
  name: string;
  slug: string;
  summary: string;
  stories: StoryCard[];
}

export interface Reading {
  conditions: ConditionReading[];
  medicines: MedicineCard[];
}

export async function readingFor(userId: string): Promise<Reading> {
  const [chosen, courses, published] = await Promise.all([
    db.userCondition.findMany({
      where: { userId },
      select: { condition: { select: { id: true, name: true, slug: true, summary: true } } },
      orderBy: { condition: { name: "asc" } },
    }),
    db.treatmentCourse.findMany({ where: { userId }, select: { interventionId: true } }),
    listPublicMedicines(),
  ]);

  const conditions = await Promise.all(
    chosen.map(async ({ condition }) => ({
      ...condition,
      stories: await listPublishedStories({ condition: condition.slug, take: STORIES_PER_CONDITION }),
    })),
  );

  // Only medicines with a published page of their own. A logged medicine we have not
  // written up is simply not listed — there is nothing independent to send anybody to.
  const logged = new Set(courses.map((course) => course.interventionId));
  const medicines = published.filter((medicine) => logged.has(medicine.id));

  return { conditions, medicines };
}
