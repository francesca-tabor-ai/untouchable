import { z } from "zod";

/**
 * A questionnaire version, as data.
 *
 * Brief 7.3: questionnaires are defined in the database, not in code. An admin publishes a
 * new version without a deployment, and nothing in this file knows anything about any
 * particular questionnaire. The seeded `general-wellbeing` placeholder is just the first
 * row that happens to exist.
 *
 * Everything here is pure. It parses JSON into shapes the rest of the engine can rely on,
 * and it refuses anything it cannot make sense of — a version that does not parse is never
 * published, so a person is never shown a form the engine cannot score or validate.
 *
 * Nothing in this file interprets an answer or a score. It validates shape, nothing more.
 */

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

/** The item types the brief asks for, and the only ones the renderer knows how to draw. */
export const ITEM_TYPES = [
  "likert",
  "scale_0_10",
  "single_choice",
  "multi_choice",
  "yes_no",
  "date",
  "text",
] as const;

export type ItemType = (typeof ITEM_TYPES)[number];

/** Item types whose answer is a number, and so can be summed or averaged directly. */
export const NUMERIC_ITEM_TYPES: readonly ItemType[] = ["likert", "scale_0_10"];

/** Free text is only ever shown back to the person who wrote it, and is never exported. */
export const FREE_TEXT_ITEM_TYPES: readonly ItemType[] = ["text"];

const itemKey = z
  .string()
  .regex(/^[a-z][a-z0-9_]*$/, "Use lower case letters, numbers and underscores, starting with a letter.");

const label = z.string().trim().min(1, "Every question needs a label.");
const help = z.string().trim().min(1).optional();

const baseItem = {
  key: itemKey,
  label,
  help,
  /**
   * Whether an answer must be given. Defaults to false: forcing an answer out of someone who
   * does not want to give one is the wrong default for a health questionnaire.
   */
  required: z.boolean().default(false),
};

/** Options for a Likert item carry a number, because a Likert scale is scored. */
const likertOption = z.object({
  value: z.number().finite(),
  label,
});

/** Options for a choice item carry an opaque code. It is never treated as a number. */
const choiceOption = z.object({
  value: z.string().trim().min(1),
  label,
});

const likertItem = z.object({
  ...baseItem,
  type: z.literal("likert"),
  options: z.array(likertOption).min(2, "A Likert scale needs at least two points."),
});

const scaleItem = z.object({
  ...baseItem,
  type: z.literal("scale_0_10"),
  /** Bounds of the scale itself. Whole numbers only — people answer these with a thumb. */
  min: z.number().int().default(0),
  max: z.number().int().default(10),
});

const singleChoiceItem = z.object({
  ...baseItem,
  type: z.literal("single_choice"),
  options: z.array(choiceOption).min(2, "A choice needs at least two options."),
});

const multiChoiceItem = z.object({
  ...baseItem,
  type: z.literal("multi_choice"),
  options: z.array(choiceOption).min(2, "A choice needs at least two options."),
  /** Fewest and most options that may be ticked. Not the bounds of a scale. */
  min: z.number().int().min(0).optional(),
  max: z.number().int().min(1).optional(),
});

const yesNoItem = z.object({ ...baseItem, type: z.literal("yes_no") });

const dateItem = z.object({ ...baseItem, type: z.literal("date") });

const textItem = z.object({
  ...baseItem,
  type: z.literal("text"),
  /** Longest answer accepted, in characters. "Short free text", so the default is short. */
  max: z.number().int().min(1).max(2000).default(500),
});

export const itemSchema = z.discriminatedUnion("type", [
  likertItem,
  scaleItem,
  singleChoiceItem,
  multiChoiceItem,
  yesNoItem,
  dateItem,
  textItem,
]);

export type Item = z.infer<typeof itemSchema>;
export type LikertItem = z.infer<typeof likertItem>;
export type ScaleItem = z.infer<typeof scaleItem>;
export type SingleChoiceItem = z.infer<typeof singleChoiceItem>;
export type MultiChoiceItem = z.infer<typeof multiChoiceItem>;
export type TextItem = z.infer<typeof textItem>;

export const itemsSchema = z
  .array(itemSchema)
  .min(1, "A questionnaire needs at least one question.")
  .superRefine((items, ctx) => {
    const seen = new Set<string>();
    items.forEach((item, index) => {
      if (seen.has(item.key)) {
        ctx.addIssue({
          code: "custom",
          path: [index, "key"],
          message: `Two questions both use the key "${item.key}". Keys must be unique.`,
        });
      }
      seen.add(item.key);
      if (item.type === "scale_0_10" && item.min >= item.max) {
        ctx.addIssue({
          code: "custom",
          path: [index, "max"],
          message: "The top of a scale must be higher than the bottom.",
        });
      }
      if (item.type === "multi_choice") {
        if (item.min !== undefined && item.min > item.options.length) {
          ctx.addIssue({
            code: "custom",
            path: [index, "min"],
            message: "You cannot ask for more answers than there are options.",
          });
        }
        if (item.min !== undefined && item.max !== undefined && item.min > item.max) {
          ctx.addIssue({
            code: "custom",
            path: [index, "max"],
            message: "The most answers allowed must not be fewer than the fewest required.",
          });
        }
      }
      if ("options" in item) {
        const values = new Set<string>();
        item.options.forEach((option, optionIndex) => {
          const asText = String(option.value);
          if (values.has(asText)) {
            ctx.addIssue({
              code: "custom",
              path: [index, "options", optionIndex, "value"],
              message: `Two options both use the value "${asText}".`,
            });
          }
          values.add(asText);
        });
      }
    });
  });

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

const scaleBounds = z.object({ min: z.number(), max: z.number() });

export const scoringSchema = z.discriminatedUnion("method", [
  /** No score at all. A real answer for a questionnaire that only collects answers. */
  z.object({ method: z.literal("none") }),
  z.object({
    method: z.literal("sum"),
    items: z.array(itemKey).min(1, "Say which questions the score is made from."),
    scale: scaleBounds.optional(),
  }),
  z.object({
    method: z.literal("mean"),
    items: z.array(itemKey).min(1, "Say which questions the score is made from."),
    scale: scaleBounds.optional(),
  }),
  z.object({
    method: z.literal("map"),
    items: z.array(itemKey).min(1, "Say which questions the score is made from."),
    /** { itemKey: { answerValue: number } }. Anything not listed does not count. */
    mapping: z.record(z.string(), z.record(z.string(), z.number().finite())),
    /** How the mapped numbers are combined. Summed unless you say otherwise. */
    aggregate: z.enum(["sum", "mean"]).default("sum"),
    scale: scaleBounds.optional(),
  }),
]);

export type Scoring = z.infer<typeof scoringSchema>;

// ---------------------------------------------------------------------------
// Red flag rules
// ---------------------------------------------------------------------------

/**
 * Red flags are about getting someone support. They are never a diagnosis, and matching one
 * says nothing at all about what is wrong with anybody. A rule matching means one thing:
 * offer this person the signposting screen.
 */
export const RED_FLAG_OPERATORS = [
  "equals",
  "not_equals",
  "lt",
  "lte",
  "gt",
  "gte",
  "includes",
  "answered",
  "not_answered",
] as const;

export type RedFlagOperator = (typeof RED_FLAG_OPERATORS)[number];

/** Operators that compare against a number, and so only make sense on a numeric item. */
export const COMPARISON_OPERATORS: readonly RedFlagOperator[] = ["lt", "lte", "gt", "gte"];

/** Operators that do not look at the answer's content at all. */
export const PRESENCE_OPERATORS: readonly RedFlagOperator[] = ["answered", "not_answered"];

export const redFlagRuleSchema = z.object({
  key: z.string().trim().min(1, "Every rule needs a key."),
  itemKey,
  operator: z.enum(RED_FLAG_OPERATORS),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
  /**
   * What the signposting screen says this rule noticed, in the person's own words back to
   * them. Never an interpretation: "You have said you are not coping at all", not "You are
   * depressed".
   */
  message: z.string().trim().min(1, "Every rule needs a message."),
});

export type RedFlagRule = z.infer<typeof redFlagRuleSchema>;

export const redFlagRulesSchema = z.array(redFlagRuleSchema).superRefine((rules, ctx) => {
  const seen = new Set<string>();
  rules.forEach((rule, index) => {
    if (seen.has(rule.key)) {
      ctx.addIssue({
        code: "custom",
        path: [index, "key"],
        message: `Two rules both use the key "${rule.key}".`,
      });
    }
    seen.add(rule.key);
    if (!PRESENCE_OPERATORS.includes(rule.operator) && rule.value === undefined) {
      ctx.addIssue({
        code: "custom",
        path: [index, "value"],
        message: `The "${rule.operator}" rule needs a value to compare against.`,
      });
    }
  });
});

// ---------------------------------------------------------------------------
// Schedule
// ---------------------------------------------------------------------------

/**
 * When this questionnaire is asked. Read by the check-in scheduling milestone; nothing in
 * this milestone acts on `afterTreatmentDays`, `thenEveryDays` or `generalEveryDays`.
 */
export const scheduleSchema = z.object({
  /** Asked once during onboarding, as the fixed point everything later is compared to. */
  baseline: z.boolean().default(false),
  /** Days after a treatment start date, e.g. [14, 90, 180]. */
  afterTreatmentDays: z.array(z.number().int().min(0)).default([]),
  /** After the list above runs out, repeat this often. Null means stop. */
  thenEveryDays: z.number().int().min(1).nullable().default(null),
  /** The cycle that runs whether or not there is a treatment. Null means never. */
  generalEveryDays: z.number().int().min(1).nullable().default(null),
});

export type Schedule = z.infer<typeof scheduleSchema>;

// ---------------------------------------------------------------------------
// A whole version
// ---------------------------------------------------------------------------

export interface QuestionnaireDefinition {
  items: Item[];
  scoring: Scoring;
  redFlags: RedFlagRule[];
  schedule: Schedule;
}

/** The four JSON columns of a `QuestionnaireVersion` row, before they are understood. */
export interface RawDefinition {
  itemsJson: unknown;
  scoringJson: unknown;
  redFlagRulesJson?: unknown;
  scheduleJson?: unknown;
}

/** Problems with a definition, keyed by the field the admin form shows. */
export type DefinitionProblems = Partial<
  Record<"items" | "scoring" | "redFlags" | "schedule", string>
>;

export class QuestionnaireDefinitionError extends Error {
  constructor(readonly problems: DefinitionProblems) {
    super(`This questionnaire version cannot be read: ${Object.values(problems).join(" ")}`);
    this.name = "QuestionnaireDefinitionError";
  }
}

function firstProblem(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Something about this is not right.";
  const where = issue.path.length > 0 ? `${issue.path.map(String).join(" → ")}: ` : "";
  return `${where}${issue.message}`;
}

/**
 * Read a version's JSON, or say exactly what is wrong with it.
 *
 * Returns problems rather than throwing, because the admin screen shows them next to the
 * field they belong to. `parseDefinition` is the throwing version for code paths where a
 * broken definition is a bug rather than something a person typed.
 */
export function readDefinition(
  raw: RawDefinition,
): { ok: true; definition: QuestionnaireDefinition } | { ok: false; problems: DefinitionProblems } {
  const problems: DefinitionProblems = {};

  const items = itemsSchema.safeParse(raw.itemsJson);
  if (!items.success) problems.items = firstProblem(items.error);

  const scoring = scoringSchema.safeParse(raw.scoringJson);
  if (!scoring.success) problems.scoring = firstProblem(scoring.error);

  const redFlags = redFlagRulesSchema.safeParse(raw.redFlagRulesJson ?? []);
  if (!redFlags.success) problems.redFlags = firstProblem(redFlags.error);

  const schedule = scheduleSchema.safeParse(raw.scheduleJson ?? {});
  if (!schedule.success) problems.schedule = firstProblem(schedule.error);

  if (!items.success || !scoring.success || !redFlags.success || !schedule.success) {
    return { ok: false, problems };
  }

  const definition: QuestionnaireDefinition = {
    items: items.data,
    scoring: scoring.data,
    redFlags: redFlags.data,
    schedule: schedule.data,
  };

  const cross = crossCheck(definition);
  if (Object.keys(cross).length > 0) return { ok: false, problems: cross };

  return { ok: true, definition };
}

export function parseDefinition(raw: RawDefinition): QuestionnaireDefinition {
  const result = readDefinition(raw);
  if (!result.ok) throw new QuestionnaireDefinitionError(result.problems);
  return result.definition;
}

/**
 * The checks that need the whole definition at once: a score cannot be built from a question
 * that does not exist, an average cannot be taken over a label, and a red flag rule must not
 * be pointed at somebody's free text.
 *
 * This is what makes "an admin publishes a new version with no code change" safe. Anything
 * caught here is caught before publication, not the first time somebody answers.
 */
function crossCheck(definition: QuestionnaireDefinition): DefinitionProblems {
  const problems: DefinitionProblems = {};
  const byKey = new Map(definition.items.map((item) => [item.key, item]));

  const { scoring } = definition;
  if (scoring.method !== "none") {
    for (const key of scoring.items) {
      const item = byKey.get(key);
      if (!item) {
        problems.scoring = `The score uses "${key}", which is not one of the questions.`;
        break;
      }
      if (scoring.method === "map") {
        if (!scoring.mapping[key]) {
          problems.scoring = `The score maps answers to numbers, but there is no mapping for "${key}".`;
          break;
        }
        const allowed = allowedAnswerCodes(item);
        if (allowed) {
          const unknown = Object.keys(scoring.mapping[key]).find((code) => !allowed.has(code));
          if (unknown) {
            problems.scoring = `The mapping for "${key}" mentions "${unknown}", which is not one of its answers.`;
            break;
          }
        }
        continue;
      }
      if (!NUMERIC_ITEM_TYPES.includes(item.type)) {
        problems.scoring =
          `"${key}" is a ${item.type} question, so a ${scoring.method} cannot be taken over it. ` +
          `Use the map method to give each answer a number first.`;
        break;
      }
    }
  }

  definition.redFlags.forEach((rule) => {
    if (problems.redFlags) return;
    const item = byKey.get(rule.itemKey);
    if (!item) {
      problems.redFlags = `The rule "${rule.key}" watches "${rule.itemKey}", which is not one of the questions.`;
      return;
    }
    if (FREE_TEXT_ITEM_TYPES.includes(item.type)) {
      problems.redFlags =
        `The rule "${rule.key}" watches "${rule.itemKey}", which is free text. ` +
        `Free text is only ever seen by the person who wrote it, so no rule may read it.`;
      return;
    }
    if (COMPARISON_OPERATORS.includes(rule.operator)) {
      if (!NUMERIC_ITEM_TYPES.includes(item.type)) {
        problems.redFlags = `The rule "${rule.key}" compares "${rule.itemKey}" as a number, but that question is not answered with one.`;
        return;
      }
      if (typeof rule.value !== "number") {
        problems.redFlags = `The rule "${rule.key}" compares against "${String(rule.value)}", which is not a number.`;
        return;
      }
    }
    if (rule.operator === "includes" && item.type !== "multi_choice") {
      problems.redFlags = `The rule "${rule.key}" uses "includes", which only works on a question where more than one answer can be ticked.`;
      return;
    }
    if (
      (rule.operator === "equals" || rule.operator === "not_equals") &&
      "options" in item &&
      !allowedAnswerCodes(item)?.has(String(rule.value))
    ) {
      problems.redFlags = `The rule "${rule.key}" looks for "${String(rule.value)}", which is not one of the answers to "${rule.itemKey}".`;
    }
  });

  return problems;
}

/** Every answer code an item accepts, as text, or null when the set is not a fixed list. */
function allowedAnswerCodes(item: Item): Set<string> | null {
  if ("options" in item) return new Set(item.options.map((option) => String(option.value)));
  if (item.type === "yes_no") return new Set(["true", "false"]);
  return null;
}
