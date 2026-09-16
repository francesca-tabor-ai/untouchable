import { z } from "zod";

import { db } from "@/lib/db";

import { isContextTag } from "./context-tags";
import { toDateOnly, ukToday } from "./dates";

/**
 * The daily quick log — brief 7.5.
 *
 * The whole design is answerable to one number: **under thirty seconds**. Someone exhausted,
 * one-handed, on a phone, in bed. Everything here exists to take taps and keystrokes out of
 * that, and nothing here interprets what the numbers mean.
 *
 * Three decisions carry most of the speed:
 *
 * 1. **Every slider already has a value when the screen opens.** It starts where that
 *    symptom was last recorded, so a day where nothing has changed is one tap: Save. The
 *    screen says out loud where the starting positions came from, so nobody is filing a
 *    number they did not choose without knowing it.
 * 2. **One log per day, upserted.** Opening the log again on the same day is editing, not an
 *    error. There is no separate "edit" screen and no "you have already logged today".
 * 3. **Nothing is required.** No note, no tags, no confirmation step. A person can always
 *    stop after the sliders.
 *
 * `SCALE_MIN`/`SCALE_MAX` are the 0–10 scale the brief specifies. 0 is "not at all" and 10
 * is "as bad as it has been" — that is a definition of the scale, which a number needs in
 * order to mean anything. It is not a judgement about the answer.
 */

export const SCALE_MIN = 0;
export const SCALE_MAX = 10;

/** Where a slider starts when this symptom has never been scored. The middle of the scale. */
export const NEUTRAL_SCORE = 5;

export const NOTE_MAX_LENGTH = 1000;

export const dailyLogSchema = z.object({
  /** `{ userSymptomId: 0–10 }`, matching `DailyLog.symptomScoresJson`. */
  scores: z.record(
    z.string().min(1),
    z.number().int().min(SCALE_MIN).max(SCALE_MAX),
  ),
  tags: z.array(z.string()).max(20),
  /** FREE TEXT — never exported, never shown to anyone but its author. */
  note: z.string().max(NOTE_MAX_LENGTH, "Please keep the note under 1000 characters.").nullable(),
});

export type DailyLogInput = z.infer<typeof dailyLogSchema>;

/**
 * Read a submitted daily log out of a form.
 *
 * Exported so the "how many taps is a minimal log?" test can take the form exactly as it is
 * rendered, submit nothing, and check that what comes back is already a complete log.
 */
export function parseDailyLogForm(formData: FormData) {
  const scores: Record<string, number> = {};
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("score-")) continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) scores[key.slice("score-".length)] = Math.round(parsed);
  }

  const note = String(formData.get("note") ?? "").trim();

  return dailyLogSchema.safeParse({
    scores,
    tags: formData.getAll("tag").map(String).filter(isContextTag),
    note: note.length > 0 ? note : null,
  });
}

export interface DailyLogSymptom {
  /** The key under which this symptom's score is stored. */
  userSymptomId: string;
  symptomId: string;
  name: string;
  /** Where the slider starts. Always a number — the screen is never blank. */
  score: number;
  /**
   * `today`   — already logged today, so this is an edit.
   * `carried` — the last score recorded for this symptom, on `carriedFrom`.
   * `neutral` — never scored. Starts in the middle, and the screen says so.
   */
  source: "today" | "carried" | "neutral";
  carriedFrom: Date | null;
}

export interface DailyLogScreen {
  date: Date;
  symptoms: DailyLogSymptom[];
  tags: string[];
  note: string | null;
  /** True when a log already exists for today, so saving again is an edit. */
  alreadyLogged: boolean;
  /** The date the starting positions were carried from, if any. */
  carriedFrom: Date | null;
  savedAt: Date | null;
}

function scoresFrom(value: unknown): Record<string, number> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return {};
  const scores: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const score = Number(raw);
    if (Number.isFinite(score)) scores[key] = Math.round(score);
  }
  return scores;
}

export async function activeTrackedSymptoms(userId: string) {
  return db.userSymptom.findMany({
    where: { userId, active: true },
    include: { symptom: { select: { id: true, name: true } } },
    orderBy: { symptom: { name: "asc" } },
  });
}

export function getDailyLog(userId: string, date: Date) {
  return db.dailyLog.findUnique({
    where: { userId_date: { userId, date: toDateOnly(date) } },
  });
}

/**
 * Everything the daily log screen needs, in one read.
 *
 * Deliberately one function rather than a handful the page stitches together: whether a
 * slider is an edit, a carried-forward value or a first answer is the same question, and
 * splitting it is how a screen ends up telling someone the wrong thing about their own data.
 */
export async function dailyLogScreen(userId: string, date: Date = ukToday()): Promise<DailyLogScreen> {
  const day = toDateOnly(date);

  const [tracked, today, previous] = await Promise.all([
    activeTrackedSymptoms(userId),
    getDailyLog(userId, day),
    db.dailyLog.findFirst({
      where: { userId, date: { lt: day } },
      orderBy: { date: "desc" },
    }),
  ]);

  const todayScores = today ? scoresFrom(today.symptomScoresJson) : {};
  const previousScores = previous ? scoresFrom(previous.symptomScoresJson) : {};

  let carriedFrom: Date | null = null;

  const symptoms: DailyLogSymptom[] = tracked.map((row) => {
    if (row.id in todayScores) {
      return {
        userSymptomId: row.id,
        symptomId: row.symptom.id,
        name: row.symptom.name,
        score: todayScores[row.id],
        source: "today" as const,
        carriedFrom: null,
      };
    }

    if (previous && row.id in previousScores) {
      carriedFrom = previous.date;
      return {
        userSymptomId: row.id,
        symptomId: row.symptom.id,
        name: row.symptom.name,
        score: previousScores[row.id],
        source: "carried" as const,
        carriedFrom: previous.date,
      };
    }

    return {
      userSymptomId: row.id,
      symptomId: row.symptom.id,
      name: row.symptom.name,
      score: NEUTRAL_SCORE,
      source: "neutral" as const,
      carriedFrom: null,
    };
  });

  return {
    date: day,
    symptoms,
    tags: today?.tags ?? [],
    note: today?.note ?? null,
    alreadyLogged: today !== null,
    carriedFrom: today ? null : carriedFrom,
    savedAt: today?.updatedAt ?? null,
  };
}

/**
 * Save today's log.
 *
 * An upsert on (userId, date), which is what makes "edit today's entry" the ordinary
 * behaviour rather than a unique-constraint error someone has to be apologised to for.
 *
 * Scores are filtered to symptoms this person is actually tracking, so a tampered form
 * cannot write a score against somebody else's row or against a symptom they dropped.
 */
export async function saveDailyLog(
  userId: string,
  input: DailyLogInput,
  date: Date = ukToday(),
) {
  const day = toDateOnly(date);

  const tracked = await db.userSymptom.findMany({
    where: { userId, active: true },
    select: { id: true },
  });
  const allowed = new Set(tracked.map((row) => row.id));

  const scores: Record<string, number> = {};
  for (const [userSymptomId, score] of Object.entries(input.scores)) {
    if (allowed.has(userSymptomId)) scores[userSymptomId] = score;
  }

  const tags = [...new Set(input.tags.filter(isContextTag))];
  const note = input.note?.trim() ? input.note.trim() : null;

  return db.dailyLog.upsert({
    where: { userId_date: { userId, date: day } },
    create: { userId, date: day, symptomScoresJson: scores, tags, note },
    update: { symptomScoresJson: scores, tags, note },
  });
}

export interface RecentLogEntry {
  id: string;
  date: Date;
  scores: { name: string; score: number }[];
  tags: string[];
  /** FREE TEXT. Shown only to the person who wrote it, never exported. */
  note: string | null;
}

/**
 * The last few days, as they were recorded. Numbers, dates and the person's own words —
 * no averages, no comparisons, no arrows. The dashboard milestone owns charts; this is
 * here so somebody can see that what they just saved is really there.
 */
export async function recentLogs(userId: string, limit = 7): Promise<RecentLogEntry[]> {
  const [logs, tracked] = await Promise.all([
    db.dailyLog.findMany({ where: { userId }, orderBy: { date: "desc" }, take: limit }),
    db.userSymptom.findMany({
      where: { userId },
      include: { symptom: { select: { name: true } } },
    }),
  ]);

  const names = new Map(tracked.map((row) => [row.id, row.symptom.name]));

  return logs.map((log) => {
    const scores = scoresFrom(log.symptomScoresJson);
    return {
      id: log.id,
      date: log.date,
      scores: Object.entries(scores)
        .map(([userSymptomId, score]) => ({
          name: names.get(userSymptomId) ?? "A symptom you no longer track",
          score,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      tags: log.tags,
      note: log.note,
    };
  });
}
