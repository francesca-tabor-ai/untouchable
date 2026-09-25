import { z } from "zod";

/**
 * The email template: what a draft says when Claude is not asked, and the shape every draft
 * has. Kept apart from `email-draft.ts` so the browser can build a template without pulling
 * in the code that talks to Claude.
 */

export const draftInputSchema = z.object({
  researcherName: z.string().trim().min(1).max(200),
  paperTitle: z.string().trim().min(1).max(500),
  paperYear: z.string().trim().max(10).nullable(),
  paperJournal: z.string().trim().max(300).nullable(),
  paperDoi: z.string().trim().max(300).nullable(),
  /** In their own words: what they live with, and why this paper caught their eye. */
  aboutMe: z.string().trim().max(1200),
  /** One or two focused questions, their own. */
  questions: z.array(z.string().trim().min(1).max(500)).max(2),
  willingToTakePart: z.boolean(),
  signOff: z.string().trim().max(100),
  location: z.string().trim().max(100),
});

export type DraftInput = z.infer<typeof draftInputSchema>;

export interface EmailDraft {
  subject: string;
  body: string;
  written_by: "template" | "claude";
}

function citation(input: DraftInput): string {
  const parts = [`"${input.paperTitle}"`];
  if (input.paperJournal) parts.push(input.paperJournal);
  if (input.paperYear) parts.push(`(${input.paperYear})`);
  return parts.join(", ");
}

/** Their name as printed. Not "Dr", which would be a guess about somebody we know nothing of. */
function greeting(name: string): string {
  return `Dear ${name.trim()}`;
}

export function templateDraft(input: DraftInput): EmailDraft {
  const lines: string[] = [];
  lines.push(`${greeting(input.researcherName)},`, "");
  lines.push(`I read your paper ${citation(input)}${input.paperDoi ? ` (https://doi.org/${input.paperDoi})` : ""} and wanted to write to you as a patient.`);
  lines.push("");
  if (input.aboutMe) {
    lines.push(input.aboutMe, "");
  }
  if (input.questions.length === 1) {
    lines.push("If you have a moment, I would be grateful to know:", "", input.questions[0], "");
  } else if (input.questions.length === 2) {
    lines.push("If you have a moment, I would be grateful to know:", "", `1. ${input.questions[0]}`, `2. ${input.questions[1]}`, "");
  }
  if (input.willingToTakePart) {
    lines.push(
      `I would also be glad to take part in research on this${input.location ? `. I live in ${input.location}` : ""}, if there is a study I could help with.`,
      "",
    );
  }
  lines.push("I understand you cannot give medical advice about me, and I am not asking for any. Thank you for your time and for your work.", "");
  lines.push("With best wishes,", input.signOff || "");

  return {
    subject: `A question from a patient about your paper on ${shortTitle(input.paperTitle)}`,
    body: lines.join("\n").trim(),
    written_by: "template",
  };
}

function shortTitle(title: string): string {
  const clean = title.replace(/[.:].*$/, "");
  return clean.length > 70 ? `${clean.slice(0, 67)}…` : clean;
}
