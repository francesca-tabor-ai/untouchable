import { SUPPORT_CONTACTS, YELLOW_CARD_URL } from "@/lib/safety/constants";

/**
 * The site guide — the "Ask us where" panel in the bottom-right corner.
 *
 * **This is not an AI, and it must not become one without a decision recorded in
 * DECISIONS.md.** The brief puts "AI-generated insights of any kind" out of scope for the MVP
 * and AGENTS.md rule 9 forbids medical advice. So the guide is a fixed map of the site: it
 * reads what somebody typed, looks for words it knows, and answers with a sentence we wrote
 * and the pages that sentence is about. Every reply it can give is in this file, where an
 * editor can read all of them.
 *
 * It runs in the browser and nothing a person types leaves it. There is no request, no log
 * and no storage — someone may well type a diagnosis into a box that looks like a chat.
 *
 * The order of checks is the point:
 *
 * 1. **Crisis first.** If what was typed sounds like danger, the reply is NHS 111, 999 and
 *    Samaritans and nothing else — no links onward, and never a charity or donation (rule 5).
 * 2. **Medical questions next.** "Should I", "is it safe", "how much" — anything that asks us
 *    to judge a treatment or a dose gets a plain "we can't answer that" and who can.
 * 3. **Then navigation.** The first topic whose words match wins. Topics are in the order a
 *    frightened person is most likely to need them.
 * 4. **Otherwise**, an offer to search the site for what they typed.
 */

/**
 * The same limit as the site search. Not imported from the search module, because that
 * reads the database and this one is bundled into the browser.
 */
const MAX_QUERY_LENGTH = 100;

export interface GuideLink {
  href: string;
  label: string;
  /** A phone number or another site. Opens as a call or in a new tab, not a page change. */
  external?: boolean;
}

export type GuideReplyKind = "crisis" | "medical" | "topic" | "fallback";

export interface GuideReply {
  kind: GuideReplyKind;
  text: string;
  links: GuideLink[];
}

/** The buttons shown before anybody has typed. Each is sent as if it had been typed. */
export const GUIDE_STARTERS = [
  "I need help now",
  "Find a condition",
  "Look up a medicine",
  "Track my symptoms",
  "Find a charity",
] as const;

export const GUIDE_GREETING =
  "Hello. I can help you find your way around UnTouchable. Tell me what you are looking for, or pick one of these. I can't give medical advice.";

/**
 * Phrases that mean someone may be in danger. Matched as whole words or phrases on the
 * lower-cased text. Kept deliberately wide: a false alarm costs one reply with three phone
 * numbers in it, and a miss costs far more.
 */
const CRISIS_PATTERNS: RegExp[] = [
  /\bsuicid/,
  /\bkill (my ?self|me)\b/,
  /\bend (it all|my life)\b/,
  /\b(want|wanna|going) to die\b/,
  /\bdon'?t want to (be here|live|wake up)\b/,
  /\bno reason to live\b/,
  /\bself[- ]?harm/,
  /\bhurt(ing)? my ?self\b/,
  /\bcut(ting)? my ?self\b/,
  /\boverdos/,
  /\btaken too many\b/,
  /\bcan'?t breathe\b/,
  /\bchest pains?\b/,
  /\bemergency\b/,
  /\bhelp now\b/,
  /\bcrisis\b/,
  /\bnot safe\b/,
  /\bin danger\b/,
];

/**
 * Questions that ask us to judge, recommend or dose. Rule 9 and rule 17: we show information,
 * we do not interpret it.
 */
const MEDICAL_PATTERNS: RegExp[] = [
  /\bshould i (take|stop|start|try|use|eat|drink|worry|be worried)\b/,
  /\bis it (safe|ok|okay|normal|serious|bad)\b/,
  /\bis this (safe|ok|okay|normal|serious|bad)\b/,
  /\bhow (much|many|often) (should|can|do) i\b/,
  /\bwhat (dose|dosage)\b/,
  /\b(dose|dosage|how many mg)\b/,
  /\bwhat should i (take|do|eat)\b/,
  /\bdo i have\b/,
  /\bdoes (it|this|that) work\b/,
  /\b(best|better) (treatment|medicine|drug|cure)\b/,
  /\bcure for\b/,
  /\bcan i (take|mix|stop|drink)\b/,
];

interface Topic {
  key: string;
  /** Matched against the lower-cased text as whole words or phrases. */
  words: string[];
  text: string;
  links: GuideLink[];
}

export const GUIDE_TOPICS: readonly Topic[] = [
  {
    key: "side-effects",
    words: ["side effect", "side effects", "reaction", "yellow card", "report a"],
    text: "You can report a suspected side effect of a medicine to the MHRA's Yellow Card scheme. If you are tracking a treatment here, you can note side effects against it too.",
    links: [
      { href: YELLOW_CARD_URL, label: "Yellow Card (MHRA)", external: true },
      { href: "/treatments", label: "Your treatments" },
    ],
  },
  {
    key: "conditions",
    words: ["condition", "conditions", "illness", "disease", "diagnosed", "diagnosis"],
    text: "Every condition has its own page, with the stories people have shared about it and charities that work on it.",
    links: [{ href: "/conditions", label: "All conditions" }],
  },
  {
    key: "medicines",
    words: [
      "medicine",
      "medicines",
      "medication",
      "drug",
      "drugs",
      "tablet",
      "tablets",
      "pill",
      "pills",
      "prescription",
      "prescribed",
    ],
    text: "The medicines pages explain what a medicine is, drawn from the NHS, the BNF and the electronic Medicines Compendium. They don't say whether it is right for you — your GP or pharmacist can.",
    links: [{ href: "/medicines", label: "Medicines" }],
  },
  {
    key: "tracking",
    words: [
      "track",
      "tracking",
      "tracker",
      "log",
      "symptom",
      "symptoms",
      "diary",
      "record",
      "pain score",
    ],
    text: "The symptom tracker takes under a minute a day. Your timeline then shows what you have recorded over time, and the health tracker lists everything else you can keep a record of. You'll need to sign in.",
    links: [
      { href: "/log", label: "Symptom tracker" },
      { href: "/timeline", label: "Your timeline" },
      { href: "/tracker", label: "Health tracker" },
      { href: "/dashboard", label: "Dashboard" },
    ],
  },
  {
    key: "treatments",
    words: ["treatment", "treatments", "course", "started taking", "stopped taking", "therapy"],
    text: "You can record a treatment when you start it and when you stop, so it shows on your timeline.",
    links: [
      { href: "/treatments", label: "Your treatments" },
      { href: "/treatments/new", label: "Add a treatment" },
    ],
  },
  {
    key: "appointment",
    words: ["gp", "doctor", "appointment", "consultant", "nurse", "handover", "questions to ask"],
    text: "Before an appointment, your handover puts what you have recorded on one page to show your doctor, and there is a list of questions you might want to ask.",
    links: [
      { href: "/timeline/handover", label: "Your handover" },
      { href: "/timeline/questions", label: "Questions to ask" },
    ],
  },
  {
    key: "check-ins",
    words: ["check-in", "check-ins", "check in", "questionnaire", "questionnaires", "survey"],
    text: "Check-ins are short sets of questions that come round on a schedule, so you can compare how things were over time.",
    links: [{ href: "/check-ins", label: "Your check-ins" }],
  },
  {
    key: "food",
    words: ["food", "eat", "eating", "diet", "meal", "meals", "menu", "restaurant"],
    text: "The Food Advisor helps you read a menu against the things you have told us to avoid. You'll need to sign in.",
    links: [{ href: "/food", label: "Food Advisor" }],
  },
  {
    key: "stories",
    words: [
      "story",
      "stories",
      "famous",
      "celebrity",
      "celebrities",
      "public figure",
      "someone like me",
      "alone",
      "not alone",
    ],
    text: "Stories are about people who chose to talk publicly about their health. You can read them all, or find them by condition.",
    links: [
      { href: "/stories", label: "Stories" },
      { href: "/conditions", label: "Browse by condition" },
    ],
  },
  {
    key: "charities",
    words: [
      "charity",
      "charities",
      "donate",
      "donation",
      "donating",
      "give",
      "fundraise",
      "support group",
    ],
    text: "Every charity listed here has been checked by an editor. Each page links to the charity's own site.",
    links: [
      { href: "/charities", label: "Charities" },
      { href: "/account/causes", label: "Causes you follow" },
    ],
  },
  {
    key: "privacy",
    words: [
      "privacy",
      "consent",
      "my data",
      "research",
      "share my data",
      "stop tracking",
      "withdraw",
      "delete",
      "gdpr",
    ],
    text: "You decide what your data is used for, and you can change your mind at any time. It takes effect straight away.",
    links: [
      { href: "/settings/consent", label: "Your choices about your data" },
      { href: "/settings", label: "Settings" },
    ],
  },
  {
    key: "correction",
    words: [
      "correction",
      "wrong",
      "mistake",
      "inaccurate",
      "remove",
      "removal",
      "take down",
      "complaint",
    ],
    text: "If something we published is wrong, or is about you and you want it taken down, you can ask here. An editor reads every request.",
    links: [{ href: "/corrections", label: "Request a correction or removal" }],
  },
  {
    key: "account",
    words: [
      "sign in",
      "log in",
      "login",
      "sign up",
      "join",
      "register",
      "account",
      "password",
      "profile",
      "settings",
      "name",
    ],
    text: "You can read stories, conditions, medicines and charities without an account. You need one to track anything.",
    links: [
      { href: "/sign-in", label: "Sign in" },
      { href: "/sign-up", label: "Join" },
      { href: "/settings", label: "Settings" },
    ],
  },
  {
    key: "education",
    words: ["learn", "learning", "education", "course", "courses", "listen", "how the body works"],
    text: "Education has short spoken courses about how the body works. You'll need to sign in.",
    links: [{ href: "/learn", label: "Education" }],
  },
  {
    key: "about",
    words: [
      "about us",
      "about you",
      "about untouchable",
      "who are you",
      "who runs",
      "why does this site",
      "editorial",
      "how you write",
      "evidence",
    ],
    text: "This is who we are, how we write stories, and how the data is used.",
    links: [
      { href: "/about", label: "Why we exist" },
      { href: "/about/editorial", label: "How we write stories" },
      { href: "/about/evidence", label: "How the data is used" },
    ],
  },
  {
    key: "home",
    words: ["home", "start", "front page", "main page"],
    text: "Here is the front page.",
    links: [{ href: "/", label: "Home" }],
  },
];

const CRISIS_REPLY: GuideReply = {
  kind: "crisis",
  text: "If you or someone else is in danger right now, call 999. For urgent help that is not an emergency, call NHS 111. If you are struggling to cope, Samaritans will listen, day and night.",
  links: SUPPORT_CONTACTS.map((contact) => ({
    href: contact.href,
    label: `${contact.name} — ${contact.contact}`,
    external: true,
  })),
};

const MEDICAL_REPLY: GuideReply = {
  kind: "medical",
  text: "I can't answer that. UnTouchable doesn't give medical advice. A pharmacist, your GP or NHS 111 can. I can show you where things are on this site.",
  links: [
    { href: "tel:111", label: "NHS 111", external: true },
    { href: "/medicines", label: "Medicines" },
    { href: "/conditions", label: "Conditions" },
  ],
};

function normalise(input: string): string {
  return input
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9' -]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mentions(text: string, phrase: string): boolean {
  return new RegExp(`\\b${escapeRegExp(phrase)}\\b`).test(text);
}

/** Pure, synchronous, and the only place a reply is decided. */
export function answerGuide(input: string): GuideReply {
  const text = normalise(input.slice(0, 500));

  if (CRISIS_PATTERNS.some((pattern) => pattern.test(text))) return CRISIS_REPLY;
  if (MEDICAL_PATTERNS.some((pattern) => pattern.test(text))) return MEDICAL_REPLY;

  const topic = GUIDE_TOPICS.find((candidate) =>
    candidate.words.some((word) => mentions(text, word)),
  );
  if (topic) return { kind: "topic", text: topic.text, links: topic.links };

  const query = input.trim().slice(0, MAX_QUERY_LENGTH);
  return {
    kind: "fallback",
    text: query
      ? "I'm not sure where that is. You could search the whole site for it, or look through these."
      : "Tell me what you are looking for, or pick one of these.",
    links: [
      ...(query
        ? [{ href: `/?q=${encodeURIComponent(query)}`, label: `Search for “${query}”` }]
        : []),
      { href: "/conditions", label: "Conditions" },
      { href: "/stories", label: "Stories" },
      { href: "/log", label: "Symptom tracker" },
    ],
  };
}
