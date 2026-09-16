import { z } from "zod";

import { InterventionType, StopReason } from "@/generated/prisma";
import { db } from "@/lib/db";

import { addDays, fromDateInputValue, ukToday } from "./dates";
import { findOrCreateIntervention } from "./interventions";

/**
 * Treatment and medication courses — brief 7.6.
 *
 * A *course* is one person taking one thing over a stretch of time: when it started, what
 * dose, how often, how it was taken, whether it has stopped and what led to that.
 *
 * Nothing in this module or anything that renders it says whether a treatment worked. A stop
 * reason is what the person told us, shown back as they chose it. That is the whole claim.
 */

export class TrackingError extends Error {
  constructor(
    message: string,
    /** Which form field the message belongs beside. */
    readonly field: string = "form",
  ) {
    super(message);
    this.name = "TrackingError";
  }
}

export const STOP_REASONS: { value: StopReason; label: string }[] = [
  { value: "not_working", label: "It was not doing anything for me" },
  { value: "side_effects", label: "Side effects" },
  { value: "cost", label: "Cost" },
  { value: "clinician_advice", label: "My doctor or nurse advised it" },
  { value: "other", label: "Another reason" },
];

export function stopReasonLabel(reason: StopReason): string {
  return STOP_REASONS.find((option) => option.value === reason)?.label ?? String(reason);
}

const ADHERENCE_MIN = 0;
const ADHERENCE_MAX = 10;

/** `2026-09-16` from a date input, or a message beside the field. */
const dateField = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `Please give the ${label}.`)
    .transform((value, ctx) => {
      const date = fromDateInputValue(value);
      if (!date) {
        ctx.addIssue({ code: "custom", message: `${label} is not a date we can read.` });
        return z.NEVER;
      }
      return date;
    });

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Please keep this under ${max} characters.`)
    .transform((value) => (value.length > 0 ? value : null))
    .nullable();

const adherence = z
  .string()
  .trim()
  .transform((value, ctx) => {
    if (value === "") return null;
    const score = Number(value);
    if (!Number.isFinite(score) || score < ADHERENCE_MIN || score > ADHERENCE_MAX) {
      ctx.addIssue({ code: "custom", message: "Please give a number from 0 to 10." });
      return z.NEVER;
    }
    return Math.round(score);
  })
  .nullable();

export const treatmentCourseSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Please give the name of the treatment.")
      .max(120, "Please keep the name under 120 characters."),
    type: z.enum(InterventionType, "Please say what kind of treatment this is."),
    dose: optionalText(120),
    frequency: optionalText(120),
    route: optionalText(120),
    startDate: dateField("date it started"),
    adherenceRating: adherence,
  })
  .refine((value) => value.startDate <= addDays(ukToday(), 365), {
    message: "That start date is more than a year away. Please check it.",
    path: ["startDate"],
  })
  .refine((value) => value.startDate >= new Date(Date.UTC(1900, 0, 1)), {
    message: "Please check the start date.",
    path: ["startDate"],
  });

export type TreatmentCourseInput = z.infer<typeof treatmentCourseSchema>;

export const stopTreatmentSchema = z.object({
  endDate: dateField("date it stopped"),
  stopReason: z.enum(StopReason, "Please choose what led to stopping."),
  /** FREE TEXT — never exported. Only ever shown back to the person who wrote it. */
  stopReasonNote: optionalText(1000),
  adherenceRating: adherence,
});

export type StopTreatmentInput = z.infer<typeof stopTreatmentSchema>;

const COURSE_INCLUDE = {
  intervention: { select: { id: true, name: true, type: true, dmdCode: true } },
} as const;

/**
 * One person's courses. Current ones first — the thing somebody is looking for when they
 * open this page is usually what they are on now.
 *
 * "Current" means no end date. That is a fact about the record, not a judgement.
 */
export async function listTreatmentCourses(userId: string) {
  const courses = await db.treatmentCourse.findMany({
    where: { userId },
    include: COURSE_INCLUDE,
    orderBy: [{ startDate: "desc" }],
  });

  return {
    current: courses.filter((course) => course.endDate === null),
    stopped: courses.filter((course) => course.endDate !== null),
  };
}

export function countTreatmentCourses(userId: string) {
  return db.treatmentCourse.count({ where: { userId } });
}

/** A course, if it belongs to this person. Null otherwise — never "forbidden", never a leak. */
export async function getTreatmentCourse(userId: string, id: string) {
  return db.treatmentCourse.findFirst({
    where: { id, userId },
    include: {
      ...COURSE_INCLUDE,
      sideEffectReports: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function addTreatmentCourse(userId: string, input: TreatmentCourseInput) {
  const intervention = await findOrCreateIntervention(input.name, input.type);

  return db.treatmentCourse.create({
    data: {
      userId,
      interventionId: intervention.id,
      dose: input.dose,
      frequency: input.frequency,
      route: input.route,
      startDate: input.startDate,
      adherenceRating: input.adherenceRating,
    },
    include: COURSE_INCLUDE,
  });
}

/**
 * Change a course that is already recorded.
 *
 * Changing the name or the kind re-points the course at another intervention, creating one
 * if need be — someone correcting a typo in a medicine's name should not have to delete the
 * course and lose its history.
 */
export async function updateTreatmentCourse(
  userId: string,
  id: string,
  input: TreatmentCourseInput,
) {
  const course = await db.treatmentCourse.findFirst({ where: { id, userId } });
  if (!course) throw new TrackingError("We could not find that treatment.");

  if (course.endDate && input.startDate > course.endDate) {
    throw new TrackingError(
      "The start date is after the date you stopped. Please check both.",
      "startDate",
    );
  }

  const intervention = await findOrCreateIntervention(input.name, input.type);

  return db.treatmentCourse.update({
    where: { id: course.id },
    data: {
      interventionId: intervention.id,
      dose: input.dose,
      frequency: input.frequency,
      route: input.route,
      startDate: input.startDate,
      adherenceRating: input.adherenceRating,
    },
    include: COURSE_INCLUDE,
  });
}

export async function stopTreatmentCourse(userId: string, id: string, input: StopTreatmentInput) {
  const course = await db.treatmentCourse.findFirst({ where: { id, userId } });
  if (!course) throw new TrackingError("We could not find that treatment.");

  if (input.endDate < course.startDate) {
    throw new TrackingError("The date you stopped is before the date it started.", "endDate");
  }

  return db.treatmentCourse.update({
    where: { id: course.id },
    data: {
      endDate: input.endDate,
      stopReason: input.stopReason,
      stopReasonNote: input.stopReasonNote,
      adherenceRating: input.adherenceRating ?? course.adherenceRating,
    },
    include: COURSE_INCLUDE,
  });
}

/** Undo a stop. People mis-tap, and re-typing a course to fix it would lose its history. */
export async function restartTreatmentCourse(userId: string, id: string) {
  const course = await db.treatmentCourse.findFirst({ where: { id, userId } });
  if (!course) throw new TrackingError("We could not find that treatment.");

  return db.treatmentCourse.update({
    where: { id: course.id },
    data: { endDate: null, stopReason: null, stopReasonNote: null },
    include: COURSE_INCLUDE,
  });
}

