import { hasBaselineResponse } from "./baseline";

/**
 * The "your first check-in" onboarding step, owned by the questionnaire engine milestone.
 * It lives here rather than inline in the step registry so that two teams finishing two
 * different steps never edit the same file.
 *
 * Built in milestone 4. The screen is at `/onboarding/baseline`.
 */
export const BASELINE_STEP_STATUS: "ready" | "coming_soon" = "ready";

/**
 * Complete once a baseline response exists **against the questionnaire version currently
 * used for baselines**, and only for a response that is not attached to a scheduled
 * check-in.
 *
 * Scoping to the version matters: a general check-in answered months later must not
 * retroactively satisfy the baseline, or the whole point of a baseline — a fixed starting
 * point everything else is measured against — quietly disappears. Because a general check-in
 * can use the very same version, the version alone is not enough to tell them apart; the
 * absence of a `ScheduledCheckIn` is what marks the onboarding answer. The reasoning, and
 * what the scheduling milestone must not do, is in `baseline.ts`.
 *
 * If no published version declares itself the baseline, this is false — the honest answer
 * rather than an optimistic one.
 */
export async function hasCompletedBaseline(userId: string): Promise<boolean> {
  return hasBaselineResponse(userId);
}
