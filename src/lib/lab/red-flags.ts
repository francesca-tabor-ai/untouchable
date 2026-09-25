import { evaluateUrgentFlags } from "@/lib/timeline/urgent-flags";

import type { RedFlagQuestion } from "./checkin";
import type { LabCheckInRecord } from "./types";

/**
 * The Habit Lab's red-flag banner.
 *
 * Someone treating their insomnia as an experiment is also someone with long-standing
 * tinnitus after labyrinthitis, and the experiment frame makes it easy to file a new ear
 * symptom as "a bad night" and carry on. A small number of changes should not wait for the
 * end of a fourteen-day intervention period, and this module decides which.
 *
 * Three sources, any one of which is enough:
 *
 * 1. **The tick boxes** in `RED_FLAG_QUESTIONS`. The floor.
 * 2. **The note**, read by the timeline's own engine (`timeline/urgent-flags.ts`) with the ear
 *    and headache overlays, plus two ear patterns that engine does not carry. People do not
 *    tick boxes; they write "left ear has gone whooshy".
 * 3. **The dizziness score** set against the person's own recent days. A jump from their usual
 *    to severe is the "worsening dizziness" the spec asks for, and it can only be seen from
 *    the numbers.
 *
 * What this never does is say what the symptom *is*. The banner says what we noticed, in the
 * person's terms, and where to go. It does not diagnose, and a check-in that trips no rule is
 * not a clean bill of health — the safety footer is on every page for that reason.
 *
 * When a flag fires, the check-in is still saved, the banner replaces the saved message, and
 * the route records a `SafetyEvent` and suppresses donation prompts (AGENTS.md rule 5).
 */

/** Most serious first. */
export type LabFlagTier = "emergency" | "urgent" | "prompt";

export interface LabFlag {
  key: string;
  tier: LabFlagTier;
  /** Said back plainly. Never a conclusion about what it is. */
  noticed: string;
}

export interface LabFlagResult {
  tier: LabFlagTier;
  flags: LabFlag[];
  /** What to do, for the most serious tier. */
  action: string;
  /** Present for emergency tier only: the 999 sentence goes first and alone. */
  callNow: boolean;
}

const QUESTION_FLAGS: Record<RedFlagQuestion, LabFlag> = {
  facial_weakness: {
    key: "facial_weakness",
    tier: "emergency",
    noticed: "You said your face feels weak, droopy or numb.",
  },
  sudden_hearing_loss: {
    key: "sudden_hearing_loss",
    tier: "urgent",
    noticed: "You said your hearing suddenly went down.",
  },
  severe_headache: {
    key: "severe_headache",
    tier: "urgent",
    noticed: "You said you have a severe headache.",
  },
  severe_dizziness: {
    key: "severe_dizziness",
    tier: "urgent",
    noticed: "You said you have new dizziness that is severe, or much worse than usual.",
  },
  one_sided_tinnitus: {
    key: "one_sided_tinnitus",
    tier: "prompt",
    noticed: "You said your tinnitus is now on one side only.",
  },
  pulsing_tinnitus: {
    key: "pulsing_tinnitus",
    tier: "prompt",
    noticed: "You said your tinnitus beats in time with your heart.",
  },
};

/** Ear changes the timeline engine does not look for, in the words people actually use. */
const NOTE_EAR_PATTERNS: { flag: LabFlag; patterns: RegExp[] }[] = [
  {
    flag: QUESTION_FLAGS.pulsing_tinnitus,
    patterns: [
      /\b(puls\w*|throb\w*|whoosh\w*|heartbeat|heart ?beat|in time with my (heart|pulse))\b[^.]{0,40}\b(ear|tinnitus|ringing|noise)\b/i,
      /\b(ear|tinnitus|ringing|noise)\b[^.]{0,40}\b(puls\w*|throb\w*|whoosh\w*|heartbeat|in time with my (heart|pulse))\b/i,
    ],
  },
  {
    flag: QUESTION_FLAGS.one_sided_tinnitus,
    patterns: [
      /\b(tinnitus|ringing|noise)\b[^.]{0,30}\bonly in (my|the) (left|right) ear\b/i,
      /\b(tinnitus|ringing)\b[^.]{0,20}\b(moved|gone|switched) to (one side|my left|my right|the left|the right)\b/i,
    ],
  },
];

const NEGATED = /\b(no|not|n'?t|never|without)\b[^.]{0,12}$/i;

/** Severe on this scale. */
export const SEVERE_DIZZINESS = 7;
/** How far above the person's own usual counts as a jump. */
export const DIZZINESS_JUMP = 3;
/** How many earlier days make a "usual". Fewer than this and we do not guess. */
export const DIZZINESS_USUAL_DAYS = 3;

const ACTIONS: Record<LabFlagTier, string> = {
  emergency:
    "Call 999 now. Sudden weakness or numbness in the face needs checking straight away, even if it is starting to pass.",
  urgent:
    "Get medical help today. Call 111 or use NHS 111 online. Sudden hearing loss in particular is time-sensitive, so please do not wait to see if it passes. If a headache came on suddenly and severely, like being hit on the head, call 999.",
  prompt:
    "Please book to see your GP in the next few days, and tell them this is new. It is worth having looked at, and it is not something to keep running an experiment through.",
};

export function evaluateLabRedFlags(input: {
  checkIn: Pick<LabCheckInRecord, "newSymptoms" | "note" | "scores">;
  /** Earlier check-ins, any order. Only their dizziness scores are read. */
  history: Pick<LabCheckInRecord, "date" | "scores">[];
  now?: Date;
}): LabFlagResult | null {
  const { checkIn, history, now = new Date() } = input;
  const flags = new Map<string, LabFlag>();
  const add = (flag: LabFlag) => {
    if (!flags.has(flag.key)) flags.set(flag.key, flag);
  };

  for (const answer of checkIn.newSymptoms) {
    const flag = QUESTION_FLAGS[answer as RedFlagQuestion];
    if (flag) add(flag);
  }

  const note = checkIn.note ?? "";
  if (note.trim().length > 0) {
    for (const hit of evaluateUrgentFlags({
      text: note,
      occurredAt: now,
      areas: ["ear", "headache"],
      now,
    })) {
      add({
        key: `note_${hit.rule.key}`,
        tier: hit.tier === "emergency" ? "emergency" : "urgent",
        noticed: hit.rule.noticed,
      });
    }

    for (const { flag, patterns } of NOTE_EAR_PATTERNS) {
      if (patterns.some((pattern) => matchesUnnegated(note, pattern))) add(flag);
    }
  }

  const jump = dizzinessJump(checkIn.scores.dizziness ?? null, history);
  if (jump && !flags.has("severe_dizziness")) {
    add({
      key: "dizziness_jump",
      tier: "urgent",
      noticed: `You scored dizziness ${jump.today} out of 10. Over your last few check-ins it was usually around ${jump.usual}.`,
    });
  }

  if (flags.size === 0) return null;

  const ordered = [...flags.values()].sort((a, b) => rank(b.tier) - rank(a.tier));
  const tier = ordered[0].tier;
  return { tier, flags: ordered, action: ACTIONS[tier], callNow: tier === "emergency" };
}

/**
 * Today's dizziness against the median of the most recent earlier scores. Median, not mean, so
 * one bad day last week does not raise the bar for noticing this one.
 */
export function dizzinessJump(
  today: number | null,
  history: Pick<LabCheckInRecord, "date" | "scores">[],
): { today: number; usual: number } | null {
  if (today === null || today < SEVERE_DIZZINESS) return null;

  const recent = [...history]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .map((entry) => entry.scores.dizziness)
    .filter((value): value is number => typeof value === "number")
    .slice(0, 7);

  if (recent.length < DIZZINESS_USUAL_DAYS) return null;

  const usual = median(recent);
  return today - usual >= DIZZINESS_JUMP ? { today, usual: Math.round(usual) } : null;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function matchesUnnegated(text: string, pattern: RegExp): boolean {
  const match = pattern.exec(text);
  if (!match) return false;
  return !NEGATED.test(text.slice(Math.max(0, match.index - 30), match.index));
}

function rank(tier: LabFlagTier): number {
  return tier === "emergency" ? 3 : tier === "urgent" ? 2 : 1;
}
