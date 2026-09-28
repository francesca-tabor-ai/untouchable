"use client";

/**
 * Where a listener is up to: this device, and nowhere else.
 *
 * Progress is the one piece of this feature that is about a person, and it needs no server:
 * which lessons somebody has finished and how far into one they are. Keeping it in the
 * browser means no schema change and nothing held about anybody. The same trade the Food
 * Advisor made in FA-02, with the same cost on the screen: it does not follow you to another
 * device. See DECISIONS.md LC-04.
 *
 * An external store for `useSyncExternalStore`, in the shape `src/lib/food/storage.ts` uses.
 */

import { useSyncExternalStore } from "react";
import { z } from "zod";

import type { LessonProgress } from "./types";

const KEY = "untouchable.listen.progress";

const storedSchema = z.record(
  z.string(),
  z.object({ position_sec: z.number().min(0), completed: z.boolean() }),
);

type Stored = z.infer<typeof storedSchema>;

const EMPTY: Stored = {};
let cache: Stored | null = null;
const listeners = new Set<() => void>();

function readFromStorage(): Stored {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = storedSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : EMPTY;
  } catch {
    return EMPTY;
  }
}

function snapshot(): Stored {
  if (cache === null) cache = readFromStorage();
  return cache;
}

function announce() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) {
      cache = readFromStorage();
      announce();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function saveProgress(lessonId: string, patch: Partial<Omit<LessonProgress, "lesson_id">>) {
  const current = snapshot();
  const previous = current[lessonId] ?? { position_sec: 0, completed: false };
  cache = { ...current, [lessonId]: { ...previous, ...patch } };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Private browsing or a full store. Progress is a convenience; the lesson still plays.
  }
  announce();
}

export function useProgress(): Stored {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}

export function useLessonProgress(lessonId: string): LessonProgress {
  const stored = useProgress()[lessonId];
  return {
    lesson_id: lessonId,
    position_sec: stored?.position_sec ?? 0,
    completed: stored?.completed ?? false,
  };
}
