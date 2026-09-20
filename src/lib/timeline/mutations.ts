import type { MatrixFit, UrgentFlagTier } from "@/generated/prisma";

import { db } from "@/lib/db";

import { findContradictions, type Contradiction } from "./contradictions";
import type {
  CandidateInput,
  ObservationInput,
  StandingFactInput,
  TimelineEventInput,
} from "./records";
import { loadTimeline } from "./queries";
import { activeFlag, evaluateUrgentFlags, type FlagArea, type UrgentFlagHit } from "./urgent-flags";

/**
 * Writing to the timeline.
 *
 * Every write goes through one of these, and every one of them does the same three things in
 * the same order:
 *
 *   1. **Check the red flags first**, on the person's own words, before the row exists.
 *   2. **Write the row.** Including when a flag fired — an entry describing something
 *      frightening is exactly the entry that must not be lost because the screen changed.
 *   3. **Scan for contradictions** and hand them back. Never resolve one here.
 *
 * The order matters for step 2. An earlier draft showed the flag screen and abandoned the
 * write, on the reasoning that somebody being sent to 999 has better things to do than save
 * a form. What that actually produced was a person who rang 111, was told to keep a record,
 * came back, and found the entry gone.
 */

export interface WriteResult {
  id: string;
  /** Every rule that matched. The caller shows the flag and nothing else when one is live. */
  flags: UrgentFlagHit[];
  /** The live one, if there is one. */
  urgent: UrgentFlagHit | null;
  /** Found on this write. Surfaced, never acted on. */
  contradictions: Contradiction[];
}

export async function addObservation(
  userId: string,
  input: ObservationInput,
  areas: readonly FlagArea[] = [],
): Promise<WriteResult> {
  const flags = evaluateUrgentFlags({
    text: [input.character, input.triggers, input.relievingFactors, input.duration]
      .filter(Boolean)
      .join(". "),
    occurredAt: input.occurredAt,
    areas,
  });

  // The symptom has to belong to this person. A guard in the action is not a substitute for
  // the query refusing to write against somebody else's row.
  const symptom = await db.userSymptom.findFirst({
    where: { id: input.userSymptomId, userId },
    select: { id: true },
  });
  if (!symptom) throw new Error("That symptom is not one of yours.");

  const created = await db.observation.create({
    data: { userId, ...input },
    select: { id: true },
  });

  return { id: created.id, flags, urgent: activeFlag(flags), ...(await scan(userId)) };
}

export async function addTimelineEvent(
  userId: string,
  input: TimelineEventInput,
  areas: readonly FlagArea[] = [],
): Promise<WriteResult> {
  const flags = evaluateUrgentFlags({
    text: [input.description, input.outcome].filter(Boolean).join(". "),
    occurredAt: input.occurredAt,
    areas,
  });

  const flaggedTier: UrgentFlagTier | null = flags[0]?.tier ?? null;

  const created = await db.timelineEvent.create({
    data: { userId, ...input, flaggedTier },
    select: { id: true },
  });

  return { id: created.id, flags, urgent: activeFlag(flags), ...(await scan(userId)) };
}

export async function addStandingFact(userId: string, input: StandingFactInput): Promise<string> {
  const created = await db.standingFact.create({
    data: { userId, ...input },
    select: { id: true },
  });
  return created.id;
}

export async function retireStandingFact(userId: string, id: string): Promise<void> {
  // Kept, not deleted. "I stopped taking that in June" is a clinical fact.
  await db.standingFact.updateMany({ where: { id, userId }, data: { active: false } });
}

export async function addCandidate(userId: string, input: CandidateInput): Promise<string> {
  const created = await db.candidate.create({ data: { userId, ...input }, select: { id: true } });
  return created.id;
}

export async function setAssessment(
  userId: string,
  input: { candidateId: string; userSymptomId: string; fit: MatrixFit; note: string | null },
): Promise<void> {
  const [candidate, symptom] = await Promise.all([
    db.candidate.findFirst({ where: { id: input.candidateId, userId }, select: { id: true } }),
    db.userSymptom.findFirst({ where: { id: input.userSymptomId, userId }, select: { id: true } }),
  ]);
  if (!candidate || !symptom) throw new Error("That is not one of yours.");

  await db.candidateAssessment.upsert({
    where: {
      candidateId_userSymptomId: {
        candidateId: input.candidateId,
        userSymptomId: input.userSymptomId,
      },
    },
    create: input,
    update: { fit: input.fit, note: input.note },
  });
}

/**
 * Ruling a candidate down.
 *
 * `ruled_down` rather than `excluded` is the default for a reason: conditions get set aside
 * on partial evidence all the time, and the person who needs it six months later is the
 * person who watched it disappear off the screen. The reason and what would reopen it are
 * required, and the column stays visible.
 */
export async function ruleDownCandidate(
  userId: string,
  id: string,
  input: { status: "ruled_down" | "excluded"; excludedBy: string },
): Promise<void> {
  await db.candidate.updateMany({
    where: { id, userId },
    data: { status: input.status, excludedBy: input.excludedBy },
  });
}

export async function reopenCandidate(userId: string, id: string): Promise<void> {
  await db.candidate.updateMany({
    where: { id, userId },
    data: { status: "live", excludedBy: null },
  });
}

export async function updateSymptomDetail(
  userId: string,
  userSymptomId: string,
  input: {
    bodySite?: string | null;
    laterality?: "left" | "right" | "bilateral" | "not_applicable" | null;
    firstOnset?: Date | null;
    firstOnsetConfidence?: "confirmed" | "probable" | "unconfirmed";
    status?: "active" | "intermittent" | "resolved";
    resolvedDate?: Date | null;
  },
): Promise<Contradiction[]> {
  await db.userSymptom.updateMany({ where: { id: userSymptomId, userId }, data: input });
  return (await scan(userId)).contradictions;
}

/**
 * Applying a resolution the person has confirmed.
 *
 * The losing record is marked, dated and given a reason. It is never deleted. Somebody
 * reading this back in a year needs to be able to see that the record once said March,
 * because "I was sure it was March until I found the message" is itself worth knowing.
 */
export async function supersedeRecord(
  userId: string,
  input: {
    field: "observation" | "event";
    supersedeId: string;
    /** The record that won, when there is one. */
    keepId: string | null;
    reason: string;
  },
): Promise<void> {
  const data = {
    supersededAt: new Date(),
    supersededById: input.keepId,
    supersededReason: input.reason,
  };

  if (input.field === "observation") {
    await db.observation.updateMany({ where: { id: input.supersedeId, userId }, data });
    return;
  }
  await db.timelineEvent.updateMany({ where: { id: input.supersedeId, userId }, data });
}

export async function deleteObservation(userId: string, id: string): Promise<void> {
  await db.observation.deleteMany({ where: { id, userId } });
}

export async function deleteTimelineEvent(userId: string, id: string): Promise<void> {
  await db.timelineEvent.deleteMany({ where: { id, userId } });
}

async function scan(userId: string): Promise<{ contradictions: Contradiction[] }> {
  const timeline = await loadTimeline(userId);
  return {
    contradictions: findContradictions({
      symptoms: timeline.symptoms,
      observations: timeline.observations,
      events: timeline.events,
    }),
  };
}
