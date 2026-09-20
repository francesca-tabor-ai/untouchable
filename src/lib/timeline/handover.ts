import type { UrgentFlagTier } from "@/generated/prisma";

import { formatDate, toDateOnly } from "@/lib/tracking/dates";

import type { EventRecord, ObservationRecord, SymptomRecord } from "./contradictions";
import type { CandidateRecord } from "./matrix";
import { candidateProblem } from "./matrix";
import type { StandingFactRecord } from "./open-items";
import { SOURCE_SHORT, STANDING_FACT_ORDER, UNCONFIRMED } from "./records";
import { evaluateUrgentFlags, type FlagArea } from "./urgent-flags";

/**
 * The two things a person actually leaves with.
 *
 * Both are written to be **spoken**, not read silently. That is not a style preference: a
 * document written for the eye falls apart in the mouth, and somebody reading a bulleted
 * fragment down a phone line to a triage nurse at 7am sounds confused rather than organised.
 * So: whole sentences, short ones, and no word the person would stumble over.
 *
 * The ceilings are hard. 150 words is about fifty seconds of speech, which is roughly what a
 * triage call gives you before the other person needs to start asking. 600 words is one side
 * of A4, which is what gets read. Going over is not a small failure — a handover nobody
 * finishes is worse than a shorter one that gets read to the end, so when there is too much
 * to say this file drops material and says out loud that it did.
 *
 * **The candidate matrix is not in either of these and must never be added.** See
 * `matrix.ts` and DECISIONS.md PL-49. Candidates leave as questions — "could this be X?" —
 * and never as assertions.
 */

export const SHORT_SCRIPT_MAX_WORDS = 150;
export const LONG_SCRIPT_MAX_WORDS = 600;

export const STOP_LINE = "Stop and let them ask.";

export interface HandoverEvent extends EventRecord {
  outcome: string | null;
  provider: string | null;
  documentRef: string | null;
  flaggedTier: UrgentFlagTier | null;
}

export interface HandoverInput {
  person: { displayName: string | null; age: number | null };
  today: Date;
  symptoms: SymptomRecord[];
  observations: ObservationRecord[];
  events: HandoverEvent[];
  standingFacts: StandingFactRecord[];
  candidates: CandidateRecord[];
  areas?: readonly FlagArea[];
  /** FREE TEXT. Why they are ringing or attending, in their words. */
  reason: string | null;
  /** FREE TEXT. What they are asking for. */
  asking: string | null;
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ---------------------------------------------------------------------------
// Short script — phone triage
// ---------------------------------------------------------------------------

export interface ShortScript {
  sentences: string[];
  stopLine: string;
  wordCount: number;
  /**
   * Wordings that change what happens next, and why they do. Said inside the script; the
   * reason is printed underneath it, for the person, not for the clinician.
   */
  exactPhrases: { say: string; why: string }[];
  /** What triage will most likely ask. Never answered here — only what to have to hand. */
  likelyQuestions: { question: string; haveReady: string }[];
  /** Set when something had to be left out to stay inside fifty seconds. */
  omitted: string | null;
}

/**
 * Lead with the acute thing, never with the history.
 *
 * The ordering here is the difference between being triaged and being managed. A triage
 * clinician is deciding one thing in the first fifteen seconds, and a person who opens with
 * "so this started back in March" has spent those fifteen seconds on the least useful part.
 */
export function buildShortScript(input: HandoverInput): ShortScript {
  const alarming = mostAlarming(input);

  // Detail is dropped in a fixed order until it fits: lifestyle, then past conditions, then
  // medicines past the first three, then symptoms past the first.
  for (let level = 3; level >= 0; level -= 1) {
    const sentences = shortSentences(input, alarming, level);
    const wordCount = countWords([...sentences, STOP_LINE].join(" "));
    if (wordCount <= SHORT_SCRIPT_MAX_WORDS || level === 0) {
      return {
        sentences,
        stopLine: STOP_LINE,
        wordCount,
        exactPhrases: alarming?.say ? [{ say: alarming.say, why: alarming.why }] : [],
        likelyQuestions: LIKELY_TRIAGE_QUESTIONS,
        omitted:
          level < 3
            ? "Some of your history is left out of this one on purpose. A triage call is about now — the rest is in the longer handover."
            : null,
      };
    }
  }

  throw new Error("unreachable");
}

function shortSentences(
  input: HandoverInput,
  alarming: { say: string; why: string; plain: string } | null,
  level: number,
): string[] {
  const sentences: string[] = [];

  // 1. What is happening now, and when it started.
  const lead = leadSymptom(input);
  if (lead) {
    sentences.push(`I have ${lead.name.toLowerCase()}, and it ${startedPhrase(lead, input.today)}.`);
  } else if (input.reason) {
    sentences.push(`${sentence(input.reason)}`);
  } else {
    sentences.push("I am ringing about something I have been keeping a record of.");
  }

  // 2. The single most alarming feature, plainly.
  if (alarming) sentences.push(`The thing I am most worried about is ${alarming.plain}.`);

  // 3. Standing facts, compressed.
  sentences.push(...compressedFacts(input.standingFacts, level));

  // 4. What they are asking for.
  sentences.push(
    input.asking ? sentence(input.asking) : "I am asking what you think I should do next.",
  );

  return sentences;
}

/**
 * What to put in sentence two.
 *
 * Runs the person's own recent words back through the red flag engine rather than keeping a
 * second list. If one of those rules has a wording that changes a care pathway, that wording
 * is what goes in the script — "sudden hearing loss in one ear" and "my ear is ringing"
 * reach the same nurse and do not reach the same outcome.
 */
function mostAlarming(input: HandoverInput): { say: string; why: string; plain: string } | null {
  const recent = [...input.events]
    .filter((event) => event.supersededAt === null)
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
    .slice(0, 12);

  for (const event of recent) {
    const hits = evaluateUrgentFlags({
      text: [event.description, event.outcome ?? ""].join(" "),
      occurredAt: event.occurredAt,
      areas: input.areas,
      now: input.today,
    });
    const withWording = hits.find((hit) => hit.rule.sayExactly);
    if (withWording?.rule.sayExactly) {
      return {
        say: withWording.rule.sayExactly,
        why: withWording.rule.whySaying ?? "",
        plain: withWording.rule.sayExactly,
      };
    }
    if (hits.length > 0) {
      return { say: "", why: "", plain: shorten(event.description, 90).toLowerCase() };
    }
  }

  const worst = [...input.observations]
    .filter((row) => row.supersededAt === null && row.severity !== null)
    .sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0))[0];
  if (!worst) return null;

  const symptom = input.symptoms.find((row) => row.id === worst.userSymptomId);
  if (!symptom) return null;

  return {
    say: "",
    why: "",
    plain: `${symptom.name.toLowerCase()}, which I have recorded at ${worst.severity} out of 10`,
  };
}

function compressedFacts(facts: StandingFactRecord[], level: number): string[] {
  const active = facts.filter((fact) => fact.active);
  const of = (category: string) =>
    active.filter((fact) => fact.category === category).map((fact) => fact.value);

  const out: string[] = [];

  const allergies = of("allergy");
  out.push(
    allergies.length > 0
      ? `I am allergic to ${list(allergies)}.`
      : "I have no allergies that I know of.",
  );

  const medicines = of("current_medication");
  const shown = level >= 2 ? medicines : medicines.slice(0, 3);
  if (shown.length > 0) {
    out.push(
      `I take ${list(shown)}${shown.length < medicines.length ? ", and some others" : ""}.`,
    );
  }

  if (level >= 1) {
    const conditions = of("past_condition");
    if (conditions.length > 0) out.push(`I have ${list(conditions)}.`);
  }

  if (level >= 3) {
    const lifestyle = of("lifestyle");
    if (lifestyle.length > 0) out.push(`${sentence(list(lifestyle))}`);
  }

  return out;
}

/**
 * What triage tends to ask, and what to have within reach when they do.
 *
 * Deliberately not answered. A scripted answer to "have you had this before" is a scripted
 * answer given under pressure by somebody who cannot check it, and it goes into a clinical
 * record as though it were checked.
 */
const LIKELY_TRIAGE_QUESTIONS: { question: string; haveReady: string }[] = [
  {
    question: "How long has this been going on?",
    haveReady:
      "The date, or the honest answer that you are not sure. Do not round it to something tidy.",
  },
  {
    question: "Are you taking any medication?",
    haveReady: "The packets, or your repeat prescription list in the NHS App.",
  },
  {
    question: "Have you had anything like this before?",
    haveReady: "Roughly when, and what you were told at the time.",
  },
  {
    question: "Is anyone with you?",
    haveReady: "Whether you are on your own right now, and whether you could get to somewhere.",
  },
];

// ---------------------------------------------------------------------------
// Long script — consultation handover
// ---------------------------------------------------------------------------

export interface LongScript {
  header: string;
  standingFacts: { label: string; values: string[] }[];
  chronology: string[];
  currentStatus: string[];
  keyNegatives: string[];
  questions: string[];
  takeWithYou: string[];
  wordCount: number;
  omitted: string | null;
}

export function buildLongScript(input: HandoverInput): LongScript {
  const header = buildHeader(input);
  const facts = groupedFacts(input.standingFacts);
  const currentStatus = statusLines(input);
  const keyNegatives = negatives(input.standingFacts);
  const questions = buildQuestions(input);
  const takeWithYou = thingsToTake(input);

  const full = chronologyLines(input);
  let chronology = full;
  let omitted: string | null = null;

  const measure = (lines: string[]) =>
    countWords(
      [
        header,
        ...facts.flatMap((group) => [group.label, ...group.values]),
        ...lines,
        ...currentStatus,
        ...keyNegatives,
        ...questions,
        ...takeWithYou,
      ].join(" "),
    );

  // Trim from the middle. The beginning is how it started and the end is where it is now;
  // both are load-bearing. What goes is the repetitive stretch in between, and the document
  // says that it went rather than reading as though nothing happened for four months.
  while (measure(chronology) > LONG_SCRIPT_MAX_WORDS && chronology.length > 4) {
    const middle = Math.floor(chronology.length / 2);
    chronology = [...chronology.slice(0, middle), ...chronology.slice(middle + 1)];
    omitted = `Some entries between these dates are left out to keep this to one page. ${
      full.length - chronology.length
    } of ${full.length} are not shown.`;
  }

  return {
    header,
    standingFacts: facts,
    chronology,
    currentStatus,
    keyNegatives,
    questions,
    takeWithYou,
    wordCount: measure(chronology),
    omitted,
  };
}

function buildHeader(input: HandoverInput): string {
  const name = input.person.displayName?.trim() || "Not given";
  const age = input.person.age === null ? UNCONFIRMED : `${input.person.age}`;
  const reason = input.reason?.trim() || "Ongoing symptoms I have been keeping a record of";
  return `${name}, age ${age}. ${formatDate(input.today)}. ${sentence(reason)}`;
}

function groupedFacts(facts: StandingFactRecord[]): { label: string; values: string[] }[] {
  const active = facts.filter((fact) => fact.active);
  const labels: Record<string, string> = {
    allergy: "Allergies",
    current_medication: "Current medication",
    past_condition: "Past conditions",
    relevant_negative: "Relevant negatives",
    lifestyle: "Other",
  };

  return STANDING_FACT_ORDER.filter((category) => category !== "relevant_negative").map(
    (category) => {
      const values = active.filter((fact) => fact.category === category).map((fact) => fact.value);
      return {
        label: labels[category] ?? category,
        values:
          values.length > 0
            ? values
            : [category === "allergy" ? "None known" : "None recorded"],
      };
    },
  );
}

/**
 * The chronology.
 *
 * Every line that came from a memory says so. "Examination reported as normal — from
 * recollection, clinic letter not obtained" is honest and useful. "Examination normal",
 * written flat, is a clinical record this person has invented, and it will be read as one.
 */
function chronologyLines(input: HandoverInput): string[] {
  interface Line {
    when: Date;
    text: string;
  }
  const lines: Line[] = [];

  for (const symptom of input.symptoms) {
    if (!symptom.firstOnset) {
      lines.push({
        when: earliestObservation(input, symptom.id) ?? input.today,
        text: `${symptom.name} started — date ${UNCONFIRMED}.`,
      });
      continue;
    }
    lines.push({
      when: symptom.firstOnset,
      text: `${formatDate(symptom.firstOnset)} — ${symptom.name} started${
        symptom.firstOnsetConfidence === "unconfirmed" ? ` ${UNCONFIRMED}` : ""
      }.`,
    });
  }

  for (const event of input.events.filter((row) => row.supersededAt === null)) {
    const parts = [event.description.trim()];
    if (event.provider) parts.push(`(${event.provider})`);
    if (event.outcome) parts.push(`— ${event.outcome.trim()}`);

    const qualifier =
      event.source === "recollection" || event.source === "third_party"
        ? ` — ${SOURCE_SHORT[event.source]}${
            event.documentRef ? `, ${event.documentRef}` : ", not confirmed against a document"
          }`
        : "";

    lines.push({
      when: event.occurredAt,
      text: `${formatDate(event.occurredAt)} — ${parts.join(" ")}${qualifier}.`,
    });
  }

  return lines
    .sort((a, b) => a.when.getTime() - b.when.getTime())
    .map((line) => line.text);
}

function statusLines(input: HandoverInput): string[] {
  return input.symptoms.map((symptom) => {
    if (symptom.status === "resolved") {
      return symptom.resolvedDate
        ? `${symptom.name}: stopped on ${formatDate(symptom.resolvedDate)}.`
        : `${symptom.name}: stopped, date ${UNCONFIRMED}.`;
    }

    const assessed = input.events.some(
      (event) =>
        event.supersededAt === null &&
        (event.type === "appointment" || event.type === "test") &&
        event.description.toLowerCase().includes(symptom.name.toLowerCase().split(" ")[0]),
    );

    const state = symptom.status === "intermittent" ? "comes and goes" : "still happening";
    return `${symptom.name}: ${state}${assessed ? "." : ", never been assessed."}`;
  });
}

function negatives(facts: StandingFactRecord[]): string[] {
  const values = facts
    .filter((fact) => fact.active && fact.category === "relevant_negative")
    .map((fact) => fact.value);
  return values.length > 0 ? values : ["None recorded."];
}

/**
 * Three to five questions, in priority order.
 *
 * This is where candidates come out, and they come out as questions. "Could this be X, and
 * what would rule it out?" asks for the thing a person actually wants — a reason to stop
 * worrying about it — and leaves the clinician doing their job rather than arguing with a
 * list.
 */
function buildQuestions(input: HandoverInput): string[] {
  const questions: string[] = [];

  for (const candidate of input.candidates) {
    if (questions.length >= 3) break;
    if (candidate.status !== "live") continue;
    if (candidateProblem(candidate)) continue;
    questions.push(`Could this be ${candidate.name}? What would rule it out?`);
  }

  const unread = input.events.find(
    (event) =>
      event.supersededAt === null &&
      (event.type === "test" || event.type === "appointment") &&
      !event.outcome,
  );
  if (unread) {
    questions.push(
      `Can I have the result from ${formatDate(unread.occurredAt)}? I have never been told what it said.`,
    );
  }

  const unassessed = input.symptoms.find(
    (symptom) => symptom.status !== "resolved" && !symptom.firstOnset,
  );
  if (unassessed) {
    questions.push(
      `I cannot pin down when ${unassessed.name.toLowerCase()} started. Does that change what you would do?`,
    );
  }

  questions.push("What would make you want to see me again sooner?");

  return questions.slice(0, 5);
}

function thingsToTake(input: HandoverInput): string[] {
  const out: string[] = ["This page, printed or on your phone."];

  const medicines = input.standingFacts.filter(
    (fact) => fact.active && fact.category === "current_medication",
  );
  if (medicines.length > 0) {
    out.push("The packets of everything you take, including anything you bought yourself.");
  }

  const documents = input.events.filter(
    (event) => event.supersededAt === null && event.documentRef,
  );
  for (const event of documents.slice(0, 3)) {
    out.push(`${event.documentRef} — from ${formatDate(event.occurredAt)}.`);
  }

  const unsure = input.symptoms.filter(
    (symptom) => symptom.status !== "resolved" && !symptom.firstOnset,
  );
  if (unsure.length > 0) {
    out.push(
      "Anything that would pin down when this started — a message, a photo, a calendar entry.",
    );
  }

  return out;
}

export function longScriptMarkdown(script: LongScript): string {
  const lines: string[] = [script.header, ""];

  for (const group of script.standingFacts) {
    lines.push(`**${group.label}:** ${group.values.join("; ")}`);
  }
  lines.push("", "**What happened, in order**");
  lines.push(...script.chronology.map((line) => `- ${line}`));
  if (script.omitted) lines.push(`- ${script.omitted}`);

  lines.push("", "**Where it is now**");
  lines.push(...script.currentStatus.map((line) => `- ${line}`));

  lines.push("", "**Things I do not have**");
  lines.push(...script.keyNegatives.map((line) => `- ${line}`));

  lines.push("", "**What I want to ask**");
  lines.push(...script.questions.map((line, index) => `${index + 1}. ${line}`));

  return lines.join("\n");
}

// ---------------------------------------------------------------------------

function leadSymptom(input: HandoverInput): SymptomRecord | null {
  const active = input.symptoms.filter((symptom) => symptom.status !== "resolved");
  if (active.length === 0) return null;

  const severityOf = (symptomId: string) =>
    Math.max(
      0,
      ...input.observations
        .filter((row) => row.supersededAt === null && row.userSymptomId === symptomId)
        .map((row) => row.severity ?? 0),
    );

  return [...active].sort((a, b) => severityOf(b.id) - severityOf(a.id))[0];
}

function startedPhrase(symptom: SymptomRecord, today: Date): string {
  if (!symptom.firstOnset) return "started at some point I cannot pin down";

  const days = Math.round(
    (toDateOnly(today).getTime() - toDateOnly(symptom.firstOnset).getTime()) / 86_400_000,
  );
  const approximate = symptom.firstOnsetConfidence !== "confirmed";
  const when =
    days < 14
      ? `${days} days ago`
      : days < 70
        ? `about ${Math.round(days / 7)} weeks ago`
        : `about ${Math.round(days / 30)} months ago`;

  return `started ${approximate ? "roughly " : ""}${when}`;
}

function earliestObservation(input: HandoverInput, userSymptomId: string): Date | null {
  const dates = input.observations
    .filter((row) => row.supersededAt === null && row.userSymptomId === userSymptomId)
    .map((row) => row.occurredAt.getTime());
  return dates.length > 0 ? new Date(Math.min(...dates)) : null;
}

function list(values: string[]): string {
  if (values.length === 0) return "";
  if (values.length === 1) return values[0];
  return `${values.slice(0, -1).join(", ")} and ${values[values.length - 1]}`;
}

function sentence(text: string): string {
  const trimmed = text.trim();
  const capitalised = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(capitalised) ? capitalised : `${capitalised}.`;
}

function shorten(text: string, max: number): string {
  const clean = text.trim().replace(/\s+/g, " ");
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}
