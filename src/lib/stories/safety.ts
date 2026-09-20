/**
 * Sensitive-topic handling for stories.
 *
 * Suicide, self-harm and eating disorders are marked on the condition
 * (`Condition.isSensitiveTopic`). Where a story touches one, the Samaritans media
 * guidelines apply: a content note before the story, support signposting after it, and no
 * method detail anywhere. Brief section 5.2.
 *
 * The decision lives here, in one function, rather than being re-derived in each page —
 * a condition page and a story page must never disagree about whether a warning is needed.
 *
 * A story can also carry `needsSupportSignposting` on its own. Sensitivity usually belongs
 * to the condition, but not always: someone describing asking to be allowed to die while
 * recovering from a ruptured aneurysm needs support contacts on that page, and marking
 * brain aneurysms a sensitive topic to achieve it would put suicide signposting in front of
 * every reader who has one. Without this flag an editor's only choices were to publish the
 * passage unsupported or to cut it, and cutting it is what happened.
 */

export interface SensitiveSubject {
  conditions: { name: string; isSensitiveTopic: boolean }[];
  contentNote?: string | null;
  /** Set on the story itself when its contents need support contacts regardless. */
  needsSupportSignposting?: boolean | null;
}

/** True when a story touches a sensitive topic, or an editor has written a content note. */
export function needsContentNote(subject: SensitiveSubject): boolean {
  return (
    Boolean(subject.contentNote) ||
    Boolean(subject.needsSupportSignposting) ||
    subject.conditions.some((c) => c.isSensitiveTopic)
  );
}

/** True when support contacts belong at the foot of the page. */
export function needsSupportSignposting(subject: SensitiveSubject): boolean {
  return Boolean(subject.needsSupportSignposting) || subject.conditions.some((c) => c.isSensitiveTopic);
}

/**
 * The words shown above a story. An editor's own note is preferred — they know what is in
 * the piece — with a plain fallback so the note can never be missing.
 */
export function contentNoteText(subject: SensitiveSubject): string | null {
  if (!needsContentNote(subject)) return null;
  if (subject.contentNote) return subject.contentNote;

  const sensitive = subject.conditions.filter((c) => c.isSensitiveTopic).map((c) => c.name);
  const topics =
    sensitive.length > 0 ? sensitive.map((name) => name.toLowerCase()).join(" and ") : "health";

  return `This story talks about ${topics}. You do not have to read it now. Support is listed at the end of the page, and it is there any time.`;
}
