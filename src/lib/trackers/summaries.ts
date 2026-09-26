import type { BloodResult, BowelEntry, SleepEntry, WaterEntry } from "./records";

/**
 * Putting records in order for the screen, and nothing more.
 *
 * Adding up the drinks in a day is arithmetic on what the person typed, so it is here. An
 * average, a comparison with last week, a target or a streak would be a reading of the data,
 * so none of them is — AGENTS.md rule 9, held by `tests/unit/trackers.test.tsx`.
 */

/** Today on this device, as `2026-09-26`. The records are the device's, so its clock is. */
export function localToday(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** `2026-09-26` → "Saturday 26 September 2026". Read as a calendar day, never shifted. */
export function formatDay(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, date)));
}

/** 450 → "7 hours 30 minutes". Words rather than "7h30", for somebody reading at 2am. */
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const h = hours === 1 ? "1 hour" : `${hours} hours`;
  const m = rest === 1 ? "1 minute" : `${rest} minutes`;
  if (hours === 0) return m;
  if (rest === 0) return h;
  return `${h} ${m}`;
}

/** 1750 → "1,750 ml". */
export function formatMl(ml: number): string {
  return `${new Intl.NumberFormat("en-GB").format(ml)} ml`;
}

export interface WaterDay {
  day: string;
  totalMl: number;
  drinks: number;
}

/** One line per day, newest first: the total and how many drinks made it up. */
export function waterByDay(entries: readonly WaterEntry[]): WaterDay[] {
  const days = new Map<string, WaterDay>();
  for (const entry of entries) {
    const current = days.get(entry.day) ?? { day: entry.day, totalMl: 0, drinks: 0 };
    current.totalMl += entry.amountMl;
    current.drinks += 1;
    days.set(entry.day, current);
  }
  return [...days.values()].sort((a, b) => b.day.localeCompare(a.day));
}

/** Nights, newest first. */
export function sleepNewestFirst(entries: readonly SleepEntry[]): SleepEntry[] {
  return [...entries].sort((a, b) => b.night.localeCompare(a.night));
}

export interface BloodTestGroup {
  test: string;
  results: BloodResult[];
}

/**
 * Results grouped by the test's name, each group newest first, groups in alphabetical order.
 *
 * Alphabetical rather than by anything to do with the values. Putting one test at the top
 * because its latest result is outside the printed range would be flagging it, which is a
 * clinician's call and not ours.
 *
 * Names are matched without regard to case or spacing, so "Ferritin" and "ferritin " are one
 * test. The group takes the spelling of its most recent result.
 */
export function bloodResultsByTest(results: readonly BloodResult[]): BloodTestGroup[] {
  const groups = new Map<string, BloodResult[]>();
  for (const result of results) {
    const key = result.test.trim().toLocaleLowerCase("en-GB").replace(/\s+/g, " ");
    groups.set(key, [...(groups.get(key) ?? []), result]);
  }
  return [...groups.values()]
    .map((group) => {
      const sorted = [...group].sort((a, b) => b.takenOn.localeCompare(a.takenOn));
      return { test: sorted[0].test.trim(), results: sorted };
    })
    .sort((a, b) => a.test.localeCompare(b.test, "en-GB", { sensitivity: "base" }));
}

export interface BowelDay {
  day: string;
  entries: BowelEntry[];
}

/** One group per day, newest first; within a day, in the order they happened. */
export function bowelByDay(entries: readonly BowelEntry[]): BowelDay[] {
  const days = new Map<string, BowelEntry[]>();
  for (const entry of entries) days.set(entry.day, [...(days.get(entry.day) ?? []), entry]);
  return [...days.entries()]
    .map(([day, group]) => ({
      day,
      entries: [...group].sort((a, b) => (a.time ?? "").localeCompare(b.time ?? "")),
    }))
    .sort((a, b) => b.day.localeCompare(a.day));
}

/** "Once", "Twice", "3 times" — how often, in words. */
export function timesInWords(count: number): string {
  if (count === 1) return "Once";
  if (count === 2) return "Twice";
  return `${count} times`;
}
