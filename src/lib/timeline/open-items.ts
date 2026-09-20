import type { RecordConfidence, TimelineEventType } from "@/generated/prisma";

import { formatDate } from "@/lib/tracking/dates";

import type { EventRecord, ObservationRecord, SymptomRecord } from "./contradictions";

/**
 * Everything the record does not actually know, ordered by how much it would change a
 * clinical conversation.
 *
 * The ordering is the whole point. A list of unknowns sorted by date, or by when they were
 * entered, is a list nobody works through. Sorted by consequence it becomes a short set of
 * errands — ring the surgery for the letter, find the packet in the drawer — and each one
 * that gets done removes an `[UNCONFIRMED]` from the document somebody will read.
 *
 * What sits at the top and why: an onset date. It decides whether a symptom is three weeks
 * old or seven months old, and almost every pathway in medicine forks on that.
 */

export interface OpenItem {
  key: string;
  /** The unknown, as a short phrase. */
  what: string;
  whyItMatters: string;
  whatWouldSettleIt: string;
  weight: number;
}

export interface StandingFactRecord {
  id: string;
  category: string;
  value: string;
  active: boolean;
}

export function openItems(input: {
  symptoms: SymptomRecord[];
  observations: ObservationRecord[];
  events: EventRecord[];
  standingFacts: StandingFactRecord[];
}): OpenItem[] {
  const items: OpenItem[] = [];
  const live = <T extends { supersededAt: Date | null }>(rows: T[]) =>
    rows.filter((row) => row.supersededAt === null);

  for (const symptom of input.symptoms) {
    if (symptom.status === "resolved") continue;

    if (!symptom.firstOnset) {
      items.push({
        key: `onset-missing:${symptom.id}`,
        what: `When ${symptom.name.toLowerCase()} started`,
        whyItMatters:
          "How long something has been going on changes what happens about it more than almost anything else you can say.",
        whatWouldSettleIt:
          "A message, a photo, a calendar entry or a diary from around the time — something with a date on it that is not a memory.",
        weight: 100,
      });
    } else if (symptom.firstOnsetConfidence === "unconfirmed") {
      items.push({
        key: `onset-unsure:${symptom.id}`,
        what: `Whether ${symptom.name.toLowerCase()} really started on ${formatDate(symptom.firstOnset)}`,
        whyItMatters:
          "You have given a date but marked it as one you are not sure of, so it reaches a clinician as unconfirmed.",
        whatWouldSettleIt: "Anything dated from around that week would settle it either way.",
        weight: 90,
      });
    }
  }

  for (const event of live(input.events)) {
    if ((event.type === "test" || event.type === "appointment") && !hasOutcome(event)) {
      items.push({
        key: `outcome:${event.id}`,
        what: `What came of ${shorten(event.description)} on ${formatDate(event.occurredAt)}`,
        whyItMatters:
          "A test with no result recorded is either a result nobody has told you or a result you have been told and cannot repeat accurately. Both are worth closing.",
        whatWouldSettleIt:
          "Ask the surgery for a copy of the result or the letter. You are entitled to it.",
        weight: 80,
      });
    }

    if (event.type === "medication_change" && event.confidence === "unconfirmed") {
      items.push({
        key: `medication-date:${event.id}`,
        what: `The date of ${shorten(event.description)}`,
        whyItMatters:
          "Whether a symptom started before or after a medicine changed is a question with two different answers.",
        whatWouldSettleIt:
          "The date on the packet, the pharmacy label, or your prescription history in the NHS App.",
        weight: 75,
      });
    }

    if (event.confidence !== "unconfirmed" || event.type === "medication_change") continue;
    items.push({
      key: `event-unsure:${event.id}`,
      what: shorten(event.description),
      whyItMatters: "You marked this as something you are not sure about.",
      whatWouldSettleIt: "A letter, a message or an appointment record from the time.",
      weight: 50,
    });
  }

  if (!input.standingFacts.some((fact) => fact.active && fact.category === "allergy")) {
    items.push({
      key: "allergies-blank",
      what: "Allergies",
      whyItMatters:
        "Nothing is recorded here at all. \"None that I know of\" is a real answer and it is a different answer from never having been asked — and it is the first thing read in any handover.",
      whatWouldSettleIt: "Add an allergy, or add \"none known\" so the blank is not ambiguous.",
      weight: 60,
    });
  }

  const unsure = live(input.observations).filter((row) => row.confidence === "unconfirmed");
  if (unsure.length > 0) {
    items.push({
      key: "observations-unsure",
      what: `${unsure.length} ${unsure.length === 1 ? "entry" : "entries"} you marked as not sure`,
      whyItMatters:
        "Each one reaches a clinician marked unconfirmed, which is honest but takes up room in a short appointment.",
      whatWouldSettleIt:
        "Going back over them once, now, is easier than doing it in front of somebody.",
      weight: 30,
    });
  }

  return items.sort((a, b) => b.weight - a.weight);
}

function hasOutcome(event: { description: string } & Partial<{ outcome: string | null }>): boolean {
  const outcome = (event as { outcome?: string | null }).outcome;
  return typeof outcome === "string" && outcome.trim().length > 0;
}

function shorten(text: string, max = 60): string {
  const clean = text.trim().replace(/\s+/g, " ");
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

/** Re-exported so callers building an item list do not need the Prisma types directly. */
export type { RecordConfidence, TimelineEventType };
