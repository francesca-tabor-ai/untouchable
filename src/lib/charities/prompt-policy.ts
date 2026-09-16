/**
 * Giving without pressure — the one place that decides whether a donation prompt may be
 * shown. Brief section 6.4, AGENTS.md rule 5.
 *
 * Every donation prompt in the product calls `donationPromptDecision` (or the boolean
 * shorthand `mayShowDonationPrompt`). Nothing decides this for itself. Later waves build the
 * check-in and safety screens; they pass what they know about the person's situation and get
 * back an answer, so the rule stays in one testable place instead of being re-argued on each
 * screen.
 *
 * Two deliberate properties:
 *
 * 1. **Default deny.** A surface that is not on the approved list gets no prompt. A new
 *    screen added by a later wave is quiet until someone decides, on the record, that a
 *    donation prompt belongs there.
 * 2. **No clock of our own.** `now` is injectable, so the quiet period after a hard check-in
 *    is testable without waiting a day.
 */

/** Every surface that might, in principle, ask about giving. */
export const DONATION_SURFACES = [
  // Editorial and giving surfaces — prompts are appropriate here.
  "charity_directory",
  "charity_detail",
  "condition_page",
  "story_page",
  "account_causes",
  // Surfaces where a prompt is never appropriate.
  "onboarding",
  "safety_signposting",
  "red_flag",
  "check_in_result",
  // Surfaces nobody has decided about yet. Default deny covers these.
  "dashboard",
  "daily_log",
  "questionnaire",
  "email",
  "account_settings",
] as const;

export type DonationSurface = (typeof DONATION_SURFACES)[number];

/**
 * Where a donation prompt is allowed at all. Everything else is denied by default.
 * Adding a surface here is a product decision — record it in DECISIONS.md.
 */
export const PROMPTABLE_SURFACES: readonly DonationSurface[] = [
  "charity_directory",
  "charity_detail",
  "condition_page",
  "story_page",
  "account_causes",
];

/**
 * Surfaces where a prompt is forbidden outright, whatever else is true. Kept explicit so the
 * rule is readable next to the brief, even though default deny would already cover them.
 */
export const NEVER_PROMPT_SURFACES: readonly DonationSurface[] = [
  "onboarding",
  "safety_signposting",
  "red_flag",
  "check_in_result",
];

/**
 * How long we stay quiet after a check-in that recorded high symptom scores. A day: long
 * enough that the prompt is not attached to the bad moment, short enough that someone who
 * goes looking for charities the next day is not blocked from them.
 */
export const QUIET_HOURS_AFTER_HARD_CHECK_IN = 24;

export type SuppressionReason =
  | "safety_surface"
  | "onboarding"
  | "recent_high_symptom_check_in"
  | "open_safety_concern"
  | "surface_not_approved";

export interface DonationPromptContext {
  /** The screen the prompt would appear on. */
  surface: DonationSurface;
  /** True anywhere inside the onboarding flow, including the last step of it. */
  inOnboarding?: boolean;
  /**
   * An unresolved red flag or safety event for this person. A safety concern silences
   * donation prompts everywhere, not only on the safety screen itself.
   */
  hasOpenSafetyConcern?: boolean;
  /**
   * The person's most recent check-in, if there is one. `hadHighSymptomScores` is set by the
   * check-in domain (wave 6/8); this module does not interpret scores itself, because
   * interpreting a score is a clinical judgement and we do not make those.
   */
  lastCheckIn?: { completedAt: Date; hadHighSymptomScores: boolean } | null;
  /** Injectable clock. Defaults to now. */
  now?: Date;
}

export interface DonationPromptDecision {
  allowed: boolean;
  /** Null when allowed. */
  reason: SuppressionReason | null;
  /** Internal wording for tests, logs and the admin. Never shown to the person. */
  explanation: string;
}

const ALLOWED: DonationPromptDecision = {
  allowed: true,
  reason: null,
  explanation: "This surface may show a quiet, optional donation prompt.",
};

function denied(reason: SuppressionReason, explanation: string): DonationPromptDecision {
  return { allowed: false, reason, explanation };
}

/**
 * Should a donation prompt be shown here, right now?
 *
 * Checks run worst-case first, so the explanation names the most serious reason rather than
 * an incidental one.
 */
export function donationPromptDecision(context: DonationPromptContext): DonationPromptDecision {
  const now = context.now ?? new Date();

  if (NEVER_PROMPT_SURFACES.includes(context.surface)) {
    return denied(
      context.surface === "onboarding" ? "onboarding" : "safety_surface",
      `No donation prompt on the ${context.surface} surface. Brief 6.4.`,
    );
  }

  if (context.hasOpenSafetyConcern) {
    return denied(
      "open_safety_concern",
      "This person has an open safety concern. Nothing asks them for anything.",
    );
  }

  if (context.inOnboarding) {
    return denied("onboarding", "No donation prompts anywhere during onboarding. Brief 6.4.");
  }

  const checkIn = context.lastCheckIn;
  if (checkIn?.hadHighSymptomScores) {
    const quietUntil =
      checkIn.completedAt.getTime() + QUIET_HOURS_AFTER_HARD_CHECK_IN * 60 * 60 * 1000;
    if (now.getTime() < quietUntil) {
      return denied(
        "recent_high_symptom_check_in",
        `A check-in with high symptom scores was recorded in the last ${QUIET_HOURS_AFTER_HARD_CHECK_IN} hours.`,
      );
    }
  }

  if (!PROMPTABLE_SURFACES.includes(context.surface)) {
    return denied(
      "surface_not_approved",
      `The ${context.surface} surface has not been approved for donation prompts. Default is no prompt.`,
    );
  }

  return ALLOWED;
}

/** Boolean shorthand. Same rules, for a component that only needs yes or no. */
export function mayShowDonationPrompt(context: DonationPromptContext): boolean {
  return donationPromptDecision(context).allowed;
}

/* -------------------------------------------------------------------------- */
/* Copy                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Words and shapes that pressure people: urgency, scarcity, guilt, and anything that ties
 * giving to what the person gets. Donation copy is checked against these in tests, so a
 * well-meaning rewrite cannot quietly reintroduce a countdown. Brief 6.4.
 */
export const PRESSURE_PATTERNS: { pattern: RegExp; problem: string }[] = [
  {
    pattern: /\b\d+\s*(hours?|days?|minutes?)\s*(left|remaining|to go)\b/i,
    problem: "a countdown",
  },
  {
    pattern: /\b(hurry|act now|last chance|don'?t miss|ends (soon|today|tonight))\b/i,
    problem: "urgency",
  },
  { pattern: /\bonly\s+\d+\s+(left|remaining|places|spots)\b/i, problem: "scarcity" },
  { pattern: /\bdon'?t let (them|him|her|us) down\b/i, problem: "guilt" },
  { pattern: /\b(you should|you must|you need to)\s+(give|donate)\b/i, problem: "obligation" },
  { pattern: /\b(unlock|earn|upgrade|get access)\b/i, problem: "a reward for giving" },
  { pattern: /\bwill die\b/i, problem: "emotional coercion" },
  { pattern: /\b(before it'?s too late|running out of time)\b/i, problem: "urgency" },
  { pattern: /!{1}/, problem: "an exclamation mark" },
];

/**
 * Returns a description of the problem if a piece of donation copy applies pressure, or null
 * if it is clean.
 */
export function pressureLanguageProblem(copy: string): string | null {
  for (const { pattern, problem } of PRESSURE_PATTERNS) {
    if (pattern.test(copy)) return problem;
  }
  return null;
}

/**
 * The donation copy used across the product. Kept together so it can be checked in one test,
 * and so nobody writes a second, breezier version of it on a new screen.
 */
export const DONATION_COPY = {
  donateLabel: "Donate on their website",
  donateHint:
    "This opens the charity's own donation page in a new tab. We never handle your money and we take none of it.",
  noPaymentHere:
    "UnTouchable never takes or holds payment. Your donation goes straight to the charity.",
  followLabel: "Follow this cause",
  unfollowLabel: "Stop following this cause",
  followPrivacy:
    "Only you can see the causes you follow. We never tell a charity who follows it, and following changes nothing else about your account.",
  noteLabel: "Note a donation",
  notePrivacy:
    "This is your own record. Nobody else sees it, including the charity. It is never used in research.",
  optional: "Giving is optional. Nothing here changes if you do or if you do not.",
} as const;

/* -------------------------------------------------------------------------- */
/* Support framing                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The two variants a charity block can be rendered in.
 *
 * `default` is a giving block: it names charities and offers the donation hand-off.
 *
 * `support` is signposting, and nothing else. It is for surfaces that carry a content note
 * and support contacts — a story about suicide, a condition page for depression. A Donate
 * button next to a content note is wrong, but withholding the block entirely takes away the
 * helpline, which is the thing we are for. So the two are separated: the same verified
 * charities, framed as where to get help, with no way to give from the block at all.
 */
export type CharityBlockVariant = "default" | "support";

/**
 * Words that turn signposting back into a giving prompt. A support block is checked against
 * these in tests, so no well-meaning rewrite can slip "you could also donate" into a page
 * that carries a content note.
 */
export const GIVING_LANGUAGE: { pattern: RegExp; problem: string }[] = [
  { pattern: /\bdonat/i, problem: "donating" },
  { pattern: /\bgiv(e|ing)\b/i, problem: "giving" },
  { pattern: /\bfundrais/i, problem: "fundraising" },
  { pattern: /\bcontribut/i, problem: "contributing" },
  { pattern: /\bgift aid\b/i, problem: "Gift Aid" },
  { pattern: /\bmoney\b/i, problem: "money" },
  { pattern: /£/, problem: "an amount" },
];

/** A description of the problem if support copy strays into giving, or null if it is clean. */
export function givingLanguageProblem(copy: string): string | null {
  for (const { pattern, problem } of GIVING_LANGUAGE) {
    if (pattern.test(copy)) return problem;
  }
  return null;
}

/**
 * Copy for the support variant. Leads with what a charity offers someone who needs help now.
 * Held together here so one test can check every string in it.
 */
export const SUPPORT_COPY = {
  heading: "Where to get support",
  conditionIntro:
    "These UK charities work with people living with this condition. One of our editors checked each of them against the official register. Most of them run a helpline or a support service you can contact yourself.",
  storyIntro:
    "These UK charities work with people living with the conditions in this story. One of our editors checked each of them against the official register. Most of them run a helpline or a support service you can contact yourself.",
  websiteLabel: "Go to their website",
  newTab: "opens in a new tab",
  clinicalReminder:
    "None of this replaces your GP or your clinical team. If you are worried about your health now, the numbers at the bottom of this page are open day and night.",
} as const;
