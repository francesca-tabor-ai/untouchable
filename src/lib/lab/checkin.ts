import { z } from "zod";

import { OUTCOMES, type OutcomeKey } from "./scales";

/**
 * The Habit Lab check-in: under sixty seconds, on a phone, usually just after waking.
 *
 * Every field is optional. A person who only wants to record how long it took to fall asleep
 * can do that and save. A half-filled check-in is data; a check-in abandoned because it asked
 * too much is nothing.
 *
 * Two lists here are fixed rather than free text, for the same reason as the daily log's
 * context tags: a tag somebody types is a tag nobody can count.
 */

export const NOTE_MAX_LENGTH = 1000;

/**
 * Confounders. Things that change a night's sleep on their own, recorded so a result can say
 * how many of its days had one. Adding to this list is safe; changing a `value` is not, because
 * stored check-ins hold the value.
 */
export const LAB_TAGS = [
  { value: "period", label: "Period" },
  { value: "illness", label: "Ill with something" },
  { value: "travel", label: "Travelling" },
  { value: "late_meal", label: "Ate late" },
  { value: "alcohol", label: "Had alcohol" },
  { value: "big_work_day", label: "Big day at work" },
  { value: "late_screen", label: "Screens late" },
  { value: "nap", label: "Napped" },
  { value: "disturbed", label: "Woken by something else" },
] as const;

export type LabTag = (typeof LAB_TAGS)[number]["value"];

const TAG_VALUES = new Set<string>(LAB_TAGS.map((tag) => tag.value));

export function isLabTag(value: string): value is LabTag {
  return TAG_VALUES.has(value);
}

/** A stored tag we no longer recognise is shown as itself, never dropped from someone's record. */
export function labTagLabel(value: string): string {
  return LAB_TAGS.find((tag) => tag.value === value)?.label ?? value;
}

/**
 * "Anything new since yesterday?" — the questions that decide whether this check-in shows the
 * red-flag banner instead of a saved confirmation.
 *
 * Asked as questions with tick boxes rather than left to the note, because the note is the
 * last thing somebody fills in and the first thing they skip. The note is read too
 * (`red-flags.ts`); this is the floor under it.
 */
export const RED_FLAG_QUESTIONS = [
  { value: "sudden_hearing_loss", label: "Hearing suddenly went down in one or both ears" },
  { value: "one_sided_tinnitus", label: "Tinnitus has moved to one side only" },
  { value: "pulsing_tinnitus", label: "Tinnitus beats in time with your heart" },
  { value: "severe_dizziness", label: "New dizziness that is severe, or much worse than usual" },
  { value: "facial_weakness", label: "Weakness, drooping or numbness in your face" },
  { value: "severe_headache", label: "A severe headache" },
] as const;

export type RedFlagQuestion = (typeof RED_FLAG_QUESTIONS)[number]["value"];

const QUESTION_VALUES = new Set<string>(RED_FLAG_QUESTIONS.map((question) => question.value));

export function isRedFlagQuestion(value: string): value is RedFlagQuestion {
  return QUESTION_VALUES.has(value);
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const scoresShape = Object.fromEntries(
  OUTCOMES.map((outcome) => [
    outcome.key,
    z
      .number()
      .min(outcome.min, `${outcome.label} cannot be below ${outcome.min}.`)
      .max(outcome.max, `${outcome.label} cannot be above ${outcome.max}.`)
      .nullable(),
  ]),
) as Record<OutcomeKey, z.ZodNullable<z.ZodNumber>>;

export const checkInSchema = z.object({
  scores: z.object(scoresShape),
  tags: z.array(z.string()).max(LAB_TAGS.length),
  newSymptoms: z.array(z.string()).max(RED_FLAG_QUESTIONS.length),
  adherence: z.array(
    z.object({
      experimentId: z.string().min(1),
      done: z.boolean(),
      timeDone: z
        .string()
        .regex(TIME, "Write the time as a 24-hour clock, like 07:30.")
        .nullable(),
    }),
  ),
  /** FREE TEXT — never exported for research. */
  note: z.string().max(NOTE_MAX_LENGTH, "Please keep the note under 1000 characters.").nullable(),
});

export type CheckInInput = z.infer<typeof checkInSchema>;

/**
 * Read a submitted check-in out of a form.
 *
 * Field names: `score-<outcomeKey>`, `tag`, `new`, `done-<experimentId>`, `time-<experimentId>`
 * and `note`. An empty score is null, not zero — "I did not answer" and "none at all" are
 * different facts, and the results would quietly average one as the other.
 *
 * `activeExperimentIds` comes from the server, never the form. A did-I-do-it box for an
 * experiment that is not this person's, or not running, is ignored rather than trusted.
 */
export function parseCheckInForm(formData: FormData, activeExperimentIds: readonly string[]) {
  const scores = {} as Record<OutcomeKey, number | null>;
  for (const outcome of OUTCOMES) {
    const raw = String(formData.get(`score-${outcome.key}`) ?? "").trim();
    const value = raw === "" ? null : Number(raw);
    scores[outcome.key] = value === null || Number.isFinite(value) ? value : Number.NaN;
  }

  const note = String(formData.get("note") ?? "").trim();

  return checkInSchema.safeParse({
    scores,
    tags: formData.getAll("tag").map(String).filter(isLabTag),
    newSymptoms: formData.getAll("new").map(String).filter(isRedFlagQuestion),
    adherence: activeExperimentIds.map((experimentId) => {
      const time = String(formData.get(`time-${experimentId}`) ?? "").trim();
      return {
        experimentId,
        done: formData.get(`done-${experimentId}`) === "on",
        timeDone: time === "" ? null : time,
      };
    }),
    note: note.length > 0 ? note : null,
  });
}
