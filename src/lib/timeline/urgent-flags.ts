import type { UrgentFlagTier } from "@/generated/prisma";

/**
 * The red flag engine.
 *
 * Runs on every entry before anything else touches it. If a rule fires, the flag is the
 * whole response: no timeline, no matrix, no script, no "saved". Someone who has just typed
 * "my arm went numb and my face feels odd" must not have to scroll past a saved-confirmation
 * to find the sentence that matters.
 *
 * Four decisions worth knowing about, because each of them is a place this could quietly go
 * wrong:
 *
 * **It reads the person's own words.** Nobody types "syncope". They type "I went down",
 * "I blacked out", "my legs just gave way". A rule engine that only watches structured
 * fields watches the wrong thing, because the field is filled in later, calmly, by someone
 * who has already decided it was nothing.
 *
 * **Reassurance does not switch a flag off.** "It's fine now", "I don't want to make a
 * fuss", "I'm probably overreacting" — these are the most common sentences around the most
 * serious entries, and they are not evidence. What decides whether something is live is when
 * it happened, and nothing else. Tested in `tests/unit/timeline-red-flags.test.ts`.
 *
 * **Negation does switch it off.** "I did not pass out" is not a collapse. The check is
 * crude and deliberately narrow — a short window of words immediately before the match — so
 * that it catches the ordinary phrasing without swallowing a real one.
 *
 * **Past events still count.** Something that happened three weeks ago and resolved is not
 * an emergency now. It is also exactly the thing a clinician needs told, so it is logged as
 * flagged and carried into the next handover script instead of disappearing.
 *
 * The rules are a floor, not a diagnosis, and they will be wrong in both directions. A
 * person who is worried and does not match a rule should still be told where to go, which
 * is what the safety footer on every page is for.
 */

export type FlagArea = "general" | "ear" | "bowel" | "headache";

export interface UrgentFlagRule {
  key: string;
  tier: UrgentFlagTier;
  /** What we noticed, said back plainly. Never a conclusion about what it is. */
  noticed: string;
  /** Phrases in the person's own words. */
  patterns: RegExp[];
  /**
   * A second thing that has to be there too. Chest pain on its own is not this rule; chest
   * pain with breathlessness is.
   */
  alongside?: RegExp[];
  /**
   * The exact words to use on the phone, where saying it one way and not another changes
   * what happens next, and why. Used by the short triage script.
   */
  sayExactly?: string;
  whySaying?: string;
}

/** Anything older than this is something that happened, not something happening. */
export const HISTORICAL_AFTER_HOURS = 24;

const GENERAL_RULES: UrgentFlagRule[] = [
  {
    key: "stroke_signs",
    tier: "emergency",
    noticed: "You have described weakness, numbness or trouble speaking.",
    patterns: [
      /\b(numb|numbness|weak|weakness|no feeling)\b[^.]{0,40}\b(one side|left side|right side|down one|arm|leg|face)\b/i,
      /\b(face|mouth|smile)\b[^.]{0,20}\b(droop|drooping|dropped|fell|lopsided|uneven)\b/i,
      /\b(slurred|slurring)\b/i,
      /\b(can'?t|could ?n'?t|unable to)\b[^.]{0,20}\b(get my words|find my words|speak properly|lift my arm)\b/i,
    ],
    sayExactly: "sudden weakness on one side, with my face and my speech",
    whySaying: "Those three together are the words that start a stroke pathway.",
  },
  {
    key: "sudden_severe_headache",
    tier: "emergency",
    noticed: "You have described a headache that came on suddenly and severely.",
    patterns: [
      /\bworst headache\b/i,
      /\bthunderclap\b/i,
      /\b(headache|head pain)\b[^.]{0,40}\b(came on|hit me|started)\b[^.]{0,20}\b(suddenly|out of nowhere|like a bang|instantly)\b/i,
      /\b(like being|felt like a)\b[^.]{0,15}\b(hit|struck|kicked)\b[^.]{0,15}\bhead\b/i,
    ],
    sayExactly: "the worst headache of my life, and it came on in seconds",
    whySaying: "How fast it arrived matters more than how bad it is.",
  },
  {
    key: "chest_pain_breathless",
    tier: "emergency",
    noticed: "You have described chest pain along with trouble breathing.",
    patterns: [/\bchest\b[^.]{0,30}\b(pain|tight|tightness|pressure|crushing|heavy)\b/i],
    alongside: [
      /\b(breathless|short of breath|can'?t breathe|could ?n'?t breathe|struggling to breathe|gasping)\b/i,
    ],
    sayExactly: "chest pain and I am short of breath",
    whySaying: "Said together, this is triaged differently from chest pain alone.",
  },
  {
    key: "unresponsive",
    tier: "emergency",
    noticed: "You have described losing consciousness and not coming round quickly.",
    patterns: [
      /\b(unconscious|unresponsive|would ?n'?t wake|could ?n'?t wake|didn'?t come round|out cold)\b/i,
      /\b(passed out|blacked out|knocked out)\b[^.]{0,40}\b(minutes|several minutes|a few minutes|ages|long time)\b/i,
    ],
  },
  {
    key: "heavy_bleeding",
    tier: "emergency",
    noticed: "You have described bleeding that is not stopping.",
    patterns: [
      /\b(bleeding|blood)\b[^.]{0,30}\b(won'?t stop|will ?not stop|can'?t stop|heavily|pouring|soaking)\b/i,
      /\bsoaking through\b/i,
    ],
  },
  {
    key: "fluids_and_confusion",
    tier: "emergency",
    noticed: "You have described not keeping fluids down alongside confusion or not passing urine.",
    patterns: [
      /\b(can'?t|could ?n'?t|unable to)\b[^.]{0,30}\b(keep|hold)\b[^.]{0,20}\b(fluids?|water|anything)\b[^.]{0,10}\bdown\b/i,
      /\bbringing (everything|it all) back up\b/i,
    ],
    alongside: [
      /\b(confused|confusion|not making sense|disorient|not myself at all)\b/i,
      /\b(not (passed|passing)|no)\b[^.]{0,15}\b(urine|wee)\b/i,
      /\bhaven'?t (weed|urinated|passed water)\b/i,
    ],
  },
  {
    key: "collapse",
    tier: "same_day",
    noticed: "You have described fainting or collapsing.",
    patterns: [
      /\b(fainted|faint|collapsed|collapse)\b/i,
      /\b(blacked out|passed out)\b/i,
      /\bwent down\b/i,
      /\b(legs|knees)\b[^.]{0,20}\b(gave way|went from under|buckled)\b/i,
      /\b(could ?n'?t|can'?t)\b[^.]{0,15}\bstand\b/i,
      /\bfound me on the (floor|ground)\b/i,
    ],
    sayExactly: "I collapsed",
    whySaying: "\"Collapsed\" and \"felt dizzy\" are not the same call.",
  },
  {
    key: "sudden_hearing_loss",
    tier: "same_day",
    noticed: "You have described losing hearing in one ear.",
    patterns: [
      /\b(hearing|deaf)\b[^.]{0,40}\b(one ear|left ear|right ear)\b/i,
      /\b(one ear|left ear|right ear)\b[^.]{0,30}\b(gone|nothing|dead|no sound|can'?t hear)\b/i,
    ],
    sayExactly: "sudden hearing loss in one ear",
    whySaying:
      "Sudden one-sided hearing loss is treated as urgent and on a clock. \"My ear is ringing\" is not, and it is the phrase people reach for.",
  },
  {
    key: "fever_not_settling",
    tier: "same_day",
    noticed: "You have described a fever that is not settling.",
    patterns: [
      /\b(fever|temperature)\b[^.]{0,40}\b(won'?t (go|settle|come) down|will ?not settle|keeps coming back|for days|days now)\b/i,
      /\b(shivering|shaking|rigors)\b[^.]{0,20}\b(uncontrollab|can'?t stop)\w*/i,
    ],
  },
  {
    key: "unassessed_blood",
    tier: "same_day",
    noticed: "You have described blood that nobody has looked at yet.",
    patterns: [
      /\bblood\b[^.]{0,25}\b(in|when)\b[^.]{0,25}\b(wee|urine|stool|poo|sick|vomit|phlegm|cough)\w*/i,
      /\b(coughing|throwing) up blood\b/i,
      /\b(bleeding|blood)\b[^.]{0,20}\bfrom (my )?(back passage|bottom|rectum)\b/i,
    ],
  },
  {
    key: "abrupt_worsening",
    tier: "same_day",
    noticed: "You have described something changing sharply for the worse.",
    patterns: [
      /\b(much|far|a lot|significantly)\b[^.]{0,10}\bworse\b[^.]{0,25}\b(overnight|suddenly|in a day|since (yesterday|last night))\b/i,
      /\b(suddenly|abruptly)\b[^.]{0,20}\bworse\b/i,
      /\bnothing like (it was|before)\b/i,
    ],
  },
];

/**
 * Per-area overlays.
 *
 * A red flag for an ear problem is not a red flag for a bowel problem, and a system that
 * applies every rule to everybody trains people to ignore all of them. Areas add rules; they
 * never remove a general one.
 */
const AREA_RULES: Record<Exclude<FlagArea, "general">, UrgentFlagRule[]> = {
  ear: [
    {
      key: "ear_with_facial_weakness",
      tier: "emergency",
      noticed: "You have described an ear problem alongside weakness in your face.",
      patterns: [/\bear\b/i],
      alongside: [/\b(face|facial)\b[^.]{0,25}\b(weak|droop|numb|won'?t move)\w*/i],
    },
    {
      key: "ear_swelling_behind",
      tier: "same_day",
      noticed: "You have described swelling or pain behind the ear.",
      patterns: [
        /\bbehind (my |the )?ear\b[^.]{0,30}\b(swollen|swelling|red|hot|sticking out|lump)\b/i,
        /\b(swollen|swelling|lump)\b[^.]{0,25}\bbehind (my |the )?ear\b/i,
      ],
    },
  ],
  bowel: [
    {
      key: "rigid_abdomen",
      tier: "emergency",
      noticed: "You have described severe stomach pain with a hard or rigid tummy.",
      patterns: [
        /\b(stomach|tummy|abdomen|belly)\b[^.]{0,30}\b(rigid|hard as|board|rock hard)\b/i,
        /\b(can'?t|could ?n'?t)\b[^.]{0,20}\b(straighten up|move|be touched)\b/i,
      ],
    },
    {
      key: "black_stool",
      tier: "same_day",
      noticed: "You have described black or tarry stools.",
      patterns: [/\b(black|tarry)\b[^.]{0,20}\b(stool|poo|motion|bowel)\w*/i],
      sayExactly: "black, tarry stools",
      whySaying: "That is a different call from \"a bit of blood\".",
    },
  ],
  headache: [
    {
      key: "headache_with_rash_or_light",
      tier: "emergency",
      noticed: "You have described a headache alongside a rash, a stiff neck or trouble with light.",
      patterns: [/\b(headache|head pain)\b/i],
      alongside: [
        /\b(rash|stiff neck|neck is stiff)\b/i,
        /\b(light|lights)\b[^.]{0,25}\b(hurt|painful|can'?t look|unbearable)\b/i,
      ],
    },
    {
      key: "headache_worse_lying_down",
      tier: "same_day",
      noticed: "You have described a headache that is worse lying down or first thing.",
      patterns: [
        /\bheadache\b[^.]{0,40}\b(worse (lying|when I lie)|worse in the morning|wakes me)\b/i,
      ],
    },
  ],
};

/** The rules that apply, given which areas this person is tracking. General is always in. */
export function flagRulesFor(areas: readonly FlagArea[] = []): UrgentFlagRule[] {
  const extra = areas
    .filter((area): area is Exclude<FlagArea, "general"> => area !== "general")
    .flatMap((area) => AREA_RULES[area] ?? []);

  const seen = new Set<string>();
  return [...GENERAL_RULES, ...extra].filter((rule) => {
    if (seen.has(rule.key)) return false;
    seen.add(rule.key);
    return true;
  });
}

export interface UrgentFlagHit {
  rule: UrgentFlagRule;
  tier: UrgentFlagTier;
  /** The words that matched, so the screen can show what it read rather than assert it. */
  matched: string;
  /**
   * True when this is something that already happened rather than something happening now.
   * Decided by the date on the entry — never by the person saying it was nothing.
   */
  historical: boolean;
}

/**
 * Every rule that matches, worst first. Emergencies before same-day; within a tier, the
 * order the rules are written in.
 */
export function evaluateUrgentFlags(input: {
  /** Everything the person wrote on this entry, joined together. */
  text: string;
  /** When the thing happened. */
  occurredAt: Date;
  areas?: readonly FlagArea[];
  now?: Date;
}): UrgentFlagHit[] {
  const { text, occurredAt, areas = [], now = new Date() } = input;
  const historical =
    now.getTime() - occurredAt.getTime() > HISTORICAL_AFTER_HOURS * 60 * 60 * 1000;

  const hits: UrgentFlagHit[] = [];
  for (const rule of flagRulesFor(areas)) {
    const matched = firstMatch(text, rule.patterns);
    if (!matched) continue;
    if (rule.alongside && !firstMatch(text, rule.alongside)) continue;
    hits.push({ rule, tier: rule.tier, matched, historical });
  }

  return hits.sort((a, b) => tierRank(b.tier) - tierRank(a.tier));
}

/** The most serious live flag, or null. What the screen keys off. */
export function activeFlag(hits: UrgentFlagHit[]): UrgentFlagHit | null {
  return hits.find((hit) => !hit.historical) ?? null;
}

function tierRank(tier: UrgentFlagTier): number {
  return tier === "emergency" ? 2 : 1;
}

function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match && !isNegated(text, match.index)) return match[0];
  }
  return null;
}

/**
 * "I did not pass out" is not a collapse.
 *
 * Only the words immediately before the match are read. A wider window starts cancelling
 * real flags because of an unrelated "no" earlier in the sentence, and a missed flag costs
 * more than an extra one.
 */
const NEGATIONS = /\b(no|not|n'?t|never|without|denies?|apart from|other than)\b[^.]{0,12}$/i;

function isNegated(text: string, index: number): boolean {
  return NEGATIONS.test(text.slice(Math.max(0, index - 30), index));
}

/**
 * One rule by key, across every area.
 *
 * The flag screen is reached by a redirect carrying the key, so the rule has to be findable
 * again without knowing which area produced it.
 */
export function flagRuleByKey(key: string): UrgentFlagRule | null {
  const everything = flagRulesFor(["ear", "bowel", "headache"]);
  return everything.find((rule) => rule.key === key) ?? null;
}
