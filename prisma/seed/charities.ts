import { PrismaClient, Regulator } from "../../src/generated/prisma";

import type { SeedContext } from "./context";

/**
 * Fictional charities.
 *
 * EVERY CHARITY HERE IS INVENTED, with an obviously invalid registration number. Seeding a
 * real charity's registration number would assert a verification that no editor performed —
 * see DECISIONS.md D-005. Websites use the reserved `.test` domain, which cannot resolve, so
 * nothing here can accidentally send a person or a donation anywhere real.
 *
 * The set deliberately covers every state an editor and a visitor need to see:
 *
 * - verified and current — the ordinary case, one per launch condition
 * - verified but overdue for its yearly re-check — flagged in the admin, still public (D-013)
 * - never verified — must never appear on a public page at all
 * - withdrawn (`active: false`) — kept for its referral history, invisible to the public
 * - no logo permission — name shown as text, never the logo
 *
 * Owned by the charity feature team.
 */

const MONTH = 30 * 24 * 60 * 60 * 1000;

interface SeedCharity {
  name: string;
  slug: string;
  registeredNumber: string;
  regulator: Regulator;
  websiteUrl: string;
  donationUrl: string;
  description: string;
  logoUrl: string | null;
  logoPermission: boolean;
  active: boolean;
  /** Months ago the editor recorded their check, or null for never checked. */
  verifiedMonthsAgo: number | null;
  verifier: "editorOne" | "editorTwo" | null;
  conditions: string[];
}

const CHARITIES: SeedCharity[] = [
  {
    name: "Mendip Breast Care Trust",
    slug: "mendip-breast-care-trust",
    registeredNumber: "0000001",
    regulator: Regulator.CCEW,
    websiteUrl: "https://mendip-breast-care.example.test",
    donationUrl: "https://mendip-breast-care.example.test/donate",
    description:
      "An invented charity for development. It runs a telephone line for people who have just been given a breast cancer diagnosis, and pays for travel to hospital appointments for people who cannot afford it.",
    logoUrl: "/charity-logos/mendip-breast-care-trust.svg",
    logoPermission: true,
    active: true,
    verifiedMonthsAgo: 2,
    verifier: "editorOne",
    conditions: ["breast-cancer"],
  },
  {
    name: "After the Ward",
    slug: "after-the-ward",
    registeredNumber: "0000002",
    regulator: Regulator.OSCR,
    websiteUrl: "https://after-the-ward.example.test",
    donationUrl: "https://after-the-ward.example.test/give",
    description:
      "An invented charity for development. It supports people in the year after cancer treatment finishes, when the appointments stop and everyone assumes you are fine.",
    logoUrl: "https://after-the-ward.example.test/logo.png",
    // We hold a logo file but no written permission, so the name shows as text only.
    logoPermission: false,
    active: true,
    verifiedMonthsAgo: 5,
    verifier: "editorTwo",
    conditions: ["breast-cancer", "depression"],
  },
  {
    name: "Blood Sugar Together",
    slug: "blood-sugar-together",
    registeredNumber: "0000003",
    regulator: Regulator.CCEW,
    websiteUrl: "https://blood-sugar-together.example.test",
    donationUrl: "https://blood-sugar-together.example.test/donate",
    description:
      "An invented charity for development. It runs local groups for people living with type 2 diabetes, and trains volunteers who have the condition themselves to help run them.",
    logoUrl: null,
    logoPermission: false,
    active: true,
    verifiedMonthsAgo: 1,
    verifier: "editorOne",
    conditions: ["type-2-diabetes"],
  },
  {
    name: "The Footcare Fund",
    slug: "the-footcare-fund",
    registeredNumber: "0000004",
    regulator: Regulator.CCNI,
    websiteUrl: "https://footcare-fund.example.test",
    donationUrl: "https://footcare-fund.example.test/donate",
    description:
      "An invented charity for development. It pays for podiatry appointments for people with diabetes who would otherwise wait months for one.",
    logoUrl: null,
    logoPermission: false,
    active: true,
    // Over the twelve-month line: this one is flagged for a re-check in the admin.
    verifiedMonthsAgo: 14,
    verifier: "editorTwo",
    conditions: ["type-2-diabetes"],
  },
  {
    name: "Quiet Hours",
    slug: "quiet-hours",
    registeredNumber: "0000005",
    regulator: Regulator.CCEW,
    websiteUrl: "https://quiet-hours.example.test",
    donationUrl: "https://quiet-hours.example.test/donate",
    description:
      "An invented charity for development. It runs a listening service in the evenings and at weekends for people living with depression, staffed by trained volunteers.",
    logoUrl: "/charity-logos/quiet-hours.svg",
    logoPermission: true,
    active: true,
    verifiedMonthsAgo: 3,
    verifier: "editorOne",
    conditions: ["depression"],
  },
  {
    name: "Kitchen Table Mental Health",
    slug: "kitchen-table-mental-health",
    registeredNumber: "0000006",
    regulator: Regulator.OSCR,
    websiteUrl: "https://kitchen-table-mh.example.test",
    donationUrl: "https://kitchen-table-mh.example.test/donate",
    description:
      "An invented charity for development. It puts small groups of people living with depression in touch with each other, in person, in ordinary places rather than clinical ones.",
    logoUrl: null,
    logoPermission: false,
    active: true,
    // Nobody has checked this against the register. It must not appear anywhere public.
    verifiedMonthsAgo: null,
    verifier: null,
    conditions: ["depression"],
  },
  {
    name: "Southfields Diabetes Appeal",
    slug: "southfields-diabetes-appeal",
    registeredNumber: "0000007",
    regulator: Regulator.CCEW,
    websiteUrl: "https://southfields-appeal.example.test",
    donationUrl: "https://southfields-appeal.example.test/donate",
    description:
      "An invented charity for development, withdrawn from the public site. Its referral history is kept, because we owe charities an accurate report of the support we sent them.",
    logoUrl: null,
    logoPermission: false,
    active: false,
    verifiedMonthsAgo: 8,
    verifier: "editorTwo",
    conditions: ["type-2-diabetes"],
  },
];

export async function seedCharities(db: PrismaClient, ctx: SeedContext) {
  const now = Date.now();

  for (const charity of CHARITIES) {
    const verifier = charity.verifier ? ctx[charity.verifier] : null;
    const verifiedAt =
      charity.verifiedMonthsAgo === null ? null : new Date(now - charity.verifiedMonthsAgo * MONTH);

    // The database requires verifiedAt and verifiedById together. Never one without the other.
    const verification =
      verifiedAt && verifier
        ? { verifiedAt, verifiedById: verifier.id }
        : { verifiedAt: null, verifiedById: null };

    const data = {
      name: charity.name,
      registeredNumber: charity.registeredNumber,
      regulator: charity.regulator,
      websiteUrl: charity.websiteUrl,
      donationUrl: charity.donationUrl,
      description: charity.description,
      logoUrl: charity.logoUrl,
      logoPermission: charity.logoPermission,
      active: charity.active,
      ...verification,
    };

    const record = await db.charity.upsert({
      where: { slug: charity.slug },
      update: data,
      create: { ...data, slug: charity.slug },
    });

    const conditions = await db.condition.findMany({
      where: { slug: { in: charity.conditions } },
      select: { id: true },
    });

    await db.charityCondition.deleteMany({ where: { charityId: record.id } });
    await db.charityCondition.createMany({
      data: conditions.map((condition) => ({ charityId: record.id, conditionId: condition.id })),
      skipDuplicates: true,
    });
  }

  await seedStoryLinks(db);
  await seedReferralHistory(db);
}

/**
 * Link charities to whatever stories the stories seed created.
 *
 * A story charity link with a source is a sourced claim that the public figure supports that
 * charity. A link without one is only "this charity works on this condition" and is never
 * rendered as a claim about the person — see `StoryCharities`. Both are seeded so both paths
 * are visible in development.
 *
 * Written defensively: the stories seed is owned by another team and may not have run.
 */
async function seedStoryLinks(db: PrismaClient) {
  const stories = await db.story.findMany({
    select: {
      id: true,
      conditions: { select: { condition: { select: { slug: true } } } },
      sources: { select: { id: true }, take: 1 },
    },
    orderBy: { createdAt: "asc" },
  });
  if (stories.length === 0) return;

  const charities = await db.charity.findMany({
    where: { active: true, verifiedAt: { not: null } },
    select: {
      id: true,
      slug: true,
      conditions: { select: { condition: { select: { slug: true } } } },
    },
  });

  let withSource = 0;

  for (const story of stories) {
    const storyConditions = new Set(story.conditions.map((link) => link.condition.slug));
    const matching = charities.filter((charity) =>
      charity.conditions.some((link) => storyConditions.has(link.condition.slug)),
    );

    for (const [index, charity] of matching.slice(0, 2).entries()) {
      // The first link on each story carries a source, so it can be shown as that person's
      // own publicly stated support. The second deliberately has none.
      const sourceId = index === 0 ? (story.sources[0]?.id ?? null) : null;
      if (sourceId) withSource += 1;

      await db.storyCharity.upsert({
        where: { storyId_charityId: { storyId: story.id, charityId: charity.id } },
        update: { sourceId },
        create: { storyId: story.id, charityId: charity.id, sourceId },
      });
    }
  }

  console.info(
    `  charity links on ${stories.length} stories (${withSource} with a source for the claim)`,
  );
}

/**
 * A little referral history, so the admin report is not empty in development.
 *
 * These rows carry a charity and a page kind. There is nowhere in them to put a person, and
 * nothing here knows who anyone is.
 */
async function seedReferralHistory(db: PrismaClient) {
  const existing = await db.donationReferral.count();
  if (existing > 0) return;

  const charities = await db.charity.findMany({ select: { id: true, slug: true } });
  const origins = ["charity", "condition", "story", "causes"];
  const rows: { charityId: string; originPage: string; createdAt: Date }[] = [];

  charities.forEach((charity, charityIndex) => {
    const clicks = 3 + ((charityIndex * 7) % 11);
    for (let i = 0; i < clicks; i += 1) {
      rows.push({
        charityId: charity.id,
        originPage: origins[(charityIndex + i) % origins.length],
        // Spread over the last ninety days so the 30-day column means something.
        createdAt: new Date(Date.now() - ((charityIndex * 13 + i * 5) % 90) * 24 * 60 * 60 * 1000),
      });
    }
  });

  await db.donationReferral.createMany({ data: rows });
}
