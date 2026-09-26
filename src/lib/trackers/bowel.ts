import type { BowelEntry } from "./records";

/**
 * The one place a bowel record makes the screen say something.
 *
 * Blood in poo, or poo that is black and sticky, is something the NHS asks people to get
 * checked. Saying so is signposting, not interpretation: it tells the person who to ask, not
 * what it is. We do not guess at a cause, we do not say it is probably nothing, and we do
 * not say it is serious. See DECISIONS.md HT-03.
 *
 * Like every safety screen, this one never sits next to a request for money — AGENTS.md rule 5.
 */

export const BLOOD_SIGNPOST = {
  title: "You noted blood, or poo that was black",
  body: "It is worth getting this checked. Ask your GP surgery for an appointment, or call NHS 111 if you cannot get one soon.",
  urgent:
    "Call 999 or go to A&E if you are bleeding a lot and it will not stop, or you feel faint, dizzy or very unwell.",
  source: {
    label: "NHS: blood in poo",
    href: "https://www.nhs.uk/conditions/blood-in-poo/",
  },
} as const;

/** Whether the signpost belongs on the screen for this set of records. */
export function needsBloodSignpost(entries: readonly Pick<BowelEntry, "blood">[]): boolean {
  return entries.some((entry) => entry.blood);
}
