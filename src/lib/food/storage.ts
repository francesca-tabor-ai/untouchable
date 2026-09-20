"use client";

/**
 * Where the profile lives: this device, and nowhere else.
 *
 * A condition profile is UK GDPR special category data about somebody's allergies,
 * medicines and diagnoses. The spec for this feature asks for local storage by default with
 * sync as an opt-in, and that is the right default independently: it keeps the most
 * sensitive thing the person has typed off our servers entirely, and it needs no schema
 * change to `prisma/schema.prisma`, which is a single-writer file. See DECISIONS.md FA-02.
 *
 * It is exposed as a small external store rather than as a read in an effect, so that
 * `useSyncExternalStore` can do the hydration properly: the server renders the empty
 * profile, the client swaps in the stored one, and two tabs stay in step through the
 * `storage` event.
 *
 * Photographs never reach here. They are read and dropped; nothing about an image is
 * persisted on either side.
 */

import { conditionProfileSchema, EMPTY_PROFILE, type ConditionProfile } from "./profile";

const KEY = "untouchable.food.profile";
const SAID_KEY = "untouchable.food.scope-note-said-on";

/**
 * `useSyncExternalStore` compares snapshots by identity and will loop forever if a fresh
 * object comes back every render, so the parsed profile is held here and only replaced when
 * something actually changes it.
 */
let cache: ConditionProfile | null = null;
const listeners = new Set<() => void>();

function readFromStorage(): ConditionProfile {
  if (typeof window === "undefined") return EMPTY_PROFILE;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY_PROFILE;
    const parsed = conditionProfileSchema.safeParse(JSON.parse(raw));
    // A profile we cannot parse is a profile we do not act on. Falling back to empty makes
    // the screen ask again, which is safer than acting on half of one.
    return parsed.success ? parsed.data : EMPTY_PROFILE;
  } catch {
    return EMPTY_PROFILE;
  }
}

function announce() {
  for (const listener of listeners) listener();
}

export function subscribeToProfile(listener: () => void): () => void {
  listeners.add(listener);

  // Another tab writing the profile is the same event as this one writing it.
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

export function profileSnapshot(): ConditionProfile {
  if (cache === null) cache = readFromStorage();
  return cache;
}

/** During hydration there is no storage to read, so the server and client agree on empty. */
export function serverProfileSnapshot(): ConditionProfile {
  return EMPTY_PROFILE;
}

export function saveProfile(profile: ConditionProfile): void {
  cache = profile;
  announce();
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    // Storage full, or blocked in a private window. The session still works; it just will
    // not be here tomorrow. Silent rather than alarming — the screen says where it is kept.
  }
}

/** One tap, and all of it goes. */
export function deleteProfile(): void {
  cache = EMPTY_PROFILE;
  announce();
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
    window.localStorage.removeItem(SAID_KEY);
  } catch {
    // Nothing to do; there is nothing to delete if storage is unreachable.
  }
}

/** One tap to take a copy, in a format a person or a dietitian can actually read. */
export function exportProfile(profile: ConditionProfile): string {
  return JSON.stringify(profile, null, 2);
}

export function scopeNoteSaidOn(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(SAID_KEY);
  } catch {
    return null;
  }
}

export function recordScopeNoteSaid(today: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SAID_KEY, today);
  } catch {
    // If we cannot record that it was said, the note may appear once more. Annoying, and
    // the right way round: the alternative is losing a profile to make a note behave.
  }
}
