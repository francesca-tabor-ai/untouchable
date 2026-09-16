import { z } from "zod";

/**
 * Input shapes for everything that writes to the stories hub.
 *
 * The rules here mirror the database constraints deliberately. The database is what keeps
 * us honest; these are what let an editor see the problem in the form instead of a 500.
 */

export const MAX_QUOTE_WORDS = 25;

export function countWords(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

const trimmed = (max: number) => z.string().trim().max(max);

export const slugSchema = z
  .string()
  .trim()
  .min(2, "A web address needs at least two characters.")
  .max(120)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lower-case letters, numbers and hyphens only, for example ada-lomond-breast-cancer.",
  );

export const sourceSchema = z.object({
  url: z.url("Give the full web address of the source, starting with https://"),
  title: trimmed(300).min(3, "Give the title of the source."),
  publisher: trimmed(200).min(2, "Give the publisher, for example the name of the programme."),
  publishedDate: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? new Date(value) : null))
    .refine((value) => value === null || !Number.isNaN(value.getTime()), {
      message: "That is not a date we can read. Use the date picker.",
    }),
  sourceType: z.enum(["interview", "own_social", "book", "podcast", "statement", "article"]),
});

export type SourceInput = z.infer<typeof sourceSchema>;

const keyMomentSchema = z.object({
  label: trimmed(120),
  when: trimmed(120),
  body: trimmed(600),
});

export const storyDraftSchema = z
  .object({
    type: z.enum(["public_figure", "community"]),
    publicFigureId: z
      .string()
      .trim()
      .optional()
      .transform((value) => value || null),
    disclosureType: z.enum(["own", "loved_one"]),
    title: trimmed(200).min(4, "Give the story a title."),
    slug: slugSchema,
    summary: trimmed(4000).min(
      80,
      "Write the summary in our own words — at least a short paragraph.",
    ),
    keyMoments: z.array(keyMomentSchema).max(12).default([]),
    quote: z
      .string()
      .trim()
      .max(600)
      .optional()
      .transform((value) => value || null),
    quoteSourceId: z
      .string()
      .trim()
      .optional()
      .transform((value) => value || null),
    contentNote: z
      .string()
      .trim()
      .max(600)
      .optional()
      .transform((value) => value || null),
    communityPermissionConfirmed: z.boolean().default(false),
    conditionIds: z
      .array(z.string().trim().min(1))
      .min(1, "Choose at least one condition this story is about."),
  })
  .superRefine((value, ctx) => {
    if (value.type === "public_figure" && !value.publicFigureId) {
      ctx.addIssue({
        code: "custom",
        path: ["publicFigureId"],
        message: "Choose the public figure this story is about.",
      });
    }
    if (value.type === "community" && value.publicFigureId) {
      ctx.addIssue({
        code: "custom",
        path: ["publicFigureId"],
        message: "A community story is not attached to a public figure.",
      });
    }
    if (value.quote && countWords(value.quote) > MAX_QUOTE_WORDS) {
      ctx.addIssue({
        code: "custom",
        path: ["quote"],
        message: `A quote can be at most ${MAX_QUOTE_WORDS} words. This one is ${countWords(value.quote)}. Summarise it in our own words instead.`,
      });
    }
    if (value.quote && !value.quoteSourceId) {
      ctx.addIssue({
        code: "custom",
        path: ["quoteSourceId"],
        message: "A quote has to say where it came from. Choose the source it is taken from.",
      });
    }
    if (!value.quote && value.quoteSourceId) {
      ctx.addIssue({
        code: "custom",
        path: ["quote"],
        message: "There is a source chosen for a quote, but no quote.",
      });
    }
  });

export type StoryDraftInput = z.input<typeof storyDraftSchema>;
export type StoryDraftValues = z.output<typeof storyDraftSchema>;

export const publicFigureSchema = z.object({
  name: trimmed(200).min(2, "Give the person's name."),
  slug: slugSchema,
  shortBio: trimmed(1000).min(20, "Write a short, neutral bio in our own words."),
  isDeceased: z.boolean().default(false),
});

export type PublicFigureInput = z.infer<typeof publicFigureSchema>;

/**
 * The public correction and removal form. Open to anyone: the person in the story, someone
 * representing them, or a reader who has spotted something wrong. We ask for as little as
 * we can and still be able to reply.
 */
export const takedownRequestSchema = z.object({
  storyId: z.string().trim().min(1, "Choose the story this is about."),
  type: z.enum(["correction", "removal"]),
  requesterName: trimmed(200).min(2, "Tell us your name so we know who we are replying to."),
  requesterEmail: z.email("We need an email address to reply to."),
  relationship: trimmed(200).min(2, "Tell us how you are connected to this story."),
  reason: trimmed(4000).min(10, "Tell us what is wrong, or what you would like removed."),
});

export type TakedownRequestInput = z.infer<typeof takedownRequestSchema>;

export const takedownResolutionSchema = z.object({
  requestId: z.string().trim().min(1),
  status: z.enum(["actioned", "declined"]),
  resolutionNote: trimmed(2000).min(3, "Record what was decided, and why."),
});

/** The public index: a condition filter and a free-text search, both optional. */
export const storySearchSchema = z.object({
  q: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => value || undefined),
  condition: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => value || undefined),
});

export type StorySearchInput = z.infer<typeof storySearchSchema>;

/** Turn a Zod error into `{ field: message }` for a form. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}
