/**
 * Editorial rule failures, in language an editor can act on.
 *
 * Two layers enforce the same rules: this module checks them before writing, and the
 * database refuses them anyway (see prisma/migrations/.../publishing_and_safety_constraints).
 * The database is the layer a future refactor cannot forget, so it must stay — but a
 * Postgres check violation reaching a form as a stack trace is a bug in its own right.
 * `asStoryRuleError` turns one back into a sentence.
 */

export class StoryRuleError extends Error {
  /** The form field the message belongs beside, where there is one. */
  readonly field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.name = "StoryRuleError";
    this.field = field;
  }
}

/** Constraint or trigger name → the message an editor should see. */
const DATABASE_RULES: { match: string; message: string; field?: string }[] = [
  {
    match: "story_published_requires_second_editor",
    message:
      "A story needs a second editor. The person who drafted it cannot also be the one who verifies and publishes it.",
  },
  {
    match: "without at least one source",
    message: "A story cannot be published without at least one source.",
    field: "sources",
  },
  {
    match: "Cannot remove the only source of a published story",
    message:
      "This is the only source on a published story, so it cannot be removed. Retract the story first.",
    field: "sources",
  },
  {
    match: "community_story_published_requires_permission",
    message:
      "A community story can only be published once written permission from the person has been confirmed.",
    field: "communityPermissionConfirmed",
  },
  {
    match: "quote_length_limit",
    message: "A quote can be at most 25 words. Shorten it, or summarise it in our own words.",
    field: "quote",
  },
  {
    match: "quote_requires_source",
    message: "A quote has to say where it came from. Choose the source it is taken from.",
    field: "quoteSourceId",
  },
  {
    match: "story_type_matches_subject",
    message:
      "A story about a public figure must name one, and a community story must not be attached to one.",
    field: "publicFigureId",
  },
  {
    match: "figure_image_requires_licence",
    message: "An image cannot be stored without its licence terms recorded.",
    field: "imageLicence",
  },
  {
    match: "Story_slug_key",
    message: "Another story already uses that web address. Change the title or the slug.",
    field: "slug",
  },
];

/**
 * Recognise a database-enforced editorial rule and return it as a readable error.
 * Returns null for anything else, which should be re-thrown as the fault it is.
 */
export function asStoryRuleError(error: unknown): StoryRuleError | null {
  if (error instanceof StoryRuleError) return error;

  const message = error instanceof Error ? error.message : String(error ?? "");
  const rule = DATABASE_RULES.find((candidate) => message.includes(candidate.match));
  if (!rule) return null;

  return new StoryRuleError(rule.message, rule.field);
}

/**
 * Run a write and present any editorial rule failure as a `StoryRuleError`. Anything we do
 * not recognise is a real fault and is left alone.
 */
export async function withRuleErrors<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    const ruleError = asStoryRuleError(error);
    if (ruleError) throw ruleError;
    throw error;
  }
}
