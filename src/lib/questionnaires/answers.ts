import type { Item } from "./definition";

/**
 * Answers, and the check that an answer set really is an answer to the version it claims to
 * be an answer to.
 *
 * Brief 7.3 and AGENTS.md: a response is always tied to the exact version answered. That is
 * only worth anything if the answers actually fit that version, so nothing is written until
 * it has been through here. An answer set that does not match is rejected, not stored.
 *
 * Pure. No database, no session, no opinion about what any answer means.
 */

/** One answer. The shape depends on the item type, and only on the item type. */
export type AnswerValue = number | string | boolean | string[];

/** `{ itemKey: value }`, exactly as it is stored in `Response.answersJson`. */
export type Answers = Record<string, AnswerValue>;

/** What a person typed, before we know whether it makes sense. */
export type RawAnswers = Record<string, unknown>;

/** Problems keyed by item key, so the form can show each one beside its own question. */
export type AnswerProblems = Record<string, string>;

export type AnswerValidation =
  | { ok: true; answers: Answers }
  | { ok: false; problems: AnswerProblems };

export class AnswerValidationError extends Error {
  constructor(readonly problems: AnswerProblems) {
    super("These answers do not match the questions that were asked.");
    this.name = "AnswerValidationError";
  }
}

export interface ValidateOptions {
  /**
   * Skip the "you have not answered this yet" checks, keeping everything else.
   *
   * Used for a half-finished draft: somebody put their phone down in a waiting room, and we
   * keep what they had written. A draft is never scored and never becomes a response — the
   * full check runs again when they finish.
   */
  partial?: boolean;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Check a set of answers against a version's items.
 *
 * Anything not asked for is a rejection rather than something we quietly drop: an answer to
 * a question this version does not contain means the form and the version have come apart,
 * and storing it would put something in someone's record that nobody ever asked them.
 */
export function validateAnswers(
  items: Item[],
  raw: RawAnswers,
  options: ValidateOptions = {},
): AnswerValidation {
  const problems: AnswerProblems = {};
  const answers: Answers = {};
  const known = new Set(items.map((item) => item.key));

  for (const key of Object.keys(raw)) {
    if (!known.has(key)) {
      problems[key] = `"${key}" is not one of the questions in this version.`;
    }
  }

  for (const item of items) {
    const supplied = raw[item.key];
    if (isMissing(supplied)) {
      if (item.required && !options.partial) {
        problems[item.key] = missingMessage(item);
      }
      continue;
    }

    const result = coerce(item, supplied);
    if ("problem" in result) {
      problems[item.key] = result.problem;
      continue;
    }
    if (result.value === undefined) {
      // Coerced away to nothing — free text that was only spaces, for instance.
      if (item.required && !options.partial) problems[item.key] = missingMessage(item);
      continue;
    }
    answers[item.key] = result.value;
  }

  if (Object.keys(problems).length > 0) return { ok: false, problems };
  return { ok: true, answers };
}

/** The throwing version, for callers where a mismatch is a bug and not a person's typo. */
export function assertAnswers(items: Item[], raw: RawAnswers, options: ValidateOptions = {}): Answers {
  const result = validateAnswers(items, raw, options);
  if (!result.ok) throw new AnswerValidationError(result.problems);
  return result.answers;
}

function isMissing(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

function missingMessage(item: Item): string {
  switch (item.type) {
    case "multi_choice":
      return "Please tick at least one answer.";
    case "date":
      return "Please give a date.";
    case "text":
      return "Please write something here.";
    default:
      return "Please answer this one.";
  }
}

type Coerced = { value: AnswerValue | undefined } | { problem: string };

function coerce(item: Item, supplied: unknown): Coerced {
  switch (item.type) {
    case "scale_0_10": {
      const number = toNumber(supplied);
      if (number === null || !Number.isInteger(number)) {
        return { problem: `Please choose a whole number between ${item.min} and ${item.max}.` };
      }
      if (number < item.min || number > item.max) {
        return { problem: `Please choose a number between ${item.min} and ${item.max}.` };
      }
      return { value: number };
    }

    case "likert": {
      const number = toNumber(supplied);
      const match = item.options.find((option) => option.value === number);
      if (number === null || !match) return { problem: "Please choose one of the answers listed." };
      return { value: number };
    }

    case "single_choice": {
      if (typeof supplied !== "string") return { problem: "Please choose one of the answers listed." };
      const match = item.options.find((option) => option.value === supplied);
      if (!match) return { problem: "Please choose one of the answers listed." };
      return { value: supplied };
    }

    case "multi_choice": {
      const list = Array.isArray(supplied) ? supplied : [supplied];
      const chosen: string[] = [];
      for (const entry of list) {
        if (typeof entry !== "string") return { problem: "Please choose from the answers listed." };
        if (!item.options.some((option) => option.value === entry)) {
          return { problem: "Please choose from the answers listed." };
        }
        if (!chosen.includes(entry)) chosen.push(entry);
      }
      if (chosen.length === 0) return { value: undefined };
      if (item.min !== undefined && chosen.length < item.min) {
        return { problem: `Please tick at least ${item.min}.` };
      }
      if (item.max !== undefined && chosen.length > item.max) {
        return { problem: `Please tick no more than ${item.max}.` };
      }
      return { value: chosen };
    }

    case "yes_no": {
      const bool = toBoolean(supplied);
      if (bool === null) return { problem: "Please answer yes or no." };
      return { value: bool };
    }

    case "date": {
      if (typeof supplied !== "string" || !DATE_PATTERN.test(supplied.trim())) {
        return { problem: "Please give the date as a day, month and year." };
      }
      const text = supplied.trim();
      const parsed = new Date(`${text}T00:00:00Z`);
      if (Number.isNaN(parsed.getTime()) || !parsed.toISOString().startsWith(text)) {
        return { problem: "That is not a date that exists." };
      }
      return { value: text };
    }

    case "text": {
      if (typeof supplied !== "string") return { problem: "Please write your answer as text." };
      const text = supplied.trim();
      if (text === "") return { value: undefined };
      if (text.length > item.max) {
        return { problem: `Please keep this to ${item.max} characters or fewer.` };
      }
      return { value: text };
    }
  }
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return null;
  const text = value.trim().toLowerCase();
  if (["true", "yes", "on", "1"].includes(text)) return true;
  if (["false", "no", "off", "0"].includes(text)) return false;
  return null;
}

/**
 * Read `Response.answersJson` back out. The column is `Json`, so as far as types go it could
 * be anything; this is the one place that turns it into `Answers`.
 */
export function answersFrom(stored: unknown): Answers {
  if (stored === null || typeof stored !== "object" || Array.isArray(stored)) return {};
  return stored as Answers;
}
