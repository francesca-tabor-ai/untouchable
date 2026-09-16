import {
  ConsentPurpose,
  InterventionType,
  PrismaClient,
  StopReason,
} from "../../src/generated/prisma";

import type { SeedContext } from "./context";

/**
 * Demo patients with enough history to make the dashboard and the research view real.
 *
 * **Everybody here is invented.** The names are made up, the email addresses are on
 * `.example`, and nothing about any of them is drawn from a real person — AGENTS.md rule 1.
 *
 * Three things this seed is deliberately built to demonstrate.
 *
 * **1. Small-group suppression, both ways.** The privacy threshold is 10 (configurable via
 * `PRIVACY_MIN_GROUP_SIZE`). The cohorts below are sized so that after consent filtering some
 * groups are comfortably over it and some are comfortably under, so the research view shows
 * real suppression rather than a theoretical possibility. The numbers are stated in `COHORTS`
 * and printed when the seed runs — if the threshold changes, check them again.
 *
 * **2. Consent that is not uniform.** Some of these people consented to research, some
 * refused, and some consented and later withdrew. Withdrawal is written as a second consent
 * row, which is how the real flow records it, so the "withdrawal takes effect immediately"
 * behaviour has something honest to run against.
 *
 * **3. Data that wanders.** Symptom scores are a random walk with no trend term anywhere in
 * the generator. No treatment in this seed is arranged to look as though it did anything,
 * because a demo data set that tells a story is a demo data set that will end up quoted.
 *
 * The generator is seeded, so the same command produces the same people every time and a
 * screenshot from last week still matches.
 */

const DEMO_EMAIL_PREFIX = "demo.";

/** Deterministic PRNG. Same seed, same person, every run. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = [
  "Marlow", "Effie", "Jonah", "Perdita", "Rafe", "Ilma", "Tobias", "Wren",
  "Casper", "Nerys", "Ottilie", "Hal", "Bronwen", "Idris", "Saffron", "Merrick",
  "Delphine", "Aurelio", "Tamsin", "Gethin", "Halina", "Corwen", "Petra", "Ansel",
  "Lowri", "Barnaby", "Isolde", "Quillon", "Maris", "Fenwick", "Verity", "Osric",
  "Clemency", "Hesper", "Ruan", "Sable",
];

const LAST_NAMES = [
  "Ashgrove", "Marlbrook", "Fennimore", "Quillon", "Hartsell", "Braddock", "Windlesham",
  "Pettigrew", "Calloway", "Thorncroft", "Vellacott", "Ransley", "Ormerod", "Duggleby",
  "Havisham", "Netherby", "Crompsall", "Fairweather", "Stanhope", "Wraysbury", "Tolliver",
  "Merrivale", "Ashcombe", "Pendrell", "Halloway", "Bexworth", "Larkhill", "Cranemoor",
  "Sedgewick", "Farrowdale", "Ilminster", "Kettleby", "Ravensden", "Shawcross", "Underhill",
  "Wolstenholme",
];

const REGIONS = [
  "North East", "North West", "Yorkshire and The Humber", "East Midlands", "West Midlands",
  "East of England", "London", "South East", "South West", "Wales", "Scotland",
  "Northern Ireland",
];

/**
 * A treatment offered to a slice of a cohort.
 *
 * `from`/`to` are indexes within the cohort, so the overlap between treatments — and the
 * overlap with the people who refused or withdrew consent — is plain to read here rather
 * than an accident of a random draw.
 */
interface CohortTreatment {
  name: string;
  type: InterventionType;
  from: number;
  to: number;
  /** Indexes within the cohort whose course has ended, with the reason they gave. */
  stoppedBy?: { index: number; reason: StopReason; afterDays: number }[];
  /** Indexes within the cohort who recorded a side effect against this course. */
  sideEffects?: number[];
}

interface Cohort {
  key: string;
  conditionSlug: string;
  size: number;
  symptomSlugs: string[];
  /** Indexes within the cohort. Everybody else consents to research. */
  refusedResearch: number[];
  /** Consented first, withdrew later. Two consent rows, the second one `granted: false`. */
  withdrewResearch: number[];
  treatments: CohortTreatment[];
}

/**
 * The cohort plan, written out so the research milestone can check its expectations against
 * it without reading the generator.
 *
 * Counts after consent filtering, at a threshold of 10:
 *
 * | Group                              | People | Consented | Disclosed? |
 * |------------------------------------|--------|-----------|------------|
 * | Type 2 diabetes                    |     16 |        14 | yes        |
 * |   · Metformin                      |     14 |        12 | yes        |
 * |   · Gliclazide                     |      5 |         4 | no         |
 * |   · Structured exercise            |      7 |         6 | no         |
 * | Depression                         |     15 |        12 | yes        |
 * |   · Sertraline                     |     14 |        11 | yes        |
 * |   · Cognitive behavioural therapy  |      7 |         5 | no         |
 * | Breast cancer                      |      6 |         4 | no         |
 * |   · Tamoxifen                      |      4 |         3 | no         |
 * |   · Letrozole                      |      2 |         1 | no         |
 */
const COHORTS: Cohort[] = [
  {
    key: "t2d",
    conditionSlug: "type-2-diabetes",
    size: 16,
    symptomSlugs: ["fatigue", "thirst", "blurred-vision", "trouble-sleeping"],
    refusedResearch: [7],
    withdrewResearch: [12],
    treatments: [
      {
        name: "Metformin",
        type: "rx",
        from: 0,
        to: 13,
        stoppedBy: [
          { index: 2, reason: "side_effects", afterDays: 96 },
          { index: 9, reason: "clinician_advice", afterDays: 150 },
        ],
        sideEffects: [2, 5],
      },
      {
        name: "Gliclazide",
        type: "rx",
        from: 10,
        to: 14,
        stoppedBy: [{ index: 11, reason: "not_working", afterDays: 74 }],
      },
      {
        name: "Structured exercise",
        type: "non_drug",
        from: 3,
        to: 9,
        stoppedBy: [{ index: 6, reason: "other", afterDays: 61 }],
      },
      { name: "Blood glucose monitor", type: "device", from: 0, to: 4 },
    ],
  },
  {
    key: "depression",
    conditionSlug: "depression",
    size: 15,
    symptomSlugs: ["low-mood", "fatigue", "trouble-sleeping", "anxiety", "loss-of-interest"],
    refusedResearch: [4, 9],
    withdrewResearch: [11],
    treatments: [
      {
        name: "Sertraline",
        type: "rx",
        from: 0,
        to: 13,
        stoppedBy: [
          { index: 1, reason: "side_effects", afterDays: 41 },
          { index: 8, reason: "not_working", afterDays: 120 },
        ],
        sideEffects: [1, 3],
      },
      {
        name: "Cognitive behavioural therapy",
        type: "non_drug",
        from: 6,
        to: 12,
        stoppedBy: [{ index: 10, reason: "cost", afterDays: 88 }],
      },
      { name: "Mindfulness practice", type: "non_drug", from: 2, to: 5 },
    ],
  },
  {
    // Deliberately under the threshold. The research view must show this group as suppressed
    // rather than quietly leaving it out, and it cannot do that if nobody is in it.
    key: "breast-cancer",
    conditionSlug: "breast-cancer",
    size: 6,
    symptomSlugs: ["fatigue", "pain", "nausea", "hot-flushes", "brain-fog"],
    refusedResearch: [3],
    withdrewResearch: [5],
    treatments: [
      {
        name: "Tamoxifen",
        type: "rx",
        from: 0,
        to: 3,
        stoppedBy: [{ index: 1, reason: "side_effects", afterDays: 132 }],
        sideEffects: [1],
      },
      { name: "Letrozole", type: "rx", from: 4, to: 5 },
      { name: "Physiotherapy", type: "non_drug", from: 0, to: 2 },
    ],
  },
];

const CONTEXT_TAG_VALUES = [
  "poor_sleep", "illness", "stress", "missed_dose", "busy", "rest", "appointment", "travel",
];

/** A handful of invented notes. Free text: never exported, never shown to anybody else. */
const NOTES = [
  "Long day. Did the shopping, which I would not have managed last month.",
  "Woke at four and could not get back off.",
  "Kept the walk short today.",
  "Forgot the evening one until nearly midnight.",
  "Wrote this one down so I remember it.",
  "Appointment moved again. Frustrating more than anything.",
  "Did not leave the house.",
  "Made it to the allotment for an hour.",
];

const STOP_NOTES = [
  "Could not get on with it at all in the end.",
  "Talked it through with the nurse and we agreed.",
  "Too dear once the prescription charges went up.",
  "It was the mornings that did it.",
];

const SIDE_EFFECT_NOTES = [
  "Stomach upset for most of the first fortnight, worst after the morning one.",
  "Headache that came on about an hour after taking it, most days.",
  "Very dry mouth, and trouble getting off to sleep.",
];

function midnightUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, days: number): Date {
  const next = midnightUtc(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/**
 * A random walk, clamped to 0–10. No drift term, no treatment effect, no recovery arc.
 *
 * This is the important function in the file. A generator with any trend in it would produce
 * a demo data set that appears to say something about whether a treatment works, and
 * somebody would eventually screenshot it as though it did.
 */
function nextScore(current: number, random: () => number): number {
  const roll = random();
  let step = 0;
  if (roll < 0.18) step = -1;
  else if (roll < 0.3) step = -2;
  else if (roll < 0.58) step = 0;
  else if (roll < 0.85) step = 1;
  else step = 2;

  return Math.max(0, Math.min(10, current + step));
}

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.min(items.length - 1, Math.floor(random() * items.length))];
}

export async function seedDemoTracking(db: PrismaClient, ctx: SeedContext) {
  // Re-running the seed replaces the demo patients rather than doubling their history.
  // Deleting the user cascades to consents, conditions, symptoms, courses and logs.
  await db.user.deleteMany({ where: { email: { startsWith: DEMO_EMAIL_PREFIX } } });

  const symptoms = await db.symptom.findMany({ select: { id: true, slug: true } });
  const symptomBySlug = new Map(symptoms.map((symptom) => [symptom.slug, symptom.id]));

  const today = midnightUtc(new Date());
  const summary: string[] = [];
  let personNumber = 0;
  let logCount = 0;

  for (const cohort of COHORTS) {
    const condition = ctx.conditions[cohort.conditionSlug];
    if (!condition) {
      throw new Error(`Demo seed expected the condition "${cohort.conditionSlug}" to exist.`);
    }

    let consented = 0;

    for (let index = 0; index < cohort.size; index += 1) {
      personNumber += 1;
      const random = mulberry32(personNumber * 7919 + 13);

      const firstName = FIRST_NAMES[personNumber % FIRST_NAMES.length];
      const lastName = LAST_NAMES[(personNumber * 5) % LAST_NAMES.length];
      const email = `${DEMO_EMAIL_PREFIX}${cohort.key}.${index + 1}@untouchable.example`;

      const refused = cohort.refusedResearch.includes(index);
      const withdrew = cohort.withdrewResearch.includes(index);
      if (!refused && !withdrew) consented += 1;

      const user = await db.user.create({
        data: {
          email,
          passwordHash: ctx.passwordHash,
          ageConfirmedAt: addDays(today, -400),
          emailVerified: addDays(today, -400),
          profile: {
            create: {
              displayName: `${firstName} ${lastName}`,
              yearOfBirth: 1948 + Math.floor(random() * 50),
              region: pick(REGIONS, random),
              // Everybody here has been asked about their treatments. A few of them have no
              // courses at all, which is the "I am not on anything" answer recorded honestly.
              treatmentsConfirmedAt: addDays(today, -Math.floor(random() * 120) - 5),
            },
          },
          conditions: {
            create: {
              conditionId: condition.id,
              diagnosedYear: 2012 + Math.floor(random() * 13),
              selfReported: random() < 0.25,
            },
          },
        },
      });

      // --- Consent --------------------------------------------------------------------
      // Core tracking, always: these are people using the tracking features. Research
      // consent varies, and a withdrawal is a second row rather than an edit of the first.
      const consentRows: {
        purpose: ConsentPurpose;
        granted: boolean;
        consentTextVersion: string;
        createdAt: Date;
      }[] = [
        {
          purpose: "core_tracking",
          granted: true,
          consentTextVersion: "2026-09-01",
          createdAt: addDays(today, -400),
        },
        {
          purpose: "research_anonymised",
          granted: !refused,
          consentTextVersion: "2026-09-01",
          createdAt: addDays(today, -400),
        },
        {
          purpose: "commercial_research",
          granted: !refused && !withdrew && random() < 0.35,
          consentTextVersion: "2026-09-01",
          createdAt: addDays(today, -400),
        },
        {
          purpose: "contact_for_studies",
          granted: !refused && random() < 0.3,
          consentTextVersion: "2026-09-01",
          createdAt: addDays(today, -400),
        },
        {
          purpose: "marketing_email",
          granted: random() < 0.2,
          consentTextVersion: "2026-09-01",
          createdAt: addDays(today, -400),
        },
      ];

      if (withdrew) {
        consentRows.push(
          {
            purpose: "research_anonymised",
            granted: false,
            consentTextVersion: "2026-09-01",
            createdAt: addDays(today, -30),
          },
          {
            purpose: "commercial_research",
            granted: false,
            consentTextVersion: "2026-09-01",
            createdAt: addDays(today, -30),
          },
        );
      }

      await db.consentRecord.createMany({
        data: consentRows.map((row) => ({ ...row, userId: user.id })),
      });

      // --- Symptoms -------------------------------------------------------------------
      // Three or four of the condition's symptoms, not all of them. Real people pick a few.
      const chosenSlugs = cohort.symptomSlugs.filter(() => random() < 0.7);
      if (chosenSlugs.length < 2) chosenSlugs.push(...cohort.symptomSlugs.slice(0, 2));

      const userSymptoms = await Promise.all(
        [...new Set(chosenSlugs)].map((slug) =>
          db.userSymptom.create({
            data: { userId: user.id, symptomId: symptomBySlug.get(slug)!, active: true },
          }),
        ),
      );

      // --- Treatment courses ----------------------------------------------------------
      for (const treatment of cohort.treatments) {
        if (index < treatment.from || index > treatment.to) continue;

        const intervention = await db.intervention.upsert({
          where: { name_type: { name: treatment.name, type: treatment.type } },
          update: {},
          // dmdCode stays null. A full dm+d import needs an NHS TRUD account, and a guessed
          // code would be wrong in a way that looks authoritative.
          create: { name: treatment.name, type: treatment.type, dmdCode: null },
        });

        const startDate = addDays(today, -(120 + Math.floor(random() * 240)));
        const stop = treatment.stoppedBy?.find((entry) => entry.index === index);
        const isDrug = treatment.type !== "non_drug" && treatment.type !== "device";

        const course = await db.treatmentCourse.create({
          data: {
            userId: user.id,
            interventionId: intervention.id,
            dose: isDrug ? pick(["500mg", "20mg", "50mg", "10mg"], random) : null,
            frequency: pick(["Once a day", "Twice a day", "Every morning", "Once a week"], random),
            route: isDrug ? "By mouth" : null,
            startDate,
            endDate: stop ? addDays(startDate, stop.afterDays) : null,
            stopReason: stop ? stop.reason : null,
            stopReasonNote: stop && random() < 0.6 ? pick(STOP_NOTES, random) : null,
            adherenceRating: random() < 0.8 ? 4 + Math.floor(random() * 7) : null,
          },
        });

        if (treatment.sideEffects?.includes(index)) {
          const reportedAt = addDays(startDate, 10 + Math.floor(random() * 30));
          await db.sideEffectReport.create({
            data: {
              userId: user.id,
              treatmentCourseId: course.id,
              description: pick(SIDE_EFFECT_NOTES, random),
              severity: 2 + Math.floor(random() * 3),
              // Brief 7.8: after any logged side effect we show the Yellow Card scheme, and
              // we record that we showed it.
              yellowCardShownAt: reportedAt,
              createdAt: reportedAt,
            },
          });
        }
      }

      // --- Daily logs -----------------------------------------------------------------
      // A few months of history, with gaps. One person in every eight logs almost nothing,
      // because that is what the dashboard will actually have to render.
      const sparse = index % 8 === 5;
      const historyDays = sparse ? 30 : 100 + Math.floor(random() * 110);
      const logRate = sparse ? 0.12 : 0.5 + random() * 0.4;

      const running = new Map(userSymptoms.map((row) => [row.id, 2 + Math.floor(random() * 7)]));

      const logs: {
        userId: string;
        date: Date;
        symptomScoresJson: Record<string, number>;
        tags: string[];
        note: string | null;
      }[] = [];

      for (let back = historyDays; back >= 0; back -= 1) {
        for (const [userSymptomId, score] of running) {
          running.set(userSymptomId, nextScore(score, random));
        }
        if (random() > logRate) continue;

        const tags: string[] = [];
        for (const tag of CONTEXT_TAG_VALUES) {
          if (random() < 0.06) tags.push(tag);
        }

        logs.push({
          userId: user.id,
          date: addDays(today, -back),
          symptomScoresJson: Object.fromEntries(running),
          tags,
          note: random() < 0.12 ? pick(NOTES, random) : null,
        });
      }

      if (logs.length > 0) {
        await db.dailyLog.createMany({ data: logs, skipDuplicates: true });
        logCount += logs.length;
      }
    }

    summary.push(
      `    ${cohort.conditionSlug}: ${cohort.size} people, ${consented} consented to research ` +
        `— ${consented >= 10 ? "over" : "under"} the suppression threshold of 10`,
    );
  }

  console.info(summary.join("\n"));
  console.info(
    `    ${personNumber} demo patients and ${logCount} daily logs, all invented. ` +
      `Sign in as ${DEMO_EMAIL_PREFIX}<cohort>.<n>@untouchable.example`,
  );
}
