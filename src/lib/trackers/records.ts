import { z } from "zod";

/**
 * The four everyday trackers: water, sleep, blood test results, and bowel habits.
 *
 * Every record here is held on the person's own device and never reaches our servers — see
 * `storage.ts` and DECISIONS.md HT-01 for why. The shapes are still validated with Zod,
 * because what comes back out of local storage is whatever was last written there, by this
 * version of the code or an older one, and a record we cannot read is a record we must not
 * show as if we had.
 *
 * Nothing in this folder grades a reading. There is no target, no "normal", no high or low,
 * no colour for good or bad. AGENTS.md rule 9.
 */

/** `2026-09-26`. A calendar day on the person's own device, not an instant. */
export const dayString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date.");

/** Where a record came from. Imported rows say so, so nobody mistakes a watch for a diary. */
export const recordOrigin = z.enum(["typed", "imported"]);
export type RecordOrigin = z.infer<typeof recordOrigin>;

// ─── Water ─────────────────────────────────────────────────────────────────────────────────

export const waterEntrySchema = z.object({
  id: z.string().min(1),
  day: dayString,
  /** Millilitres. Whole numbers: nobody measures a drink to the fraction of a millilitre. */
  amountMl: z.number().int().min(1).max(5000),
  origin: recordOrigin.default("typed"),
  /** For imported rows only: the app or device the file came from. */
  importedFrom: z.string().max(80).optional(),
});
export type WaterEntry = z.infer<typeof waterEntrySchema>;

/**
 * Quick amounts, so a drink is one tap. They are sizes of container, not portions of a
 * target — there is no daily amount anywhere on this screen for them to add up towards.
 */
export const WATER_QUICK_AMOUNTS = [
  { label: "A small glass", amountMl: 150 },
  { label: "A glass", amountMl: 250 },
  { label: "A mug", amountMl: 350 },
  { label: "A bottle", amountMl: 500 },
] as const;

// ─── Sleep ─────────────────────────────────────────────────────────────────────────────────

export const sleepEntrySchema = z.object({
  id: z.string().min(1),
  /** The date the night began. A night from Monday into Tuesday is Monday's night. */
  night: dayString,
  /** Time asleep, in minutes. Up to a whole day, because illness does not keep office hours. */
  minutesAsleep: z.number().int().min(0).max(24 * 60),
  /** The person's own rating, 0 to 10, the same scale as the daily log. Optional. */
  howWell: z.number().int().min(0).max(10).optional(),
  /** How many times they woke. Optional. */
  timesWoke: z.number().int().min(0).max(50).optional(),
  origin: recordOrigin.default("typed"),
  importedFrom: z.string().max(80).optional(),
});
export type SleepEntry = z.infer<typeof sleepEntrySchema>;

// ─── Blood test results ────────────────────────────────────────────────────────────────────

export const bloodResultSchema = z.object({
  id: z.string().min(1),
  /** The day the blood was taken, not the day the result arrived. */
  takenOn: dayString,
  /** As it is written on the report: "Ferritin", "HbA1c", "TSH". */
  test: z.string().trim().min(1, "Write the name of the test.").max(120),
  /**
   * As it is written on the report. Text rather than a number, because results arrive as
   * "<0.5", ">90", "negative" and "not detected", and turning those into numbers would be us
   * deciding what they mean.
   */
  result: z.string().trim().min(1, "Write the result.").max(60),
  unit: z.string().trim().max(30).optional(),
  /**
   * The range printed beside the result, if there was one, exactly as printed. We show it
   * and never compare anything against it: ranges differ between labs, and whether a
   * result outside one matters is a conversation with a clinician.
   */
  rangeOnReport: z.string().trim().max(60).optional(),
  /** Where the result came from: "GP surgery", "hospital clinic", "home test kit". */
  cameFrom: z.string().trim().min(1, "Say where the result came from.").max(120),
});
export type BloodResult = z.infer<typeof bloodResultSchema>;

// ─── Bowel habits ──────────────────────────────────────────────────────────────────────────

/**
 * The Bristol stool chart, the seven-type scale the NHS and most GPs use, in plain words.
 * The types are descriptions, not grades: none is labelled as the one to aim for, because
 * that would be us telling somebody what their body should be doing.
 */
export const STOOL_TYPES = [
  { type: 1, description: "Separate hard lumps, like nuts" },
  { type: 2, description: "Lumpy and sausage-shaped" },
  { type: 3, description: "Sausage-shaped, with cracks on the surface" },
  { type: 4, description: "Smooth and soft, like a sausage or a snake" },
  { type: 5, description: "Soft blobs with clear-cut edges" },
  { type: 6, description: "Mushy, fluffy pieces with ragged edges" },
  { type: 7, description: "Watery, with no solid pieces" },
] as const;

export const bowelEntrySchema = z.object({
  id: z.string().min(1),
  day: dayString,
  /** `14:30`. Optional: some people want a count per day and nothing more. */
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  stoolType: z.number().int().min(1).max(7),
  /** Saw blood, or it was black and sticky. Triggers the signposting in `bowel.ts`. */
  blood: z.boolean().default(false),
  pain: z.boolean().default(false),
  urgent: z.boolean().default(false),
});
export type BowelEntry = z.infer<typeof bowelEntrySchema>;

// ─── Everything together ───────────────────────────────────────────────────────────────────

/** The four trackers, as their records are keyed on the device. The catalogue that lists them
 * for people is `src/lib/my-health/trackers.ts`. */
export type TrackerKey = "water" | "sleep" | "blood" | "bowel";

/** A fresh id for a new record. */
export function newId(): string {
  return crypto.randomUUID();
}
