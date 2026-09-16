import { db } from "@/lib/db";

import type { DraftScope } from "./drafts";
import { loadVersion, type VersionView } from "./versions";

/**
 * Check-ins, as far as this milestone is concerned: reading the ones somebody has been given
 * and letting them answer.
 *
 * Creating them is the scheduling milestone's job (brief 7.4) — it reads `scheduleJson` off a
 * published version and writes `ScheduledCheckIn` rows. Nothing here creates one, and nothing
 * here decides when one is due. This is the answering half.
 */

/**
 * Where a half-finished answer to this check-in is kept.
 *
 * Deliberately not in the actions file: a `"use server"` module may only export async
 * functions, and a constant or a plain function exported from one fails the build with a
 * message naming a page rather than the file — AGENTS.md section 9.
 */
export function draftScopeForCheckIn(checkInId: string): DraftScope {
  return { key: `checkin-${checkInId}`, path: `/check-ins/${checkInId}` };
}

export interface DueCheckIn {
  id: string;
  dueAt: Date;
  questionnaireTitle: string;
  versionId: string;
  version: number;
  /** Set when the check-in is anchored to a treatment rather than the general cycle. */
  treatmentCourseId: string | null;
}

/** The check-ins waiting for this person, oldest first. */
export async function pendingCheckIns(userId: string): Promise<DueCheckIn[]> {
  const rows = await db.scheduledCheckIn.findMany({
    where: { userId, status: "pending" },
    orderBy: { dueAt: "asc" },
    select: {
      id: true,
      dueAt: true,
      treatmentCourseId: true,
      questionnaireVersion: {
        select: { id: true, version: true, questionnaire: { select: { title: true } } },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    dueAt: row.dueAt,
    questionnaireTitle: row.questionnaireVersion.questionnaire.title,
    versionId: row.questionnaireVersion.id,
    version: row.questionnaireVersion.version,
    treatmentCourseId: row.treatmentCourseId,
  }));
}

/**
 * One check-in, with the questions it asks — for the person it belongs to and nobody else.
 *
 * Scoped by user id in the query. Somebody else's check-in is simply not found.
 */
export async function ownCheckIn(
  userId: string,
  checkInId: string,
): Promise<{ checkIn: DueCheckIn; status: string; version: VersionView } | null> {
  const row = await db.scheduledCheckIn.findFirst({
    where: { id: checkInId, userId },
    select: {
      id: true,
      dueAt: true,
      status: true,
      treatmentCourseId: true,
      questionnaireVersionId: true,
      questionnaireVersion: {
        select: { version: true, questionnaire: { select: { title: true } } },
      },
    },
  });
  if (!row) return null;

  const version = await loadVersion(row.questionnaireVersionId);
  if (!version) return null;

  return {
    checkIn: {
      id: row.id,
      dueAt: row.dueAt,
      questionnaireTitle: row.questionnaireVersion.questionnaire.title,
      versionId: row.questionnaireVersionId,
      version: row.questionnaireVersion.version,
      treatmentCourseId: row.treatmentCourseId,
    },
    status: row.status,
    version,
  };
}
