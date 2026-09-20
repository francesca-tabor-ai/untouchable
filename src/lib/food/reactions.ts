/**
 * The reaction log.
 *
 * This is the only legitimate way a tier 2 limit gets personalised. Where a rule genuinely
 * depends on individual tolerance, the honest answer is not a number invented here — it is
 * that nobody knows yet, and the way to find out is to write down what happened.
 *
 * What this module does **not** do is read the log back as a cause. Four entries mentioning
 * onion is four entries mentioning onion; it is not a conclusion, and the screen shows the
 * rows and stops. Working out what the rows mean is a job for the person and their GP or
 * dietitian, and the platform's wider rule against interpreting somebody's own data
 * (AGENTS.md rule 9) applies here in full — the Food Advisor carve-out is about translating
 * a condition into food rules, not about telling anybody what their symptoms were caused by.
 */

import { z } from "zod";

export const reactionSeverities = ["mild", "moderate", "severe"] as const;
export type ReactionSeverity = (typeof reactionSeverities)[number];

export const REACTION_SEVERITY_LABEL: Record<ReactionSeverity, string> = {
  mild: "Mild — noticed it, carried on",
  moderate: "Moderate — it got in the way",
  severe: "Severe — I had to stop what I was doing",
};

export const reactionEntrySchema = z.object({
  /** What was eaten, in the person's own words. Free text, and it stays here. */
  food: z.string().trim().min(1).max(200),
  /** When it was eaten. */
  eatenAt: z.iso.datetime({ local: true }),
  /** What happened. Free text. Rule 7: never leaves in a research export. */
  symptom: z.string().trim().min(1).max(300),
  severity: z.enum(reactionSeverities),
  /** How long afterwards, in minutes, where the person knows. */
  minutesAfter: z.number().int().min(0).max(4320).optional(),
});

export type ReactionEntry = z.infer<typeof reactionEntrySchema>;

/**
 * A row, formatted for reading. Deliberately flat: a time, a food, a symptom, a severity.
 * No grouping by suspected culprit, no counts, no "this keeps coming up".
 */
export function reactionRow(entry: ReactionEntry): string {
  const when = entry.minutesAfter === undefined ? "" : `, ${entry.minutesAfter} minutes later`;
  return `${entry.food} — ${entry.symptom}${when}`;
}

export const REACTION_LOG_PURPOSE =
  "Writing down what you ate and what happened is the only way to work out where your own limits are. This log keeps the entries and shows them back to you. It does not work out what caused what — that is a conversation for your GP or a dietitian, and turning up with a fortnight of entries makes it a much shorter one.";

/** Rule 7. Free text is marked as free text wherever it is stored. */
export const FREE_TEXT_FIELDS = ["food", "symptom"] as const;
