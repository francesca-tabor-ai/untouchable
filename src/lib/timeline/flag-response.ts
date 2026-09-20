import type { UrgentFlagTier } from "@/generated/prisma";

import type { UrgentFlagHit } from "./urgent-flags";

/**
 * What a person reads when a rule fires.
 *
 * Written once, here, so that every surface says the same thing in the same words. Three
 * sentences at most before the number, because someone reading this may be reading it
 * one-handed at four in the morning and the number is the only part that has to land.
 *
 * Tone: state it plainly, once. No sirens, no capitals, no "URGENT", and no repeating it
 * every screen after. A person who has been told and has decided not to go is not helped by
 * being told again; they are helped by the entry being logged so that the next clinician
 * who sees them hears about it.
 */

export interface FlagResponse {
  tier: UrgentFlagTier;
  heading: string;
  /** What we read in their words. Said as an observation, never as a conclusion. */
  noticed: string;
  action: string;
  contact: { label: string; number: string; href: string };
  /** The one caveat, said once. */
  caveat: string;
}

export function flagResponse(hit: UrgentFlagHit): FlagResponse {
  if (hit.tier === "emergency") {
    return {
      tier: "emergency",
      heading: "Call 999 now",
      noticed: hit.rule.noticed,
      action: "Call 999, or get someone to call for you. Do not drive yourself.",
      contact: { label: "999", number: "999", href: "tel:999" },
      caveat:
        "This is a check against a list of things that need seeing quickly. It is not a diagnosis, and it can be wrong in both directions.",
    };
  }

  return {
    tier: "same_day",
    heading: "Get this looked at today",
    noticed: hit.rule.noticed,
    action:
      "Call NHS 111, or your GP surgery if it is open. Say that it started suddenly, and say when.",
    contact: { label: "NHS 111", number: "111", href: "tel:111" },
    caveat:
      "This is a check against a list of things that need seeing quickly. It is not a diagnosis, and it can be wrong in both directions.",
  };
}

/**
 * What is said about a flagged thing that has already happened and passed.
 *
 * It is not an emergency now and saying otherwise would be alarming and wrong. It is still
 * the single thing a clinician most needs told, so it is kept and carried forward rather
 * than quietly dropped once the day passes.
 */
export function historicalFlagNote(hit: UrgentFlagHit): string {
  return `${hit.rule.noticed} That was in the past, so this is not about right now — but it is saved as something to tell a clinician, and it will be at the top of your next handover.`;
}
