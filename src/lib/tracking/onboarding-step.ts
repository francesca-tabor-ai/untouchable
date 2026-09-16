import { db } from "@/lib/db";

/**
 * The "treatments you are on now" onboarding step, owned by the treatment logging
 * milestone. It lives here rather than inline in the step registry so that two teams
 * finishing two different steps never edit the same file.
 *
 * To finish this step: build the screen at `/onboarding/treatments`, make it set
 * `Profile.treatmentsConfirmedAt`, and flip `TREATMENTS_STEP_STATUS` to "ready".
 */
export const TREATMENTS_STEP_STATUS: "ready" | "coming_soon" = "coming_soon";

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
