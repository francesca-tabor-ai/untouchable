import { db } from "@/lib/db";

import { saveResponse, type SaveResponseResult } from "./responses";
import { baselineVersion, type VersionView } from "./versions";

/**
 * The baseline assessment — the last step of onboarding, and the fixed point everything
 * recorded later is compared against (brief 7.1, 7.3, 7.4).
 *
 * **What makes a response the baseline.** It is answered against the questionnaire version
 * that declares `schedule.baseline`, and it is not attached to a scheduled check-in. Every
 * other way of answering a questionnaire goes through a `ScheduledCheckIn` row, so
 * `checkInId === null` is what separates "the one they did during onboarding" from "the
 * general check-in they did three months later against the very same version".
 *
 * That distinction is the whole of acceptance criterion 6, and it is why the check is not
 * simply "has this person answered this version". See DECISIONS.md D-034, and the note to
 * the scheduling milestone: `schedule.baseline` means *taken during onboarding*, so no
 * `ScheduledCheckIn` should ever be created for the baseline itself.
 */

export { baselineVersion };

/** The questions the baseline step asks right now, or null if nothing is published yet. */
export async function currentBaselineVersion(): Promise<VersionView | null> {
  return baselineVersion();
}

/**
 * Has this person completed the baseline, against the version currently used for baselines?
 *
 * Scoped to that version on purpose. If the baseline questions are replaced, the honest
 * answer is that this person has not answered the new ones — and the onboarding step says
 * so rather than counting an answer to different questions.
 */
export async function hasBaselineResponse(userId: string): Promise<boolean> {
  const version = await baselineVersion();
  if (!version) return false;

  const count = await db.response.count({
    where: { userId, questionnaireVersionId: version.id, checkInId: null },
  });
  return count > 0;
}

/** The person's own baseline response, if they have one. */
export async function baselineResponseFor(userId: string) {
  const version = await baselineVersion();
  if (!version) return null;

  return db.response.findFirst({
    where: { userId, questionnaireVersionId: version.id, checkInId: null },
    orderBy: { completedAt: "desc" },
    select: { id: true, completedAt: true, score: true },
  });
}

/**
 * Record a baseline. Never attached to a check-in — see the note at the top of this file.
 */
export async function saveBaselineResponse(
  userId: string,
  answers: Record<string, unknown>,
): Promise<SaveResponseResult | { ok: false; problems: { form: string } }> {
  const version = await baselineVersion();
  if (!version) {
    return {
      ok: false,
      problems: { form: "There are no baseline questions set up yet. Nothing has been saved." },
    };
  }

  return saveResponse({ userId, versionId: version.id, answers, checkInId: null });
}
