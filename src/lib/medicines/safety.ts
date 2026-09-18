/**
 * Sensitive-topic handling for medicines.
 *
 * `Intervention.isSensitiveTopic` marks medicines where dependence, withdrawal or misuse is
 * part of the story — benzodiazepines, opioids, gabapentinoids, stimulants. It behaves the
 * same way `Condition.isSensitiveTopic` does in `src/lib/stories/safety.ts`: a content note
 * before, support signposting after, and never a donation prompt.
 *
 * What it adds is a second set of contacts. Someone reading about a sleeping tablet they
 * have been on since 1998 is not in crisis and does not need Samaritans; they need FRANK
 * and a GP appointment. So a sensitive medicine surface shows the crisis contacts *and*
 * `SUBSTANCE_SUPPORT_CONTACTS`.
 *
 * As in the stories layer, the decision lives in one place so that a medicine page and a
 * story page can never disagree about whether a warning is needed.
 */

export interface SensitiveMedicine {
  name: string;
  isSensitiveTopic: boolean;
}

/** True when any of these medicines carries the dependence flag. */
export function hasSensitiveMedicine(medicines: readonly SensitiveMedicine[]): boolean {
  return medicines.some((medicine) => medicine.isSensitiveTopic);
}

/** True when the dependence contacts belong at the foot of the page. */
export function needsSubstanceSupport(medicines: readonly SensitiveMedicine[]): boolean {
  return hasSensitiveMedicine(medicines);
}

function names(medicines: readonly SensitiveMedicine[]): string[] {
  return medicines.filter((medicine) => medicine.isSensitiveTopic).map((medicine) => medicine.name);
}

function list(values: string[]): string {
  if (values.length <= 1) return values[0] ?? "";
  return `${values.slice(0, -1).join(", ")} and ${values[values.length - 1]}`;
}

/**
 * The note shown above a story that names a sensitive medicine, or null when none of the
 * medicines needs one.
 *
 * It says what is in the piece and where support is, and nothing else. It does not say the
 * medicine is dangerous, and it does not say it helped anybody: a medicine page and a story
 * report what people said, they do not judge the drug.
 */
export function medicineContentNoteText(medicines: readonly SensitiveMedicine[]): string | null {
  const sensitive = names(medicines);
  if (sensitive.length === 0) return null;

  const subject = list(sensitive);
  return `This talks about ${subject}, and about becoming dependent on a prescribed medicine. If you are taking something like it, you may not want to read this now. Where to get support is at the end of the page.`;
}

/**
 * The note on a medicine's own page. Same promise, different subject: the reader came
 * looking for this medicine, so naming it again would be strange.
 */
export function medicinePageContentNote(medicine: SensitiveMedicine): string | null {
  if (!medicine.isSensitiveTopic) return null;
  return `People become dependent on ${medicine.name}, sometimes after being prescribed it for a short time, and the stories below talk about that. Where to get support is at the end of the page.`;
}

/**
 * The fixed line that goes on every medicine page.
 *
 * AGENTS.md rule 9 and brief principle 7: we show what people said and what an independent
 * source says the medicine is. We never say a medicine worked, helped, or did harm.
 */
export const NOT_MEDICAL_ADVICE =
  "This is a plain description of what the medicine is, not medical advice, and not a recommendation for or against it. The stories below are what people have said about their own lives. They are not evidence that this medicine helps or harms anyone, and nothing here is a substitute for your GP or your clinical team.";

/** Where the plain-English description has to come from. AGENTS.md rule 14. */
export const INDEPENDENT_SOURCE_NOTE =
  "Written in our own words from the NHS, the BNF or the electronic Medicines Compendium. We never take medicine information from a company that sells treatment.";
