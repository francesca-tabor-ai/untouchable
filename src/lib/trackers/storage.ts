"use client";

import { z } from "zod";

import {
  bloodResultSchema,
  bowelEntrySchema,
  sleepEntrySchema,
  waterEntrySchema,
  type TrackerKey,
} from "./records";

/**
 * Where tracker records live: this device, and nowhere else.
 *
 * The same call the Food Advisor made (DECISIONS.md FA-02), for the same reasons. Blood
 * results and bowel habits are UK GDPR special category data. Holding them in the browser
 * keeps them off our servers entirely, and it needs no change to `prisma/schema.prisma`,
 * which is a single-writer file. Moving them to the account is a decision about encryption
 * at rest and about research consent, and it belongs to the platform lead — HT-01.
 *
 * The cost is on every screen rather than buried: clearing the browser clears the records,
 * and they do not follow the person to another phone. Each tracker offers a copy to download.
 *
 * Each tracker is a small external store for `useSyncExternalStore`, as the food profile is:
 * the server renders an empty list, the client swaps in the stored one, and two open tabs
 * stay in step through the `storage` event.
 */

export interface TrackerStore<T> {
  key: string;
  subscribe: (listener: () => void) => () => void;
  snapshot: () => T[];
  serverSnapshot: () => T[];
  save: (records: T[]) => void;
  clear: () => void;
}

const EMPTY: never[] = [];

export function createTrackerStore<T>(key: string, schema: z.ZodType<T>): TrackerStore<T> {
  const listSchema = z.array(schema);
  /**
   * `useSyncExternalStore` compares snapshots by identity and loops forever if a fresh array
   * comes back every render, so the parsed list is held here and only replaced on a change.
   */
  let cache: T[] | null = null;
  const listeners = new Set<() => void>();

  function read(): T[] {
    if (typeof window === "undefined") return EMPTY;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return EMPTY;
      const parsed = listSchema.safeParse(JSON.parse(raw));
      // A list we cannot parse is a list we do not show. Showing half of somebody's blood
      // results as if it were all of them is worse than showing none and saying so.
      return parsed.success ? parsed.data : EMPTY;
    } catch {
      return EMPTY;
    }
  }

  function announce() {
    for (const listener of listeners) listener();
  }

  return {
    key,
    subscribe(listener) {
      listeners.add(listener);
      const onStorage = (event: StorageEvent) => {
        if (event.key === key) {
          cache = read();
          announce();
        }
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", onStorage);
      };
    },
    snapshot() {
      if (cache === null) cache = read();
      return cache;
    },
    serverSnapshot() {
      return EMPTY;
    },
    save(records) {
      cache = records;
      announce();
      if (typeof window === "undefined") return;
      try {
        window.localStorage.setItem(key, JSON.stringify(records));
      } catch {
        // Storage full, or blocked in a private window. The screen still works for this
        // visit; each tracker says where its records are kept.
      }
    },
    clear() {
      cache = EMPTY;
      announce();
      if (typeof window === "undefined") return;
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Nothing stored that we could reach, so nothing to remove.
      }
    },
  };
}

export const waterStore = createTrackerStore("untouchable.trackers.water", waterEntrySchema);
export const sleepStore = createTrackerStore("untouchable.trackers.sleep", sleepEntrySchema);
export const bloodStore = createTrackerStore("untouchable.trackers.blood", bloodResultSchema);
export const bowelStore = createTrackerStore("untouchable.trackers.bowel", bowelEntrySchema);

export const STORES: Record<TrackerKey, TrackerStore<unknown>> = {
  water: waterStore as TrackerStore<unknown>,
  sleep: sleepStore as TrackerStore<unknown>,
  blood: bloodStore as TrackerStore<unknown>,
  bowel: bowelStore as TrackerStore<unknown>,
};

/** A copy of one tracker's records, in a form a person or a clinician can open and read. */
export function exportRecords(tracker: TrackerKey, records: unknown[]): string {
  return JSON.stringify({ tracker, exportedOn: new Date().toISOString(), records }, null, 2);
}
