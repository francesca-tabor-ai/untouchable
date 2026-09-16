import { z } from "zod";

import { db } from "@/lib/db";
import { YELLOW_CARD_URL } from "@/lib/safety/constants";

import { TrackingError } from "./treatments";

/**
 * Side effect reports — brief 7.6 and 7.8.
 *
 * Two rules shape this module.
 *
 * **The description is free text and never leaves the system.** Not into a research export,
 * not onto an admin screen, not into an audit entry. It is shown back to the person who
 * wrote it and nowhere else.
 *
 * **After any logged side effect we show the MHRA Yellow Card scheme**, and we record that
 * we showed it. `yellowCardShownAt` is stamped in the same write that creates the report,
 * because the screen that receives the report always renders the link in the same response —
 * there is no path through the product where one happens without the other, and
 * `tests/unit/treatment-side-effects.test.ts` asserts the pair together so a change to
 * either half fails.
 *
 * Reporting here is not reporting to the MHRA. We say so on the screen, plainly. The link is
 * a signpost to the real scheme, which is theirs to run and not ours to intermediate.
 */

export const SEVERITY_MIN = 1;
export const SEVERITY_MAX = 5;

/**
 * The person's own rating of how bad it was. The words are anchors for the scale, so that a
 * "3" means something a month later — they are not a judgement we are making about them.
 */
export const SEVERITY_OPTIONS = [
  { value: 1, label: "1 — barely noticeable" },
  { value: 2, label: "2 — mild" },
  { value: 3, label: "3 — moderate" },
  { value: 4, label: "4 — hard to put up with" },
  { value: 5, label: "5 — as bad as it gets" },
];

export const sideEffectSchema = z.object({
  /** FREE TEXT — never exported. */
  description: z
    .string()
    .trim()
    .min(1, "Please say what happened, in your own words.")
    .max(1000, "Please keep this under 1000 characters."),
  severity: z
    .string()
    .trim()
    .min(1, "Please choose how bad it was.")
    .transform((value, ctx) => {
      const severity = Number(value);
      if (!Number.isInteger(severity) || severity < SEVERITY_MIN || severity > SEVERITY_MAX) {
        ctx.addIssue({ code: "custom", message: "Please choose how bad it was." });
        return z.NEVER;
      }
      return severity;
    }),
});

export type SideEffectInput = z.infer<typeof sideEffectSchema>;

/**
 * Record a side effect against a course this person owns.
 *
 * The Yellow Card stamp is part of this write, not a later one: the caller renders the link
 * in the response it returns, so a report that exists without the link having been shown is
 * not a state this code can reach.
 */
export async function reportSideEffect(
  userId: string,
  treatmentCourseId: string,
  input: SideEffectInput,
) {
  const course = await db.treatmentCourse.findFirst({
    where: { id: treatmentCourseId, userId },
    select: { id: true },
  });
  if (!course) throw new TrackingError("We could not find that treatment.");

  return db.sideEffectReport.create({
    data: {
      userId,
      treatmentCourseId: course.id,
      description: input.description,
      severity: input.severity,
      yellowCardShownAt: new Date(),
    },
  });
}

export function sideEffectsForCourse(userId: string, treatmentCourseId: string) {
  return db.sideEffectReport.findMany({
    where: { userId, treatmentCourseId },
    orderBy: { createdAt: "desc" },
  });
}

export { YELLOW_CARD_URL };
