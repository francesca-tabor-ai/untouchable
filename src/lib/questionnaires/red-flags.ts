import type { QuestionnaireVersion } from "@/generated/prisma";

import type { Answers, AnswerValue } from "./answers";
import {
  QuestionnaireDefinitionError,
  redFlagRulesSchema,
  type RedFlagOperator,
  type RedFlagRule,
} from "./definition";

/**
 * Red flag evaluation.
 *
 * Brief 7.8. This function decides **nothing** about what anybody is shown. It reports which
 * of the version's rules matched this set of answers, in the order the version lists them,
 * and stops. It does not diagnose, does not rank, does not score, does not alert anyone,
 * does not contact anyone, and does not write anything to the database.
 *
 * The safety milestone consumes it:
 *
 * ```ts
 * const hits = evaluateRedFlags(version, answers);
 * if (hits.length > 0) {
 *   // show the signposting screen, record a SafetyEvent per hit.key
 * }
 * ```
 *
 * The version argument is structural, so a whole Prisma `QuestionnaireVersion` row satisfies
 * it and nothing here has to change when the safety screen is built.
 */

/**
 * Anything carrying a version's rules. A whole Prisma `QuestionnaireVersion` row is one, and
 * so is `{ redFlagRulesJson }` on its own — the type is structural so the safety milestone
 * can pass whichever it has without this file changing.
 */
export interface RedFlagSource {
  redFlagRulesJson: QuestionnaireVersion["redFlagRulesJson"] | unknown;
}

/** One rule that matched, with the answer that matched it. */
export interface RedFlagHit {
  /** The rule's key, e.g. "not_coping". Stable across versions if the admin keeps it so. */
  key: string;
  /** The question the rule watches. */
  itemKey: string;
  operator: RedFlagOperator;
  /** What the rule compares against, as the version writes it. Null for presence rules. */
  value: string | number | boolean | null;
  /** The answer that matched. Never free text — no rule may watch a free-text question. */
  answer: AnswerValue | null;
  /**
   * The version's own wording for what it noticed, to be shown back to the person. Written
   * as an observation, never as a conclusion.
   */
  message: string;
}

/**
 * Every rule on this version that matches these answers, and nothing else.
 *
 * Throws if the version's rules cannot be read. That is deliberate: a safety rule that
 * cannot be understood must stop the request, not quietly evaluate to "no flags". Brief
 * 7.8 — red-flag rules cannot be skipped silently.
 */
export function evaluateRedFlags(version: RedFlagSource, answers: Answers): RedFlagHit[] {
  return redFlagRules(version)
    .filter((rule) => matches(rule, answers))
    .map((rule) => ({
      key: rule.key,
      itemKey: rule.itemKey,
      operator: rule.operator,
      value: rule.value ?? null,
      answer: answers[rule.itemKey] ?? null,
      message: rule.message,
    }));
}

/** The version's rules, parsed. Exported so the admin preview can list them. */
export function redFlagRules(version: RedFlagSource): RedFlagRule[] {
  const parsed = redFlagRulesSchema.safeParse(version.redFlagRulesJson ?? []);
  if (!parsed.success) {
    throw new QuestionnaireDefinitionError({
      redFlags: "This version's red flag rules cannot be read, so its answers cannot be checked.",
    });
  }
  return parsed.data;
}

function matches(rule: RedFlagRule, answers: Answers): boolean {
  const answered = Object.prototype.hasOwnProperty.call(answers, rule.itemKey);
  if (rule.operator === "answered") return answered;
  if (rule.operator === "not_answered") return !answered;
  if (!answered) return false;

  const answer = answers[rule.itemKey];

  switch (rule.operator) {
    case "equals":
      return sameCode(answer, rule.value);
    case "not_equals":
      return !sameCode(answer, rule.value);
    case "includes":
      return Array.isArray(answer) && answer.some((entry) => sameCode(entry, rule.value));
    case "lt":
    case "lte":
    case "gt":
    case "gte": {
      if (typeof answer !== "number" || typeof rule.value !== "number") return false;
      if (rule.operator === "lt") return answer < rule.value;
      if (rule.operator === "lte") return answer <= rule.value;
      if (rule.operator === "gt") return answer > rule.value;
      return answer >= rule.value;
    }
  }
}

/**
 * Equality by answer code.
 *
 * A rule written as `value: 2` and an answer of `2` are the same answer, and so are
 * `value: "not_coping"` and `"not_coping"`. A list never equals a single code — use
 * `includes` for a question where more than one answer can be ticked.
 */
function sameCode(answer: AnswerValue | undefined, value: RedFlagRule["value"]): boolean {
  if (answer === undefined || value === undefined) return false;
  if (Array.isArray(answer)) return false;
  return String(answer) === String(value);
}
