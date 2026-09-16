import { z } from "zod";

import { db } from "@/lib/db";

/**
 * The symptoms someone wants to keep an eye on. Only symptoms linked to the conditions they
 * have chosen are offered, so the list stays short enough to answer on a phone.
 *
 * Stopping tracking a symptom sets `active` to false rather than deleting the row: the
 * history of what someone recorded against it is theirs, and deleting it would quietly
 * change their own record behind them.
 */

export const symptomsStepSchema = z.object({
  symptomIds: z
    .array(z.string().min(1))
    .min(1, "Please choose at least one symptom. The daily log is built from these, and you can change them whenever you like."),
});

/** Symptoms attached to any condition this person has chosen. */
export async function symptomsForUser(userId: string) {
  const conditions = await db.userCondition.findMany({
    where: { userId },
    select: { conditionId: true },
  });
  const conditionIds = conditions.map((row) => row.conditionId);
  if (conditionIds.length === 0) return [];

  return db.symptom.findMany({
    where: { conditions: { some: { conditionId: { in: conditionIds } } } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  });
}

export function userSymptoms(userId: string) {
  return db.userSymptom.findMany({
    where: { userId },
    include: { symptom: { select: { id: true, name: true, slug: true } } },
    orderBy: { symptom: { name: "asc" } },
  });
}

export async function activeSymptomIds(userId: string): Promise<string[]> {
  const rows = await db.userSymptom.findMany({
    where: { userId, active: true },
    select: { symptomId: true },
  });
  return rows.map((row) => row.symptomId);
}

export async function saveUserSymptoms(userId: string, symptomIds: string[]) {
  const keep = new Set(symptomIds);

  await db.userSymptom.updateMany({
    where: { userId, symptomId: { notIn: [...keep] } },
    data: { active: false },
  });

  for (const symptomId of keep) {
    await db.userSymptom.upsert({
      where: { userId_symptomId: { userId, symptomId } },
      create: { userId, symptomId, active: true },
      update: { active: true },
    });
  }
}

export async function hasChosenSymptoms(userId: string): Promise<boolean> {
  return (await db.userSymptom.count({ where: { userId, active: true } })) > 0;
}
