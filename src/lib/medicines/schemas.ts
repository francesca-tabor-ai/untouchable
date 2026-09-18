import { z } from "zod";

import { doseLanguageMessage, doseLanguageProblem } from "./dose-language";

/**
 * Input shapes for linking a story to a medicine, and for adding a medicine an editor
 * cannot find in the list.
 *
 * Two rules are enforced here rather than left to the reviewer:
 *
 * - **Nothing dose-shaped.** The context line and the plain-English summary both go through
 *   the dose detector. AGENTS.md rule 15.
 * - **160 characters of context.** The same cap the database has. A phrase cannot become a
 *   regimen if there is no room for one.
 */

/** Matches the CHECK constraint in 20260918100000_story_interventions. */
export const MAX_CONTEXT_LENGTH = 160;

const noDoseLanguage = (value: string, ctx: z.RefinementCtx) => {
  const problem = doseLanguageProblem(value);
  if (problem) ctx.addIssue({ code: "custom", message: doseLanguageMessage(problem) });
};

export const medicineSlugSchema = z
  .string()
  .trim()
  .min(2, "A web address needs at least two characters.")
  .max(120)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lower-case letters, numbers and hyphens only, for example nitrazepam.",
  );

/** One story-to-medicine link. */
export const storyMedicineSchema = z.object({
  storyId: z.string().trim().min(1, "That story no longer exists."),
  interventionId: z.string().trim().min(1, "Choose a medicine or treatment."),
  /** One of the sources already on this story, or nothing. */
  sourceId: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || null),
  context: z
    .string()
    .trim()
    .max(
      MAX_CONTEXT_LENGTH,
      `Keep this to ${MAX_CONTEXT_LENGTH} characters — a phrase, not a paragraph.`,
    )
    .optional()
    .transform((value) => value || null)
    .superRefine((value, ctx) => {
      if (value) noDoseLanguage(value, ctx);
    }),
});

export type StoryMedicineInput = z.infer<typeof storyMedicineSchema>;

/**
 * A medicine an editor is adding because it is not in the list.
 *
 * The summary is required, unlike the database column, because a medicine with no summary
 * is not publishable — `src/lib/medicines/queries.ts` will not show one. Making it required
 * here means an editor finds that out while they are looking at the form.
 */
export const medicineSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Give the name of the medicine or treatment.")
    .max(200)
    .superRefine(noDoseLanguage),
  slug: medicineSlugSchema,
  type: z.enum(["rx", "otc", "supplement", "device", "non_drug"]),
  summary: z
    .string()
    .trim()
    .min(
      60,
      "Write what it is in plain English, in our own words, from the NHS, the BNF or the electronic Medicines Compendium. A sentence or two.",
    )
    .max(2000)
    .superRefine(noDoseLanguage),
  isSensitiveTopic: z.boolean().default(false),
});

export type MedicineInput = z.infer<typeof medicineSchema>;

/** Removing a link. */
export const removeStoryMedicineSchema = z.object({
  storyId: z.string().trim().min(1),
  interventionId: z.string().trim().min(1),
});

/** Turn a name into the web address we would suggest for it. */
export function suggestMedicineSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
