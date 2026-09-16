// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { Regulator } from "@/generated/prisma";
import {
  REFERRAL_ORIGINS,
  recordDonationReferral,
  referralReport,
  toReferralOrigin,
} from "@/lib/charities/referrals";
import { followCharity } from "@/lib/charities/follows";
import { addDonationNote } from "@/lib/charities/donation-notes";
import { makeUser, resetDatabase, testDb } from "../helpers/db";

/**
 * AGENTS.md rule 12 and docs/privacy.md: a DonationReferral never stores a user id, an IP
 * address or health context. The referral report contains no user-identifying data.
 */

let counter = 0;

async function makeVerifiedCharity(editorId: string, name = "Invented Charity") {
  counter += 1;
  return testDb.charity.create({
    data: {
      name: `${name} ${counter}`,
      slug: `referral-charity-${counter}`,
      registeredNumber: String(2000000 + counter),
      regulator: Regulator.CCEW,
      websiteUrl: `https://referral-${counter}.example.test`,
      donationUrl: `https://referral-${counter}.example.test/donate`,
      description: "An invented charity, used only in tests.",
      verifiedAt: new Date(),
      verifiedById: editorId,
    },
  });
}

describe("donation referrals are anonymous", () => {
  beforeEach(resetDatabase);
  afterAll(async () => {
    await testDb.$disconnect();
  });

  it("stores only the charity, a page kind and a timestamp", async () => {
    const editor = await makeUser({ role: "editor" });
    const charity = await makeVerifiedCharity(editor.id);

    await recordDonationReferral({ charityId: charity.id, origin: "condition" });

    const [referral] = await testDb.donationReferral.findMany();

    expect(Object.keys(referral).sort()).toEqual(
      ["charityId", "createdAt", "id", "originPage"].sort(),
    );
    expect(referral.originPage).toBe("condition");
  });

  it("makes a referral from a signed-in person indistinguishable from a visitor's", async () => {
    const editor = await makeUser({ role: "editor" });
    const charity = await makeVerifiedCharity(editor.id);
    const person = await makeUser();

    // Someone signed in, who follows the charity and has noted a donation to it — as much
    // context as the system ever holds about a person and a charity.
    await followCharity(person.id, charity.id);
    await addDonationNote({
      userId: person.id,
      charityId: charity.id,
      amount: "25",
      donatedOn: new Date("2026-09-01"),
      note: "Gave after reading a story.",
    });
    await recordDonationReferral({ charityId: charity.id, origin: "story" });

    // And a visitor, with no account at all.
    await recordDonationReferral({ charityId: charity.id, origin: "story" });

    const referrals = await testDb.donationReferral.findMany({ orderBy: { createdAt: "asc" } });
    const withoutIdentity = referrals.map(({ id: _id, createdAt: _createdAt, ...rest }) => rest);

    expect(referrals).toHaveLength(2);
    expect(withoutIdentity[0]).toEqual(withoutIdentity[1]);
  });

  it("refuses to put anything but a known page kind in the record", async () => {
    const editor = await makeUser({ role: "editor" });
    const charity = await makeVerifiedCharity(editor.id);

    // A URL, an id, or anything else someone might try to pass through the query string.
    await recordDonationReferral({
      charityId: charity.id,
      origin: "https://untouchable.example/account/user-42" as never,
    });

    const [referral] = await testDb.donationReferral.findMany();

    expect(REFERRAL_ORIGINS).toContain(referral.originPage);
    expect(referral.originPage).toBe("charity");
    expect(referral.originPage).not.toContain("user-42");
  });

  it("coerces anything unexpected to a safe default", () => {
    expect(toReferralOrigin("story")).toBe("story");
    expect(toReferralOrigin(null)).toBe("charity");
    expect(toReferralOrigin("/account/causes?user=42")).toBe("charity");
    expect(toReferralOrigin({ userId: "abc" })).toBe("charity");
  });
});

describe("the referral report carries no user data", () => {
  beforeEach(resetDatabase);

  it("reports counts per charity and nothing about anyone", async () => {
    const editor = await makeUser({ role: "editor" });
    const person = await makeUser({ email: "someone@example.test" });
    const charity = await makeVerifiedCharity(editor.id, "Reported Charity");

    await followCharity(person.id, charity.id);
    await addDonationNote({
      userId: person.id,
      charityId: charity.id,
      amount: "10",
      donatedOn: new Date("2026-09-10"),
      note: "A private note nobody else may read.",
    });
    await recordDonationReferral({ charityId: charity.id, origin: "condition" });
    await recordDonationReferral({ charityId: charity.id, origin: "story" });

    const report = await referralReport();
    const serialised = JSON.stringify(report);

    expect(report.totals.all).toBe(2);
    expect(report.rows[0].byOrigin).toEqual({ charity: 0, condition: 1, story: 1, causes: 0 });

    // Nothing about the person, what they follow, or what they noted.
    expect(serialised).not.toContain(person.id);
    expect(serialised).not.toContain("someone@example.test");
    expect(serialised).not.toContain("A private note");
    expect(serialised.toLowerCase()).not.toContain("follow");

    const keys = new Set(Object.keys(report.rows[0]));
    expect(keys).toEqual(
      new Set(["charityId", "charityName", "charitySlug", "total", "last30Days", "byOrigin"]),
    );
  });

  it("separates the last thirty days from the whole history", async () => {
    const editor = await makeUser({ role: "editor" });
    const charity = await makeVerifiedCharity(editor.id);

    await testDb.donationReferral.createMany({
      data: [
        { charityId: charity.id, originPage: "charity", createdAt: new Date("2026-09-10") },
        { charityId: charity.id, originPage: "charity", createdAt: new Date("2026-01-10") },
      ],
    });

    const report = await referralReport(new Date("2026-09-16T12:00:00.000Z"));

    expect(report.rows[0].total).toBe(2);
    expect(report.rows[0].last30Days).toBe(1);
  });
});
