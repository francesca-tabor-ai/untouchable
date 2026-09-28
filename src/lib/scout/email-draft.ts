import { z } from "zod";

import { askClaude, ClaudeUnavailableError } from "./claude";
import { templateDraft, type DraftInput, type EmailDraft } from "./email-template";
import { doseProblem } from "./language";

/**
 * A first draft of an email from the person to a researcher.
 *
 * **The app never sends it.** It produces text. The person reads it, changes it, and sends it
 * from their own email, to an address that was printed in the paper (see `contact.ts`). There
 * is no send button anywhere in this feature and there should never be one: a message about
 * somebody's health, to a stranger, goes when they decide and from an account they control.
 *
 * Without Claude it is a template, filled in from what they typed. With Claude it is the same
 * content, written more naturally. Either way it may contain only what they gave it — the
 * prompt says so, and the draft is shown for editing before anything else can happen to it.
 */

const DRAFT_JSON_SCHEMA = {
  type: "object",
  properties: {
    subject: { type: "string" },
    body: { type: "string" },
  },
  required: ["subject", "body"],
  additionalProperties: false,
} as const;

const SYSTEM = `You draft short, respectful emails from a patient to a medical researcher about one of
their papers. The patient will read, edit and send it themselves.

Rules:
- Use only the facts the patient gave. Do not add symptoms, history, treatments, feelings or
  claims they did not state. Do not add questions they did not ask.
- Under 200 words. Warm, plain, not gushing. British English.
- Introduce them as a patient with lived experience, reference the specific paper, ask their
  questions as they asked them, and mention willingness to take part in research only if they said so.
- Say plainly that they are not asking for medical advice about themselves.
- Never include a dose, an amount or a regimen of anything.
- Sign off with the name given, or with nothing if none was given.`;

export async function draftEmail(input: DraftInput): Promise<EmailDraft> {
  const template = templateDraft(input);
  try {
    const answer = await askClaude({
      system: SYSTEM,
      prompt: `Rewrite this draft so it reads naturally. Keep every fact and question; add none.

Subject: ${template.subject}

${template.body}`,
      schema: DRAFT_JSON_SCHEMA,
      parser: z.object({ subject: z.string().min(1).max(200), body: z.string().min(1).max(4000) }),
      maxTokens: 4_000,
    });
    // An email is the patient's own words to a researcher, so the advice check does not apply
    // to it. A dose does: rule 17 holds whoever is writing.
    if (doseProblem(answer.body) || doseProblem(answer.subject)) return template;
    return { subject: answer.subject, body: answer.body, written_by: "claude" };
  } catch (error) {
    if (error instanceof ClaudeUnavailableError) return template;
    throw error;
  }
}
