import type { OutcomeKey } from "./scales";
import type { VariableType } from "./types";

/**
 * The intervention library: natural, low-risk things a person might test on themselves.
 *
 * In code rather than in a table so that every caution goes through review and a test
 * (`tests/unit/lab-library.test.ts`), and so it cannot be confused with `Intervention`, which
 * is medicines. See DECISIONS.md HL-02.
 *
 * Deliberate limits, each enforced by that test:
 *
 * - **No amounts.** Not for magnesium, not for anything. "The amount on the pack" is as far as
 *   this goes. AGENTS.md rule 17 is written for stories, but a library of self-experiments that
 *   prints a milligram figure is a dosing chart with a friendlier name.
 * - **Every supplement carries the pharmacist-or-GP caution**, and magnesium carries the
 *   kidney one by name.
 * - **Sources are the NHS only** (rule 14). An entry without an NHS page says so rather than
 *   borrowing a clinic's.
 * - **Evidence strength describes how much research there is**, for people in general. It is
 *   never a forecast of what will happen to the person reading it. The results page is where
 *   their own data speaks, and that page says "in your data so far".
 * - **No prescription medicines and nothing "heavy duty".** Out of scope by the spec.
 */

export type EvidenceLevel = "strong" | "moderate" | "early" | "anecdotal";

export const EVIDENCE_LABELS: Record<EvidenceLevel, string> = {
  strong: "Strong: consistent research in people",
  moderate: "Moderate: some good studies, not settled",
  early: "Early: small or few studies",
  anecdotal: "Anecdotal: mostly people's own reports",
};

export interface LibrarySource {
  label: string;
  url: string;
}

export interface LibraryEntry {
  key: string;
  name: string;
  type: VariableType;
  /** Supplements carry extra cautions, and the test checks they do. */
  isSupplement: boolean;
  /** What it is thought to do. Attributed, never promised. */
  rationale: string;
  evidence: EvidenceLevel;
  /** A practical way people go about it. Never an amount. */
  howTo: string;
  /** How long before people usually say they notice anything, if they do. */
  expectedTimeframe: string;
  /** The shortest intervention period, in days, that gives it a fair go. */
  minInterventionDays: number;
  cautions: string[];
  /** Which outcomes it is aimed at. Drives the overlap warning and the suggestions. */
  outcomes: OutcomeKey[];
  sources: LibrarySource[];
}

const NHS_INSOMNIA: LibrarySource = {
  label: "NHS: Insomnia",
  url: "https://www.nhs.uk/conditions/insomnia/",
};
const NHS_HOW_TO_SLEEP: LibrarySource = {
  label: "NHS: How to get to sleep",
  url: "https://www.nhs.uk/live-well/sleep-and-tiredness/how-to-get-to-sleep/",
};
const NHS_EVERY_MIND_SLEEP: LibrarySource = {
  label: "NHS Every Mind Matters: Sleep",
  url: "https://www.nhs.uk/every-mind-matters/mental-health-issues/sleep/",
};
const NHS_TINNITUS: LibrarySource = {
  label: "NHS: Tinnitus",
  url: "https://www.nhs.uk/conditions/tinnitus/",
};
const NHS_MINERALS: LibrarySource = {
  label: "NHS: Vitamins and minerals (magnesium)",
  url: "https://www.nhs.uk/conditions/vitamins-and-minerals/others/",
};
const NHS_ALCOHOL: LibrarySource = {
  label: "NHS: Alcohol advice",
  url: "https://www.nhs.uk/live-well/alcohol-advice/",
};

/** The one sentence every supplement carries. */
export const SUPPLEMENT_CAUTION =
  "Check with a pharmacist or GP before starting if you take any other medicines, are pregnant or breastfeeding, or have kidney problems.";

const SLEEP: OutcomeKey[] = ["sleepLatencyMin", "wakeups", "sleepHours", "sleepQuality"];

export const LAB_LIBRARY: readonly LibraryEntry[] = [
  {
    key: "caffeine_removal",
    name: "Stop caffeine",
    type: "remove",
    isSupplement: false,
    rationale:
      "Caffeine blocks the chemical signal that builds up sleepiness through the day, and it stays in the body for hours. Some people are far more sensitive to it than others.",
    evidence: "strong",
    howTo:
      "Cut out coffee, tea, cola, energy drinks and dark chocolate. Decaf and herbal teas are fine. Many people find it easier to cut down over a week than to stop in one go.",
    expectedTimeframe: "A few days, once any withdrawal has passed",
    minInterventionDays: 10,
    cautions: [
      "Headaches, tiredness and low mood are common for the first few days after stopping. Cutting down gradually makes this milder.",
      "Some painkillers and cold remedies contain caffeine. The label will say.",
    ],
    outcomes: [...SLEEP, "racingMind", "energy"],
    sources: [NHS_HOW_TO_SLEEP],
  },
  {
    key: "sugar_removal",
    name: "Cut out added sugar",
    type: "remove",
    isSupplement: false,
    rationale:
      "Some people describe feeling wired or waking in the night after sugary food late in the day. Research on sugar and sleep is limited and mixed.",
    evidence: "anecdotal",
    howTo:
      "Leave out sweets, cakes, biscuits, sugary drinks and added sugar. Fruit stays in. It is easier to start with the evening than the whole day.",
    expectedTimeframe: "One to two weeks",
    minInterventionDays: 14,
    cautions: [
      "If you have diabetes, talk to your diabetes team before changing what you eat, especially if you take insulin or tablets that lower blood sugar.",
      "If you have had an eating disorder, a rule about a food group can be a step back. Please talk to someone you trust first.",
    ],
    outcomes: [...SLEEP, "energy", "mood"],
    sources: [],
  },
  {
    key: "magnesium",
    name: "Magnesium in the evening",
    type: "add",
    isSupplement: true,
    rationale:
      "Magnesium is involved in how nerves and muscles relax. A few small studies, mostly in older adults, suggest it may help some people fall asleep. Most people get enough from food.",
    evidence: "early",
    howTo:
      "Glycinate and citrate are the forms people usually try. Take it in the evening, at the amount on the pack, and do not go above it. Do not take a second product that also contains magnesium.",
    expectedTimeframe: "One to three weeks",
    minInterventionDays: 14,
    cautions: [
      SUPPLEMENT_CAUTION,
      "Do not take magnesium without advice from your GP if you have kidney problems. Kidneys clear magnesium, and it can build up.",
      "Magnesium can stop some antibiotics and bone-strengthening medicines from being absorbed properly. A pharmacist can tell you how far apart to take them.",
      "Too much can cause diarrhoea and stomach cramps. Citrate does this more often than glycinate.",
    ],
    outcomes: [...SLEEP, "racingMind"],
    sources: [NHS_MINERALS],
  },
  {
    key: "morning_daylight",
    name: "Daylight soon after waking",
    type: "add",
    isSupplement: false,
    rationale:
      "Bright light in the morning is one of the main signals that sets the body clock. It is thought to make sleepiness arrive earlier and more reliably in the evening.",
    evidence: "moderate",
    howTo:
      "Get outside within an hour of waking, for a walk or a coffee on the step. Cloudy daylight still counts, and it is much brighter than indoor light. Through a window counts for less.",
    expectedTimeframe: "About one to two weeks",
    minInterventionDays: 14,
    cautions: ["Never look directly at the sun."],
    outcomes: [...SLEEP, "energy", "mood"],
    sources: [NHS_EVERY_MIND_SLEEP],
  },
  {
    key: "fixed_wake_time",
    name: "Same wake time every day",
    type: "shift",
    isSupplement: false,
    rationale:
      "A fixed wake time, weekends included, anchors the body clock. It is one of the building blocks of CBT for insomnia, which the NHS offers as a first treatment.",
    evidence: "strong",
    howTo:
      "Pick a wake time you can keep seven days a week and set an alarm for it, however the night went. Go to bed when you feel sleepy, not at a fixed time.",
    expectedTimeframe: "One to three weeks. The first week can feel harder.",
    minInterventionDays: 14,
    cautions: [
      "You may be more tired at first. Do not drive or use machinery if you feel very sleepy.",
    ],
    outcomes: [...SLEEP, "racingMind", "energy"],
    sources: [NHS_INSOMNIA],
  },
  {
    key: "gym_morning",
    name: "Gym in the morning, not the evening",
    type: "shift",
    isSupplement: false,
    rationale:
      "Exercise generally helps sleep. Hard exercise late in the evening keeps some people's body temperature and alertness up at bedtime. People differ a lot, which makes it a good thing to test on yourself.",
    evidence: "early",
    howTo:
      "Move your usual sessions to the morning and keep them about the same length and effort, so only the time changes. Record the time you trained each day.",
    expectedTimeframe: "One to two weeks",
    minInterventionDays: 14,
    cautions: [
      "Warm up for longer in the morning, when muscles are stiffer.",
      "If dizziness is part of your history, take care with exercises that involve lying down and standing up quickly.",
    ],
    outcomes: [...SLEEP, "racingMind", "energy"],
    sources: [NHS_HOW_TO_SLEEP],
  },
  {
    key: "meditation",
    name: "Meditation or a body scan",
    type: "add",
    isSupplement: false,
    rationale:
      "Mindfulness practice is thought to help with the racing, can't-switch-off mind by practising noticing thoughts without following them. Trials in people with insomnia show modest effects.",
    evidence: "moderate",
    howTo:
      "Ten minutes, at the same time each day. A guided body scan in bed is a common choice. Free recordings are easy to find.",
    expectedTimeframe: "Two to four weeks of regular practice",
    minInterventionDays: 21,
    cautions: [
      "Turning your attention inwards can make tinnitus more noticeable for some people. Having quiet background sound on can help.",
      "Occasionally meditation brings up difficult memories or feelings. Stop if it does, and talk to someone if it stays with you.",
    ],
    outcomes: [...SLEEP, "racingMind", "stress", "tinnitusIntrusiveness"],
    sources: [NHS_EVERY_MIND_SLEEP],
  },
  {
    key: "breathwork",
    name: "Slow breathing before bed",
    type: "add",
    isSupplement: false,
    rationale:
      "Breathing slowly, with a longer out-breath than in-breath, is thought to calm the body's alert response. Studies are small, but it is simple and free.",
    evidence: "early",
    howTo:
      "In bed, breathe in through your nose for a count of four and out for a count of six, for about five minutes. There is no need to breathe deeply.",
    expectedTimeframe: "Some people notice it the same night; give it one to two weeks",
    minInterventionDays: 10,
    cautions: [
      "Stop if you feel light-headed or tingly.",
      "Avoid breath-holding and fast-breathing techniques, especially with a history of dizziness.",
    ],
    outcomes: ["sleepLatencyMin", "sleepQuality", "racingMind", "stress"],
    sources: [NHS_HOW_TO_SLEEP],
  },
  {
    key: "earlier_last_meal",
    name: "Last meal earlier",
    type: "shift",
    isSupplement: false,
    rationale:
      "A large meal close to bedtime can cause reflux and discomfort when lying down. Some people sleep more easily with a longer gap.",
    evidence: "early",
    howTo:
      "Finish your last proper meal about three hours before bed. Keep what you eat the same, so only the time changes.",
    expectedTimeframe: "About a week",
    minInterventionDays: 10,
    cautions: [
      "If you have diabetes, talk to your diabetes team before changing when you eat.",
    ],
    outcomes: SLEEP,
    sources: [],
  },
  {
    key: "alcohol_removal",
    name: "Stop alcohol",
    type: "remove",
    isSupplement: false,
    rationale:
      "Alcohol can help people fall asleep, but it breaks up sleep later in the night and causes more waking. This is well studied.",
    evidence: "strong",
    howTo: "No alcohol at all for the whole intervention period, including weekends.",
    expectedTimeframe: "A few days to two weeks",
    minInterventionDays: 14,
    cautions: [
      "If you drink heavily every day, stopping suddenly can be dangerous. Please speak to your GP before you stop.",
    ],
    outcomes: [...SLEEP, "mood", "energy"],
    sources: [NHS_ALCOHOL],
  },
  {
    key: "screen_curfew",
    name: "No screens in the last hour",
    type: "remove",
    isSupplement: false,
    rationale:
      "Screens keep the mind busy and give off light that may delay sleepiness. Research on light is mixed, and what you are doing on the screen may matter more.",
    evidence: "early",
    howTo:
      "Phone, tablet and laptop off an hour before bed, and charge the phone outside the bedroom. A book, a bath or music instead.",
    expectedTimeframe: "About one to two weeks",
    minInterventionDays: 14,
    cautions: [],
    outcomes: ["sleepLatencyMin", "sleepQuality", "racingMind"],
    sources: [NHS_HOW_TO_SLEEP],
  },
  {
    key: "cool_bedroom",
    name: "A cooler bedroom",
    type: "add",
    isSupplement: false,
    rationale:
      "Body temperature drops as sleep begins, and a warm room can get in the way. The NHS suggests a cool, dark, quiet bedroom.",
    evidence: "early",
    howTo:
      "Aim for a cool room, around 16 to 18°C. Open a window, use lighter bedding, or turn the heating down at night.",
    expectedTimeframe: "About a week",
    minInterventionDays: 10,
    cautions: ["Older people and babies need a warmer room. Do not let the room get cold enough to be uncomfortable."],
    outcomes: SLEEP,
    sources: [NHS_HOW_TO_SLEEP],
  },
  {
    key: "worry_dump",
    name: "Writing it down before bed",
    type: "add",
    isSupplement: false,
    rationale:
      "Writing worries and tomorrow's to-do list on paper is thought to stop the mind rehearsing them in bed. A small number of studies support this.",
    evidence: "early",
    howTo:
      "Ten minutes, an hour or two before bed, away from the bedroom. Write down what is on your mind and what needs doing tomorrow. Then close the notebook.",
    expectedTimeframe: "One to two weeks",
    minInterventionDays: 14,
    cautions: [],
    outcomes: ["sleepLatencyMin", "sleepQuality", "racingMind", "stress"],
    sources: [NHS_EVERY_MIND_SLEEP],
  },
  {
    key: "tinnitus_sound",
    name: "Background sound at night",
    type: "add",
    isSupplement: false,
    rationale:
      "Quiet, steady sound gives the brain something to hear other than the tinnitus. It is part of how the NHS manages tinnitus. It does not make tinnitus go away.",
    evidence: "moderate",
    howTo:
      "A fan, rain sounds or soft music through a speaker by the bed, just quieter than the tinnitus. A timer means it switches itself off.",
    expectedTimeframe: "Some people notice it the same night; give it two weeks",
    minInterventionDays: 14,
    cautions: [
      "Keep it quieter than the tinnitus. Louder sound does not work better.",
      "Avoid earphones overnight, and never play sound loudly into your ears.",
    ],
    outcomes: [...SLEEP, "tinnitusLoudness", "tinnitusIntrusiveness"],
    sources: [NHS_TINNITUS],
  },
  {
    key: "get_up_if_awake",
    name: "Get up if you cannot sleep",
    type: "shift",
    isSupplement: false,
    rationale:
      "Lying awake trains the brain to link bed with being awake. Getting up and coming back when sleepy is another building block of CBT for insomnia.",
    evidence: "strong",
    howTo:
      "If you have not fallen asleep after about twenty minutes, get up, go to another room and do something quiet in dim light. Come back when you feel sleepy. Do not watch the clock.",
    expectedTimeframe: "Two to three weeks. It is often harder at first.",
    minInterventionDays: 21,
    cautions: [
      "Keep a light low and the route clear, so you do not trip in the night, particularly if you get dizzy.",
    ],
    outcomes: [...SLEEP, "racingMind"],
    sources: [NHS_INSOMNIA],
  },
];

const BY_KEY = new Map(LAB_LIBRARY.map((entry) => [entry.key, entry]));

export function libraryEntry(key: string | null | undefined): LibraryEntry | null {
  return key ? (BY_KEY.get(key) ?? null) : null;
}

export const VARIABLE_TYPE_LABELS: Record<VariableType, string> = {
  remove: "Take something away",
  add: "Add something",
  shift: "Change the timing",
};
