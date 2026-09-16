/**
 * "Anything unusual today?" — brief 7.5.
 *
 * A short, fixed list of ordinary things that change how a day goes. Fixed rather than free
 * text because a tag someone can type is a tag nobody can count, and because tapping is
 * faster than typing when you are exhausted.
 *
 * These are context, not causes. Nothing anywhere reads a tag and draws a conclusion from
 * it; the daily log shows the ones you chose and stops there.
 *
 * Adding to this list is safe. Changing a `value` is not — stored logs hold the value, so an
 * old tag would quietly vanish from someone's own record.
 */
export interface ContextTag {
  value: string;
  label: string;
}

export const CONTEXT_TAGS: readonly ContextTag[] = [
  { value: "poor_sleep", label: "Slept badly" },
  { value: "illness", label: "Ill with something else" },
  { value: "stress", label: "Stressful day" },
  { value: "missed_dose", label: "Missed a dose" },
  { value: "new_treatment", label: "Started something new" },
  { value: "period", label: "Period" },
  { value: "busy", label: "Much busier than usual" },
  { value: "rest", label: "Rested more than usual" },
  { value: "appointment", label: "Hospital or GP appointment" },
  { value: "travel", label: "Travelling" },
] as const;

const BY_VALUE = new Map(CONTEXT_TAGS.map((tag) => [tag.value, tag]));

export function isContextTag(value: string): boolean {
  return BY_VALUE.has(value);
}

/**
 * The label for a stored tag. A value we no longer recognise is shown as itself rather than
 * dropped: it is in the person's own record and hiding it would be rewriting their history.
 */
export function contextTagLabel(value: string): string {
  return BY_VALUE.get(value)?.label ?? value;
}
