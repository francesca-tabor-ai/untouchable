import { db } from "@/lib/db";

/**
 * The "your first check-in" onboarding step, owned by the questionnaire engine milestone.
 * It lives here rather than inline in the step registry so that two teams finishing two
 * different steps never edit the same file.
 *
 * To finish this step: build the screen at `/onboarding/baseline`, and flip
 * `BASELINE_STEP_STATUS` to "ready".
 */
export const BASELINE_STEP_STATUS: "ready" | "coming_soon" = "coming_soon";

/**
 * Complete once a baseline response exists **against the questionnaire version currently
 * used for baselines**.
 *
 * Scoping to the version matters: a general check-in answered months later must not
 * retroactively satisfy the baseline, or the whole point of a baseline — a fixed starting
 * point everything else is measured against — quietly disappears.
 *
 * Until the engine lands there is no published baseline version, so this is false, which is
 * the honest answer rather than an optimistic one.
 */
export async function hasCompletedBaseline(userId: string): Promise<boolean> {
  const baseline = await db.questionnaireVersion.findFirst({
    where: { publishedAt: { not: null }, questionnaire: { key: "general-wellbeing" } },
    orderBy: { version: "desc" },
    select: { id: true },
  });
  if (!baseline) return false;

  const response = await db.response.count({
    where: { userId, questionnaireVersionId: baseline.id, checkIn: { treatmentCourseId: null } },
  });
  return response > 0;
}
