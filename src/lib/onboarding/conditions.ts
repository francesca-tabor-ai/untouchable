import { z } from "zod";

import { db } from "@/lib/db";
import { EARLIEST_YEAR_OF_BIRTH } from "@/lib/profile";

/**
 * What someone is living with. Chosen from the conditions we hold, never typed in free
 * text: research needs the same condition to mean the same thing for everyone, and a free
 * text box here would also be somewhere to write something identifying.
 *
 * `selfReported` is not a judgement. We record what a person tells us and never dispute it.
 * It is recorded because a cohort of people who have a formal diagnosis and a cohort of
 * people who believe they have the condition are different cohorts, and pretending
 * otherwise would make the research wrong.
 */

export const conditionSelectionSchema = z.object({
  conditionId: z.string().min(1),
  diagnosedYear: z.preprocess(
    (value) => (value === "" || value === undefined || value === null ? null : value),
    z.coerce
      .number()
      .int("Please enter a year, such as 2019.")
      .min(EARLIEST_YEAR_OF_BIRTH, "Please enter a year after 1900.")
      .max(new Date().getUTCFullYear(), "That year has not happened yet.")
      .nullable(),
  ),
  selfReported: z.boolean(),
});

export const conditionsStepSchema = z.object({
  selections: z
    .array(conditionSelectionSchema)
    .min(1, "Please choose at least one condition. You can change this later."),
});

export type ConditionSelection = z.infer<typeof conditionSelectionSchema>;

/** Every condition we hold, for the picker. */
export function listConditions() {
  return db.condition.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, summary: true },
  });
}

export function userConditions(userId: string) {
  return db.userCondition.findMany({
    where: { userId },
    include: { condition: { select: { id: true, name: true, slug: true } } },
    orderBy: { condition: { name: "asc" } },
  });
}

/**
 * Save the whole selection: add what is new, update what changed, and remove what is no
 * longer ticked.
 *
 * Removing a condition also stops tracking any symptom that only belonged to it. The
 * symptom rows stay — history is not rewritten — but they go inactive, so the daily log
 * does not keep asking about a condition someone has told us they do not have.
 */
export async function saveUserConditions(userId: string, selections: ConditionSelection[]) {
  const keep = new Set(selections.map((selection) => selection.conditionId));

  await db.userCondition.deleteMany({
    where: { userId, conditionId: { notIn: [...keep] } },
  });

  for (const selection of selections) {
    await db.userCondition.upsert({
      where: { userId_conditionId: { userId, conditionId: selection.conditionId } },
      create: {
        userId,
        conditionId: selection.conditionId,
        diagnosedYear: selection.diagnosedYear,
        selfReported: selection.selfReported,
      },
      update: {
        diagnosedYear: selection.diagnosedYear,
        selfReported: selection.selfReported,
      },
    });
  }

  await deactivateOrphanedSymptoms(userId);
}

async function deactivateOrphanedSymptoms(userId: string) {
  const conditionIds = (
    await db.userCondition.findMany({ where: { userId }, select: { conditionId: true } })
  ).map((row) => row.conditionId);

  const stillRelevant = (
    await db.symptomCondition.findMany({
      where: { conditionId: { in: conditionIds } },
      select: { symptomId: true },
    })
  ).map((row) => row.symptomId);

  await db.userSymptom.updateMany({
    where: { userId, active: true, symptomId: { notIn: stillRelevant } },
    data: { active: false },
  });
}

export async function hasChosenConditions(userId: string): Promise<boolean> {
  return (await db.userCondition.count({ where: { userId } })) > 0;
}
