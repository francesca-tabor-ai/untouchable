import type { SleepEntry, WaterEntry } from "./records";

/**
 * Reading a file somebody exported from their own phone or watch.
 *
 * Everything here is pure: text in, records out. The screen feeds it the file line by line in
 * the browser, so a several-hundred-megabyte Apple Health export never has to sit in memory
 * whole, and never leaves the device. See DECISIONS.md HT-02.
 *
 * Two rules the parsers keep:
 *
 * - **Nothing is guessed.** A row we cannot read is counted as skipped and said so on the
 *   screen. A date we cannot place is not placed.
 * - **Nothing is read that was not asked for.** Only sleep and water are taken out of an
 *   Apple Health file, however much else is in it. Heart rate, location of workouts, and the
 *   rest are passed over without being kept, even in memory.
 */

export type ImportedSleep = Omit<SleepEntry, "id">;
export type ImportedWater = Omit<WaterEntry, "id">;

export interface ImportResult {
  sleep: ImportedSleep[];
  water: ImportedWater[];
  /** Rows that looked like sleep or water but could not be read. */
  skipped: number;
}

// ─── Dates ─────────────────────────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, "0");

function dayBefore(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d - 1));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function realDay(y: number, m: number, d: number): string | null {
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return null;
  }
  return `${y}-${pad(m)}-${pad(d)}`;
}

/**
 * The calendar day in a cell: `2026-09-26`, or `26/09/2026`.
 *
 * Slashed dates are read the UK way round, day first, unless that is impossible and the
 * other way round is not — `09/26/2026` can only be American. A date that could be either
 * is read as British, because this is a UK platform.
 */
export function dayIn(cell: string): string | null {
  const iso = /(\d{4})-(\d{1,2})-(\d{1,2})/.exec(cell);
  if (iso) return realDay(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const slashed = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(cell);
  if (slashed) {
    const [a, b, y] = [Number(slashed[1]), Number(slashed[2]), Number(slashed[3])];
    return realDay(y, b, a) ?? realDay(y, a, b);
  }
  return null;
}

/** The hour of the day in a cell — `23:10`, `11:10PM`, `11:10 pm` — or null if none. */
export function hourIn(cell: string): number | null {
  const match = /(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap]m)?/i.exec(cell.replace(/^\S*\d{4}\S*/, ""));
  if (!match) return null;
  let hour = Number(match[1]);
  const half = match[3]?.toLowerCase();
  if (half === "pm" && hour < 12) hour += 12;
  if (half === "am" && hour === 12) hour = 0;
  return hour <= 23 ? hour : null;
}

/**
 * Which night a stretch of sleep belongs to: the date it began, unless it began after
 * midnight and before noon, in which case it is the previous evening's night. Somebody who
 * fell asleep at 1am on Tuesday was having Monday's night.
 */
export function nightOf(day: string, hour: number): string {
  return hour < 12 ? dayBefore(day) : day;
}

// ─── Spreadsheets (CSV) ────────────────────────────────────────────────────────────────────

/** One CSV line into cells, honouring quotes. Enough for the exports we read; not a full RFC. */
export function csvCells(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

const findColumn = (headers: string[], names: string[]) =>
  headers.findIndex((header) => names.some((name) => header.includes(name)));

/**
 * Read a spreadsheet of sleep or water.
 *
 * The first row must name the columns. We look for a date ("night", "date", "start time"),
 * then any of "minutes asleep", "hours asleep" and "water". A Fitbit sleep export has
 * "Start Time" and "Minutes Asleep", so it reads without any changes.
 *
 * Several rows for one night (a Fitbit night with a nap in it) are added together, and so
 * are several rows of water on one day.
 */
export function parseCsv(text: string, importedFrom: string): ImportResult | { problem: string } {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length < 2) return { problem: "This file has no rows in it." };

  const headers = csvCells(lines[0]).map((header) => header.toLowerCase());
  const dateColumn = findColumn(headers, ["night", "date", "start time", "start", "day"]);
  const startsAt = dateColumn >= 0 && headers[dateColumn].includes("start");
  const minutesColumn = findColumn(headers, ["minutes asleep"]);
  const hoursColumn = findColumn(headers, ["hours asleep", "sleep hours", "hours slept"]);
  const waterColumn = findColumn(headers, ["water"]);

  if (dateColumn < 0) {
    return { problem: "We could not find a date column. The first row needs to name one." };
  }
  if (minutesColumn < 0 && hoursColumn < 0 && waterColumn < 0) {
    return {
      problem:
        "We could not find a sleep or water column. Name one “minutes asleep”, “hours asleep” or “water ml”.",
    };
  }

  const sleep = new Map<string, number>();
  const water = new Map<string, number>();
  let skipped = 0;

  for (const line of lines.slice(1)) {
    const cells = csvCells(line);
    const day = dayIn(cells[dateColumn] ?? "");
    if (!day) {
      skipped += 1;
      continue;
    }

    let read = false;

    const minutes =
      minutesColumn >= 0
        ? Number(cells[minutesColumn])
        : hoursColumn >= 0
          ? Number(cells[hoursColumn]) * 60
          : NaN;
    if (cells[minutesColumn >= 0 ? minutesColumn : hoursColumn] && Number.isFinite(minutes)) {
      const hour = startsAt ? hourIn(cells[dateColumn]) : null;
      const night = hour === null ? day : nightOf(day, hour);
      sleep.set(night, (sleep.get(night) ?? 0) + Math.round(minutes));
      read = true;
    }

    const ml = waterColumn >= 0 ? Number(cells[waterColumn]) : NaN;
    if (cells[waterColumn] && Number.isFinite(ml) && ml > 0) {
      water.set(day, (water.get(day) ?? 0) + Math.round(ml));
      read = true;
    }

    if (!read) skipped += 1;
  }

  return finish(sleep, water, skipped, importedFrom);
}

// ─── Apple Health (export.xml) ─────────────────────────────────────────────────────────────

const SLEEP_TYPE = "HKCategoryTypeIdentifierSleepAnalysis";
const WATER_TYPE = "HKQuantityTypeIdentifierDietaryWater";

/** Millilitres in one of each unit Apple Health writes water in. */
const ML_PER_UNIT: Record<string, number> = {
  mL: 1,
  ml: 1,
  L: 1000,
  cL: 10,
  dL: 100,
  fl_oz_us: 29.5735,
  "fl_oz_imp": 28.4131,
};

function attributes(tag: string): Record<string, string> {
  const found: Record<string, string> = {};
  for (const match of tag.matchAll(/(\w+)="([^"]*)"/g)) found[match[1]] = match[2];
  return found;
}

interface AppleStamp {
  /** The calendar day as written in the file, in the zone the phone was in. */
  day: string;
  hour: number;
  /** An absolute instant, so overlapping records from a phone and a watch can be merged. */
  ms: number;
}

/** `2026-09-25 23:10:00 +0100` → the day, the hour, and the instant. */
export function appleStamp(value: string): AppleStamp | null {
  const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2}) ([+-])(\d{2})(\d{2})$/.exec(
    value.trim(),
  );
  if (!match) return null;
  const [, y, mo, d, h, mi, s, sign, oh, om] = match;
  const day = realDay(Number(y), Number(mo), Number(d));
  if (!day) return null;
  const offset = (sign === "+" ? 1 : -1) * (Number(oh) * 60 + Number(om));
  const ms =
    Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s)) -
    offset * 60_000;
  return { day, hour: Number(h), ms };
}

/**
 * A reader for an Apple Health `export.xml`, fed one line at a time.
 *
 * Apple writes each record's opening tag on a single line, so a line is enough to read one.
 * Only sleep and water records are looked at.
 *
 * Sleep is the time spent in any "asleep" stage. Time "in bed" and time "awake" are not sleep
 * and are not counted. A phone and a watch often record the same night twice, so each night's
 * stretches are merged before they are added up — counting both would double the night.
 */
export function createAppleHealthReader(importedFrom = "Apple Health") {
  const nights = new Map<string, Array<[number, number]>>();
  const water = new Map<string, number>();
  let skipped = 0;

  return {
    line(text: string) {
      const start = text.indexOf("<Record ");
      if (start < 0) return;
      const isSleep = text.includes(`type="${SLEEP_TYPE}"`);
      const isWater = text.includes(`type="${WATER_TYPE}"`);
      if (!isSleep && !isWater) return;

      const record = attributes(text.slice(start));
      const began = appleStamp(record.startDate ?? "");

      if (isSleep) {
        // "Asleep", "AsleepCore", "AsleepDeep", "AsleepREM", "AsleepUnspecified" — all sleep.
        if (!/SleepAnalysisAsleep/.test(record.value ?? "")) return;
        const ended = appleStamp(record.endDate ?? "");
        if (!began || !ended || ended.ms <= began.ms) {
          skipped += 1;
          return;
        }
        const night = nightOf(began.day, began.hour);
        nights.set(night, [...(nights.get(night) ?? []), [began.ms, ended.ms]]);
        return;
      }

      const perUnit = ML_PER_UNIT[record.unit ?? ""];
      const amount = Number(record.value);
      if (!began || !perUnit || !Number.isFinite(amount) || amount <= 0) {
        skipped += 1;
        return;
      }
      water.set(began.day, (water.get(began.day) ?? 0) + amount * perUnit);
    },

    result(): ImportResult {
      const sleep = new Map<string, number>();
      for (const [night, stretches] of nights) {
        sleep.set(night, Math.round(mergedLength(stretches) / 60_000));
      }
      const roundedWater = new Map([...water].map(([day, ml]) => [day, Math.round(ml)]));
      return finish(sleep, roundedWater, skipped, importedFrom);
    },
  };
}

/** The length of a set of stretches of time, counting any overlap once. */
export function mergedLength(stretches: ReadonlyArray<readonly [number, number]>): number {
  const sorted = [...stretches].sort((a, b) => a[0] - b[0]);
  let total = 0;
  let [from, to] = sorted[0] ?? [0, 0];
  for (const [start, end] of sorted.slice(1)) {
    if (start <= to) {
      to = Math.max(to, end);
    } else {
      total += to - from;
      [from, to] = [start, end];
    }
  }
  return total + (to - from);
}

// ─── Shared ────────────────────────────────────────────────────────────────────────────────

/**
 * Turn the per-day totals into records, dropping anything outside what a record may hold. A
 * "night" of more than 24 hours, or a day of more than five litres in one entry, is a file
 * problem rather than a reading, and is counted as skipped rather than trimmed to fit.
 */
function finish(
  sleep: Map<string, number>,
  water: Map<string, number>,
  skipped: number,
  importedFrom: string,
): ImportResult {
  let dropped = 0;
  const sleepRecords: ImportedSleep[] = [];
  for (const [night, minutesAsleep] of sleep) {
    if (minutesAsleep < 0 || minutesAsleep > 24 * 60) {
      dropped += 1;
      continue;
    }
    sleepRecords.push({ night, minutesAsleep, origin: "imported", importedFrom });
  }
  const waterRecords: ImportedWater[] = [];
  for (const [day, amountMl] of water) {
    if (amountMl < 1 || amountMl > 5000) {
      dropped += 1;
      continue;
    }
    waterRecords.push({ day, amountMl, origin: "imported", importedFrom });
  }
  return {
    sleep: sleepRecords.sort((a, b) => a.night.localeCompare(b.night)),
    water: waterRecords.sort((a, b) => a.day.localeCompare(b.day)),
    skipped: skipped + dropped,
  };
}

export interface MergePlan<T> {
  add: T[];
  /** Already have a record for that night or day, so left alone. */
  alreadyHeld: number;
}

/**
 * What an import would add, without touching anything already there.
 *
 * A night that already has a sleep record is left as it is, whether the person typed it or an
 * earlier import brought it in: what somebody wrote down themselves is never overwritten by a
 * watch, and importing the same file twice adds nothing the second time. The same goes for a
 * day that already has water on it, so drinks tapped in by hand are not counted twice.
 */
export function planSleepImport(
  existing: readonly Pick<SleepEntry, "night">[],
  incoming: readonly ImportedSleep[],
): MergePlan<ImportedSleep> {
  const held = new Set(existing.map((entry) => entry.night));
  const add = incoming.filter((entry) => !held.has(entry.night));
  return { add, alreadyHeld: incoming.length - add.length };
}

export function planWaterImport(
  existing: readonly Pick<WaterEntry, "day">[],
  incoming: readonly ImportedWater[],
): MergePlan<ImportedWater> {
  const held = new Set(existing.map((entry) => entry.day));
  const add = incoming.filter((entry) => !held.has(entry.day));
  return { add, alreadyHeld: incoming.length - add.length };
}
