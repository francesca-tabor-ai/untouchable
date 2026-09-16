import { db } from "@/lib/db";

/**
 * The "treatments you are on now" onboarding step, owned by the treatment logging
 * milestone. It lives here rather than inline in the step registry so that two teams
 * finishing two different steps never edit the same file.
 *
 * Built in milestone 5: the screen is `/onboarding/treatments`, it records the answer with
 * `confirmTreatments`, and this status is now "ready".
 */
export const TREATMENTS_STEP_STATUS: "ready" | "coming_soon" = "ready";

/**
 * Complete once the person has told us about their treatments — **including telling us
 * they are on none**.
 *
 * Counting `TreatmentCourse` rows would make this step impossible to finish for anyone who
 * takes nothing, which is a real and common answer. So completeness is "you have been asked
 * and you answered", recorded as a timestamp, not "you have at least one medicine".
 */
export async function hasConfirmedTreatments(userId: string): Promise<boolean> {
  const profile = await db.profile.findUnique({
    where: { userId },
    select: { treatmentsConfirmedAt: true },
  });
  return profile?.treatmentsConfirmedAt != null;
}

/**
 * Record that the person has answered the question, whatever the answer was.
 *
 * This is the only writer of `treatmentsConfirmedAt`, and it writes a timestamp for "I am
 * not on anything at the moment" exactly as it does for "here are my four medicines". Null
 * keeps meaning "we have never asked", which is the distinction the step depends on.
 *
 * Upserts the profile because somebody can reach this step having skipped the welcome
 * screen, and a missing profile row should not be a dead end.
 */
export async function confirmTreatments(userId: string, at: Date = new Date()): Promise<void> {
  await db.profile.upsert({
    where: { userId },
    create: { userId, treatmentsConfirmedAt: at },
    update: { treatmentsConfirmedAt: at },
  });
}

/** When the person last told us their treatment list was up to date. Null if never asked. */
export async function treatmentsConfirmedAt(userId: string): Promise<Date | null> {
  const profile = await db.profile.findUnique({
    where: { userId },
    select: { treatmentsConfirmedAt: true },
  });
  return profile?.treatmentsConfirmedAt ?? null;
}
