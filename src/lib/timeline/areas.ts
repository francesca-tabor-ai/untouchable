import type { FlagArea } from "./urgent-flags";

/**
 * Which red flag overlays apply to this person.
 *
 * A red flag for an ear problem is not a red flag for a bowel problem, and applying every
 * rule to everybody is how people learn to scroll past all of them.
 *
 * The matching is on the names of the symptoms somebody chose to track, which is crude and
 * is meant to be. It errs towards adding an area rather than leaving one off: an extra rule
 * costs a person a sentence they did not need, and a missing one costs more than that.
 *
 * The general set always applies and is never removed by anything here.
 */
const AREA_WORDS: Record<Exclude<FlagArea, "general">, RegExp> = {
  ear: /\b(ear|ears|hearing|deaf|tinnitus|ringing|vertigo|dizzy|dizziness|balance)\b/i,
  bowel: /\b(bowel|stomach|tummy|abdominal|abdomen|diarrhoea|constipation|stool|nausea|vomit)\b/i,
  headache: /\b(headache|headaches|migraine|head pain|face pain)\b/i,
};

export function flagAreasFor(symptomNames: readonly string[]): FlagArea[] {
  const haystack = symptomNames.join(" ");
  const areas = (Object.keys(AREA_WORDS) as Exclude<FlagArea, "general">[]).filter((area) =>
    AREA_WORDS[area].test(haystack),
  );
  return ["general", ...areas];
}
