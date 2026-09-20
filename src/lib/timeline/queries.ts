import { db } from "@/lib/db";

import { findContradictions, type Contradiction } from "./contradictions";
import { buildMatrix, type Matrix } from "./matrix";
import { openItems, type OpenItem } from "./open-items";

/**
 * Reading somebody's timeline.
 *
 * One query set, loaded together, because every view of this data needs nearly all of it:
 * the contradiction scan needs the symptoms to check the observations against, the open
 * items list needs the standing facts to notice that allergies are blank, and the handover
 * needs the lot. Loading it in pieces produced three subtly different versions of "the
 * timeline" in the first draft of this file.
 *
 * Superseded rows are read, not filtered out in SQL. They are wanted on screen, greyed, with
 * what replaced them — that a record once said something different is a real fact about this
 * person's account of their illness, and hiding it puts us back where we started.
 */

export async function loadTimeline(userId: string) {
  const [symptomLinks, observations, events, standingFacts, candidates, assessments] =
    await Promise.all([
      db.userSymptom.findMany({
        where: { userId },
        include: { symptom: true },
        orderBy: { createdAt: "asc" },
      }),
      db.observation.findMany({ where: { userId }, orderBy: { occurredAt: "desc" } }),
      db.timelineEvent.findMany({ where: { userId }, orderBy: { occurredAt: "desc" } }),
      db.standingFact.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
      db.candidate.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
      db.candidateAssessment.findMany({ where: { candidate: { userId } } }),
    ]);

  const symptoms = symptomLinks.map((link) => ({
    id: link.id,
    name: link.symptom.name,
    bodySite: link.bodySite,
    laterality: link.laterality,
    firstOnset: link.firstOnset,
    firstOnsetConfidence: link.firstOnsetConfidence,
    status: link.status,
    resolvedDate: link.resolvedDate,
    active: link.active,
  }));

  return { symptoms, observations, events, standingFacts, candidates, assessments };
}

export type Timeline = Awaited<ReturnType<typeof loadTimeline>>;

export interface TimelineReview {
  contradictions: Contradiction[];
  openItems: OpenItem[];
  matrix: Matrix;
}

/** The three derived views, from one already-loaded timeline. */
export function reviewTimeline(timeline: Timeline): TimelineReview {
  return {
    contradictions: findContradictions({
      symptoms: timeline.symptoms,
      observations: timeline.observations,
      events: timeline.events,
    }),
    openItems: openItems({
      symptoms: timeline.symptoms,
      observations: timeline.observations,
      events: timeline.events,
      standingFacts: timeline.standingFacts,
    }),
    matrix: buildMatrix({
      symptoms: timeline.symptoms.filter((symptom) => symptom.active),
      candidates: timeline.candidates,
      assessments: timeline.assessments,
    }),
  };
}

/**
 * Everything, as the person's own data.
 *
 * Health data is special category data and the answer to "can I have it all back" is yes,
 * completely, without asking why. Free text is included here on purpose — this is the person
 * receiving their own words, which is the opposite case from a research export, where free
 * text never leaves under any circumstances (AGENTS.md rule 7).
 */
export async function exportTimeline(userId: string) {
  const timeline = await loadTimeline(userId);
  return {
    exportedAt: new Date().toISOString(),
    note: "Your own records, in full. Dates are the dates you gave.",
    ...timeline,
  };
}

/**
 * Remove the whole timeline and nothing else.
 *
 * Separate from account deletion on purpose: somebody may want the timeline gone and the
 * account kept. It is genuinely complete — superseded rows included, which is the row most
 * likely to be left behind by a delete written in a hurry.
 */
export async function deleteTimeline(userId: string): Promise<void> {
  await db.$transaction([
    db.candidateAssessment.deleteMany({ where: { candidate: { userId } } }),
    db.candidate.deleteMany({ where: { userId } }),
    db.observation.deleteMany({ where: { userId } }),
    db.timelineEvent.deleteMany({ where: { userId } }),
    db.standingFact.deleteMany({ where: { userId } }),
  ]);
}
