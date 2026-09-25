/**
 * The shape of a listening course.
 *
 * Field names follow the shared data contract in `docs/vibe-code-prompts/02-symptom-to-course-audio.md`,
 * in snake_case, so the records line up with the Research Scout's `Paper` in
 * `src/lib/scout/types.ts` without a translation layer. `source_paper_ids` holds those paper ids.
 *
 * **A course is about the body, never about the listener.** It is chosen from body systems,
 * not generated from somebody's symptoms, and nothing in a course record refers to a person.
 * That is what keeps it on the right side of AGENTS.md rule 9, and it is also why sending a
 * script to a voice provider sends no health data about anybody. See DECISIONS.md LC-01.
 */

import type { BodySystem } from "@/lib/conditions/body-systems";

export interface PronunciationEntry {
  /** The word as written in the script. */
  term: string;
  /** For the reader, stress in capitals: "COCK-lee-uh". */
  guide: string;
  /** What the voice engine is sent in place of the word. Lower case, so it is not spelled out. */
  spoken: string;
}

/** A reference a lesson drew on. Every one must be on an independent host — see `sources.ts`. */
export interface CourseSource {
  publisher: string;
  title: string;
  url: string;
  /** What this source was used for, so an editor can check the claim against it. */
  supports: string;
}

/**
 * Where a lesson's audio is.
 *
 * `not-written` — there is an outline entry and no script yet.
 * `not-voiced` — there is a script and no audio, which today is every lesson (no provider).
 */
export type AudioStatus = "not-written" | "not-voiced" | "queued" | "ready" | "failed";

export interface Lesson {
  id: string;
  module_id: string;
  order: number;
  slug: string;
  title: string;
  /** One line for the outline. Held to the same language rules as the script. */
  summary: string;
  /** Paragraphs separated by a blank line. Null until the lesson is written. */
  script_text: string | null;
  pronunciation_guide: PronunciationEntry[];
  audio_url: string | null;
  audio_status: AudioStatus;
  duration_sec: number | null;
  sources: CourseSource[];
  source_paper_ids: string[];
}

export interface CourseModule {
  id: string;
  course_id: string;
  order: number;
  title: string;
  summary: string;
  lessons: Lesson[];
}

/** A part of the body the course visits, for the map on the course page. */
export interface Structure {
  name: string;
  system: BodySystem;
  /** Plain words, one sentence. */
  about: string;
  lesson_ids: string[];
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  summary: string;
  /**
   * In the contract this is `input_symptoms`. It is renamed on purpose: these are the topics a
   * course covers, written by us, not anything a listener typed. See LC-01.
   */
  topics: string[];
  body_systems: BodySystem[];
  structures: Structure[];
  modules: CourseModule[];
  created_at: string;
}

export interface LessonProgress {
  lesson_id: string;
  position_sec: number;
  completed: boolean;
}
