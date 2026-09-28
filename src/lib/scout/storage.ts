"use client";

import { z } from "zod";

import { savedPaperSchema, watchTopicSchema, type Paper, type SavedPaper, type WatchTopic } from "./types";

/**
 * Where the reading list, notes and watch topics live: this device, and nowhere else.
 *
 * What somebody saves and writes beside a paper about their own condition is health data, and
 * so are the questions they watch. Keeping it in the browser means none of it reaches our
 * servers, and it needs no change to `prisma/schema.prisma`, which is single-writer. The same
 * call the Food Advisor made (FA-02); see DECISIONS.md RS-03.
 *
 * The cost is on the screen, not buried: clearing the browser clears the list, and it does
 * not follow somebody to their phone. There is an export.
 *
 * Shaped like `src/lib/food/storage.ts`: a small external store for `useSyncExternalStore`,
 * a cached snapshot so identity only changes when the data does, and the `storage` event so
 * two tabs agree.
 */

const KEY = "untouchable.scout.v1";

const storeSchema = z.object({
  saved: z.array(savedPaperSchema),
  watches: z.array(watchTopicSchema),
  /** Paper ids chosen for the next course. */
  course: z.array(z.string()),
});

export type ScoutStore = z.infer<typeof storeSchema>;

export const EMPTY_STORE: ScoutStore = { saved: [], watches: [], course: [] };

let cache: ScoutStore | null = null;
const listeners = new Set<() => void>();

function read(): ScoutStore {
  if (typeof window === "undefined") return EMPTY_STORE;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY_STORE;
    const parsed = storeSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : EMPTY_STORE;
  } catch {
    return EMPTY_STORE;
  }
}

function announce() {
  for (const listener of listeners) listener();
}

export function scoutSnapshot(): ScoutStore {
  if (cache === null) cache = read();
  return cache;
}

export function serverScoutSnapshot(): ScoutStore {
  return EMPTY_STORE;
}

export function subscribeToScout(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) {
      cache = read();
      announce();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function write(next: ScoutStore) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked (a private window). The change holds for this visit.
  }
  announce();
}

function update(change: (store: ScoutStore) => ScoutStore) {
  write(change(scoutSnapshot()));
}

// ---------------------------------------------------------------------------------------------

export function isSaved(store: ScoutStore, paperId: string): boolean {
  return store.saved.some((entry) => entry.paper.id === paperId);
}

export function savePaper(paper: Paper, tags: string[] = []) {
  update((store) =>
    isSaved(store, paper.id)
      ? store
      : {
          ...store,
          saved: [
            { paper: { ...paper, saved: true }, notes: "", read: false, tags, saved_on: new Date().toISOString() },
            ...store.saved,
          ],
        },
  );
}

/** Keep a saved copy up to date when a summary arrives for it later. */
export function refreshSavedPaper(paper: Paper) {
  update((store) => ({
    ...store,
    saved: store.saved.map((entry) => (entry.paper.id === paper.id ? { ...entry, paper: { ...paper, saved: true } } : entry)),
  }));
}

export function unsavePaper(paperId: string) {
  update((store) => ({
    ...store,
    saved: store.saved.filter((entry) => entry.paper.id !== paperId),
    course: store.course.filter((id) => id !== paperId),
  }));
}

export function updateSaved(paperId: string, change: Partial<Pick<SavedPaper, "notes" | "read" | "tags">>) {
  update((store) => ({
    ...store,
    saved: store.saved.map((entry) => (entry.paper.id === paperId ? { ...entry, ...change } : entry)),
  }));
}

export function setWatches(change: (watches: WatchTopic[]) => WatchTopic[]) {
  update((store) => ({ ...store, watches: change(store.watches) }));
}

export function toggleCourse(paperId: string, included: boolean) {
  update((store) => ({
    ...store,
    course: included ? [...new Set([...store.course, paperId])] : store.course.filter((id) => id !== paperId),
  }));
}

export function clearCourse() {
  update((store) => ({ ...store, course: [] }));
}

export function exportScout(): string {
  return JSON.stringify(scoutSnapshot(), null, 2);
}

export function deleteScout() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nothing to remove.
  }
  cache = EMPTY_STORE;
  announce();
}
