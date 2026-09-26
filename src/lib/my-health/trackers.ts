import { db } from "@/lib/db";

/**
 * The trackers under My health → Health tracker.
 *
 * "Signing up" to a tracker is not a separate switch stored somewhere. A tracker is in use
 * when there is something in it: symptoms chosen, a treatment logged, a question written
 * down. That keeps one source of truth — the data itself — and it means there is nothing to
 * tidy up when somebody withdraws consent or deletes their account.
 *
 * Water, sleep, blood test results and bowel habits keep their records on the device rather
 * than in the account, as the Food Advisor does — DECISIONS.md HT-01 — so, like it, whether
 * they are in use is something we cannot know. `PLANNED` is where a tracker goes when it is
 * announced before it works; it is empty while everything announced has been built.
 */

export type TrackerKey =
  | "symptoms"
  | "condition"
  | "medication"
  | "check-ins"
  | "questions"
  | "food"
  | "water"
  | "sleep"
  | "blood"
  | "bowel";

export interface Tracker {
  key: TrackerKey;
  name: string;
  what: string;
  /** Where the tracker lives once somebody is using it. */
  href: string;
  /** Where somebody goes to begin. Often the same page. */
  startHref: string;
}

export const TRACKERS: Tracker[] = [
  {
    key: "symptoms",
    name: "Symptoms",
    what: "A score from 0 to 10 for each symptom you choose, once a day. It takes under thirty seconds.",
    href: "/log",
    startHref: "/onboarding/symptoms",
  },
  {
    key: "condition",
    name: "Your condition over time",
    what: "A dated record of episodes, appointments, tests and changes, kept so you can hand it over rather than remember it.",
    href: "/timeline",
    startHref: "/timeline",
  },
  {
    key: "medication",
    name: "Medicines and treatments",
    what: "What you take or do, since when, and why you stopped if you did. Covers supplements and things like physiotherapy too.",
    href: "/treatments",
    startHref: "/treatments/new",
  },
  {
    key: "check-ins",
    name: "Check-ins",
    what: "A few questions every few weeks, and after you start a treatment, so that what changes is written down.",
    href: "/check-ins",
    startHref: "/check-ins",
  },
  {
    key: "questions",
    name: "Questions for your doctor",
    what: "Write down what you, or somebody else, has wondered this could be. See which of your symptoms fit each one, and take the questions to your GP. It does not tell you what you have.",
    href: "/timeline/questions",
    startHref: "/timeline/questions",
  },
  {
    key: "food",
    name: "Food",
    what: "Turns a condition into plain food rules, and a menu into questions to ask. What you enter stays on this device.",
    href: "/food",
    startHref: "/food",
  },
  {
    key: "water",
    name: "Water",
    what: "How much you drink in a day. What you enter stays on this device.",
    href: "/trackers/water",
    startHref: "/trackers/water",
  },
  {
    key: "sleep",
    name: "Sleep",
    what: "How long and how well you slept. What you enter stays on this device.",
    href: "/trackers/sleep",
    startHref: "/trackers/sleep",
  },
  {
    key: "blood",
    name: "Blood test results",
    what: "Your results, written down with the date and where they came from. What you enter stays on this device.",
    href: "/trackers/blood-tests",
    startHref: "/trackers/blood-tests",
  },
  {
    key: "bowel",
    name: "Bowel habits (poo)",
    what: "How often, and what it was like. What you enter stays on this device.",
    href: "/trackers/bowel",
    startHref: "/trackers/bowel",
  },
];

export interface PlannedTracker {
  name: string;
  what: string;
}

export const PLANNED: PlannedTracker[] = [];

/** Whether a tracker has anything in it. `null` means we cannot know: the data never reaches us. */
export type TrackerUsage = Record<TrackerKey, boolean | null>;

export async function trackerUsage(userId: string): Promise<TrackerUsage> {
  const [symptoms, observations, events, courses, checkIns, candidates] = await Promise.all([
    db.userSymptom.count({ where: { userId, active: true } }),
    db.observation.count({ where: { userId } }),
    db.timelineEvent.count({ where: { userId } }),
    db.treatmentCourse.count({ where: { userId } }),
    db.scheduledCheckIn.count({ where: { userId } }),
    db.candidate.count({ where: { userId } }),
  ]);

  return {
    symptoms: symptoms > 0,
    condition: observations + events > 0,
    medication: courses > 0,
    "check-ins": checkIns > 0,
    questions: candidates > 0,
    // These keep their records in the browser. We do not know, and do not ask.
    food: null,
    water: null,
    sleep: null,
    blood: null,
    bowel: null,
  };
}

/** Trackers in use first, then the rest, each group in catalogue order. */
export function orderTrackers(usage: TrackerUsage): { inUse: Tracker[]; notStarted: Tracker[] } {
  return {
    inUse: TRACKERS.filter((tracker) => usage[tracker.key] === true),
    notStarted: TRACKERS.filter((tracker) => usage[tracker.key] !== true),
  };
}
