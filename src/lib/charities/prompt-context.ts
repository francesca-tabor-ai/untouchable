import { db } from "@/lib/db";

import {
  donationPromptDecision,
  type DonationPromptContext,
  type DonationPromptDecision,
  type DonationSurface,
} from "./prompt-policy";

/**
 * Gathering the facts the no-pressure policy needs.
 *
 * `prompt-policy.ts` holds the rule and is pure, so it can be tested exhaustively without a
 * database. This file is the one place that goes and finds the person's situation. A screen
 * calls `donationPromptAllowed(surface, user)` and gets an answer; it never assembles the
 * context itself, and never re-implements a piece of the rule.
 *
 * Wave hand-over: when the check-in domain lands (brief 7.4) and the red-flag rules land
 * (brief 7.8), the two seams marked below are where their signals plug in. Nothing else
 * needs to change, and no calling screen needs to be revisited.
 */

/** How long a safety event keeps every donation prompt quiet. */
export const SAFETY_QUIET_HOURS = 24;

export interface PromptUser {
  id: string;
  ageConfirmed: boolean;
}

export async function donationPromptContextFor(
  surface: DonationSurface,
  user: PromptUser | null,
): Promise<DonationPromptContext> {
  if (!user) {
    // A visitor has no check-in history and no safety events. There is nothing to look up.
    return { surface };
  }

  // Someone who has not finished onboarding is still in it. Brief 6.4: no prompts there.
  const inOnboarding = !user.ageConfirmed;

  const since = new Date(Date.now() - SAFETY_QUIET_HOURS * 60 * 60 * 1000);

  // A red flag was shown to this person recently. Nothing asks them for anything.
  // Wave 8 writes these rows; the query works today and returns nothing until it does.
  const recentSafetyEvent = await db.safetyEvent.findFirst({
    where: { userId: user.id, shownAt: { gte: since } },
    select: { id: true },
  });

  // SEAM (wave 6 / wave 8): the check-in domain knows which responses recorded high symptom
  // scores — that is a scoring judgement, and this module does not make clinical judgements.
  // When it lands, set `lastCheckIn` here from the most recent completed check-in. Until
  // then a recent red flag, above, is the signal we actually have.
  const lastCheckIn = null;

  return {
    surface,
    inOnboarding,
    hasOpenSafetyConcern: recentSafetyEvent !== null,
    lastCheckIn,
  };
}

/** The whole decision, with its reason. Use this when you want to log why. */
export async function donationPromptDecisionFor(
  surface: DonationSurface,
  user: PromptUser | null,
): Promise<DonationPromptDecision> {
  return donationPromptDecision(await donationPromptContextFor(surface, user));
}

/** Yes or no. Use this in a component. */
export async function donationPromptAllowed(
  surface: DonationSurface,
  user: PromptUser | null,
): Promise<boolean> {
  return (await donationPromptDecisionFor(surface, user)).allowed;
}
