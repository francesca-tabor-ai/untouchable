import "server-only";

import { scriptProblems } from "./script-rules";
import type { CourseSource } from "./types";

/**
 * Drafting a lesson script with a language model.
 *
 * **No model is wired up, and every lesson on the site today was written and checked by
 * hand.** The seam is here so that switching one on later is a provider, not a redesign.
 * Three things are fixed by this file whatever gets plugged in:
 *
 * 1. **The model is given a lesson outline and sources, never a person.** The brief rules
 *    out AI-generated insight about anybody's health, and this carve-out is narrow on purpose:
 *    a model may help explain how the body works. It is never shown a symptom, a condition
 *    somebody has told us about, or anything else from an account. See DECISIONS.md LC-01.
 * 2. **A draft is a draft.** `checkDraft` runs every rule in `script-rules.ts`; a draft
 *    that fails is not saved, and one that passes still needs an editor before anybody hears
 *    it. Detectors catch the phrasings we know about, not every wrong sentence.
 * 3. **Sources go in, not out.** The model is handed the sources and may not add its own. A
 *    citation a model produced from memory is a citation nobody has read.
 */

export interface LessonBrief {
  courseTitle: string;
  lessonTitle: string;
  summary: string;
  previousLessonTitle: string | null;
  nextLessonTitle: string | null;
  sources: CourseSource[];
}

export interface ScriptWriter {
  draft(brief: LessonBrief, rules: string): Promise<string>;
}

export class WriterUnavailable extends Error {
  constructor() {
    super("No script writer is configured.");
    this.name = "WriterUnavailable";
  }
}

class WriterUnavailableProvider implements ScriptWriter {
  async draft(): Promise<string> {
    throw new WriterUnavailable();
  }
}

let writer: ScriptWriter = new WriterUnavailableProvider();

export function setScriptWriter(next: ScriptWriter) {
  writer = next;
}

export function getScriptWriter(): ScriptWriter {
  return writer;
}

/** The system prompt a real writer is given. The detectors enforce the parts that can be enforced. */
export const WRITING_RULES = `You write one lesson of a spoken course about how the human body works. It will be read aloud by a voice engine and heard by someone on a walk, with nothing on a screen.

Write for the ear. No lists, no headings, no tables, no brackets, no symbols, no abbreviations. Spell every number the way a person says it. Short sentences, one idea at a time. Signpost: "There are three parts to this. The first is..."

Sound like a brilliant friend who happens to be a biologist. Warm, curious, calm. Use vivid everyday comparisons. Introduce each technical term gently: say it, say what it means, and use it again soon after.

Open with a question that makes the listener curious. Close with a short spoken recap and one line about what the next lesson explores.

This course is about the body, not the listener. Never tell them what they have, never tell them they are fine, never suggest what they should take or do about their health. Where a symptom can have serious causes, describe how doctors think about it, start with the most common explanations, say plainly how rare the serious ones are, and say which signs the NHS says to get checked promptly. Never frighten.

Never give a dose, an amount, or how often anything is taken.

Use only the sources you are given. Mention them lightly and in words, never read a citation aloud. If something is early or uncertain research, say so plainly. Do not add a fact you cannot trace to a source you were given.

British English.`;

export interface CheckedDraft {
  script: string;
  problems: string[];
}

/** Draft and check. The caller saves nothing with problems, and saves nothing as published. */
export async function draftLesson(brief: LessonBrief): Promise<CheckedDraft> {
  const script = await writer.draft(brief, WRITING_RULES);
  return { script, problems: scriptProblems(script) };
}
