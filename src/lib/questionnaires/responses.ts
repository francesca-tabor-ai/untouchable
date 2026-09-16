import { db } from "@/lib/db";

import { answersFrom, validateAnswers, type AnswerProblems, type Answers, type RawAnswers } from "./answers";
import { evaluateRedFlags, type RedFlagHit } from "./red-flags";
import { scoreAnswers, type Score } from "./scoring";
import { loadVersion, type VersionView } from "./versions";

/**
 * Writing and reading somebody's answers.
 *
 * Every response records the exact version answered. That is the whole point of versioning
 * a questionnaire: a score means nothing unless you know which questions produced it, and a
 * question can be reworded a year later.
 *
 * Nothing is written until the answers have been checked against that version's items, so
 * there is no way to end up with a response that does not fit the questions it claims to
 * answer.
 *
 * Consent is checked by the caller — `requireTrackingConsent` next to `requireAdult` — on
 * every page and every action. This module is the domain layer and is never reached from a
 * route without both.
 */

export interface SaveResponseInput {
  userId: string;
  versionId: string;
  /** Raw, as it came off the form. Checked here, never trusted. */
  answers: RawAnswers;
  /** The scheduled check-in being answered, if this is one. Null for the baseline. */
  checkInId?: string | null;
}

export type SaveResponseResult =
  | {
      ok: true;
      responseId: string;
      score: Score;
      /** Which red flag rules matched. The safety milestone decides what to do with these. */
      redFlags: RedFlagHit[];
    }
  | { ok: false; problems: AnswerProblems };

/**
 * Record a set of answers.
 *
 * Red flag hits are returned, not acted on. This function shows nobody anything, contacts
 * nobody, and writes no `SafetyEvent` — brief 7.8 gives the signposting screen its own
 * milestone, and that is the only thing that decides what a person sees.
 */
export async function saveResponse(input: SaveResponseInput): Promise<SaveResponseResult> {
  const version = await loadVersion(input.versionId);
  if (!version) {
    return { ok: false, problems: { form: "We could not find those questions. Please start again." } };
  }
  if (!version.publishedAt) {
    return {
      ok: false,
      problems: { form: "Those questions are not in use, so your answers have not been saved." },
    };
  }

  const validated = validateAnswers(version.definition.items, input.answers);
  if (!validated.ok) return { ok: false, problems: validated.problems };

  const checkIn = await resolveCheckIn(input, version);
  if (checkIn && "problem" in checkIn) return { ok: false, problems: { form: checkIn.problem } };

  const score = scoreAnswers(version.definition.scoring, validated.answers);
  const redFlags = evaluateRedFlags(version.row, validated.answers);

  const response = await db.response.create({
    data: {
      userId: input.userId,
      questionnaireVersionId: version.id,
      checkInId: checkIn?.id ?? null,
      answersJson: validated.answers,
      score: score.value,
    },
    select: { id: true },
  });

  if (checkIn) {
    await db.scheduledCheckIn.update({
      where: { id: checkIn.id },
      data: { status: "completed" },
    });
  }

  return { ok: true, responseId: response.id, score, redFlags };
}

async function resolveCheckIn(
  input: SaveResponseInput,
  version: VersionView,
): Promise<{ id: string } | { problem: string } | null> {
  if (!input.checkInId) return null;

  const checkIn = await db.scheduledCheckIn.findUnique({
    where: { id: input.checkInId },
    select: { id: true, userId: true, questionnaireVersionId: true, status: true },
  });

  // Somebody else's check-in is simply not found, as far as this person is concerned.
  if (!checkIn || checkIn.userId !== input.userId) {
    return { problem: "We could not find that check-in." };
  }
  if (checkIn.questionnaireVersionId !== version.id) {
    return { problem: "Those answers do not belong to that check-in." };
  }
  if (checkIn.status === "completed") {
    return { problem: "That check-in has already been answered." };
  }
  return { id: checkIn.id };
}

export interface ResponseSummary {
  id: string;
  completedAt: Date;
  /** The number, with no comment on it of any kind. */
  score: number | null;
  questionnaireKey: string;
  title: string;
  version: number;
}

/**
 * Somebody's own answers, newest first.
 *
 * A date and a number. Nothing here says whether a score is high, low, better or worse, and
 * nothing that consumes it may add that — brief principle 7, AGENTS.md rule 9.
 */
export async function responseHistory(userId: string, take = 50): Promise<ResponseSummary[]> {
  const rows = await db.response.findMany({
    where: { userId },
    orderBy: { completedAt: "desc" },
    take,
    select: {
      id: true,
      completedAt: true,
      score: true,
      questionnaireVersion: {
        select: { version: true, questionnaire: { select: { key: true, title: true } } },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    completedAt: row.completedAt,
    score: row.score,
    questionnaireKey: row.questionnaireVersion.questionnaire.key,
    title: row.questionnaireVersion.questionnaire.title,
    version: row.questionnaireVersion.version,
  }));
}

/**
 * One response, with the answers, for the person who wrote it and nobody else.
 *
 * Scoped by user id in the query rather than checked afterwards: free text written into a
 * questionnaire is only ever seen by its author, and a query that could return somebody
 * else's row is one refactor away from a leak.
 */
export async function ownResponse(
  userId: string,
  responseId: string,
): Promise<{ summary: ResponseSummary; answers: Answers; version: VersionView } | null> {
  const row = await db.response.findFirst({
    where: { id: responseId, userId },
    select: {
      id: true,
      completedAt: true,
      score: true,
      answersJson: true,
      questionnaireVersionId: true,
    },
  });
  if (!row) return null;

  const version = await loadVersion(row.questionnaireVersionId);
  if (!version) return null;

  return {
    summary: {
      id: row.id,
      completedAt: row.completedAt,
      score: row.score,
      questionnaireKey: version.questionnaireKey,
      title: version.title,
      version: version.version,
    },
    answers: answersFrom(row.answersJson),
    version,
  };
}
