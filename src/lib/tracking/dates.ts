/**
 * Dates for tracking.
 *
 * A daily log belongs to a calendar day, not to an instant. `DailyLog.date` is a Postgres
 * `date` column with a unique constraint on (userId, date), so "today" has to mean the same
 * thing every time we ask, wherever the server happens to be running.
 *
 * We answer that in one place: today is today in Europe/London, stored as midnight UTC.
 * Everyone using this is in the UK, and a person logging at 11pm on a June evening must not
 * have it land on tomorrow because the server is on UTC and they are on BST.
 */

const UK = "Europe/London";

/** The calendar date in the UK right now, as a midnight-UTC `Date`. */
export function ukToday(now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: UK,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  return new Date(Date.UTC(get("year"), get("month") - 1, get("day")));
}

/** Strip a date back to midnight UTC, so it compares cleanly with a stored `date` column. */
export function toDateOnly(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

/** `2026-09-16` — what a `<input type="date">` wants, and what a form sends back. */
export function toDateInputValue(value: Date): string {
  return toDateOnly(value).toISOString().slice(0, 10);
}

/** Read `2026-09-16` from a form. Returns null for anything that is not a real date. */
export function fromDateInputValue(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  // Rejects 31 February, which `Date.UTC` would happily roll over into March.
  if (date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day)) return null;
  return date;
}

/** "Tuesday 16 September 2026". Long form, because a date is a fact somebody may rely on. */
export function formatLongDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(toDateOnly(value));
}

/** "16 September 2026". */
export function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(toDateOnly(value));
}

/** Whole days between two calendar dates. Negative if `to` is before `from`. */
export function daysBetween(from: Date, to: Date): number {
  const ms = toDateOnly(to).getTime() - toDateOnly(from).getTime();
  return Math.round(ms / 86_400_000);
}

export function addDays(value: Date, days: number): Date {
  const date = toDateOnly(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}
