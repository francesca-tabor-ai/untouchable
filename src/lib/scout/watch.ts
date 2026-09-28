import type { Paper, SavedPaper, WatchTopic } from "./types";

/**
 * Watch topics and the course hand-off: the pure parts, with no storage and no network, so
 * they can be tested on their own.
 *
 * **Watching is checked when the page is opened, at most once a week.** Topics live on the
 * device (DECISIONS.md RS-03), so there is no server that could run them on a schedule — and
 * a server that searched someone's health questions every Monday while they were not looking
 * would be holding those questions, which is the thing we chose not to do. The page says this
 * in those words, so nobody waits for an alert that is never coming.
 */

export const WATCH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

export function isDue(topic: WatchTopic, now = new Date()): boolean {
  if (!topic.last_run) return true;
  return now.getTime() - new Date(topic.last_run).getTime() >= WATCH_INTERVAL_MS;
}

/**
 * The topic after a run. New means "not seen at the last visit"; the first run marks nothing
 * as new, because everything would be.
 */
export function afterRun(topic: WatchTopic, papers: Paper[], now = new Date()): WatchTopic {
  const ids = papers.map((paper) => paper.id);
  const seen = new Set(topic.seen_ids);
  const fresh = topic.last_run === null ? [] : ids.filter((id) => !seen.has(id));
  const newIds = [...new Set([...topic.new_ids, ...fresh])];
  return {
    ...topic,
    last_run: now.toISOString(),
    seen_ids: [...new Set([...topic.seen_ids, ...ids])].slice(-500),
    new_ids: newIds,
    new_count: newIds.length,
  };
}

/** Once somebody has looked, the new papers are no longer new. */
export function markSeen(topic: WatchTopic): WatchTopic {
  return { ...topic, new_ids: [], new_count: 0 };
}

/**
 * What goes to the Course Generator.
 *
 * The contract is the one in the prompts: lessons carry `source_paper_ids[]`, and the papers
 * travel with them so the generator can cite and link each one without another search. Notes
 * are left out: they are the person's own thoughts, and a course is a different place.
 */
export interface CourseHandoff {
  kind: "untouchable.research-scout.course-handoff";
  version: 1;
  created_at: string;
  topic: string;
  source_paper_ids: string[];
  papers: Omit<Paper, "notes" | "saved">[];
}

export function courseHandoff(topic: string, saved: Pick<SavedPaper, "paper">[], now = new Date()): CourseHandoff {
  const papers = saved.map(({ paper }) => {
    const { notes: _notes, saved: _saved, ...rest } = paper;
    return rest;
  });
  return {
    kind: "untouchable.research-scout.course-handoff",
    version: 1,
    created_at: now.toISOString(),
    topic: topic.trim(),
    source_paper_ids: papers.map((paper) => paper.id),
    papers,
  };
}
