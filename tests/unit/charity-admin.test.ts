// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { Regulator } from "@/generated/prisma";
import {
  charitiesNeedingAttention,
  createCharity,
  getCharityForAdmin,
  listCharitiesForAdmin,
  setCharityActive,
  slugify,
  updateCharity,
  verifyCharity,
} from "@/lib/charities/admin";
import { getPublicCharity, listPublicCharities } from "@/lib/charities/queries";
import {
  REVERIFY_AFTER_MONTHS,
  needsReverification,
  reverifyDueAt,
  verificationState,
} from "@/lib/charities/verification";
import { makeUser, resetDatabase, testDb } from "../helpers/db";

/**
 * Brief 6.1: an editor checks each charity against the official register before it is
 * listed, we store who and when, and listings not re-verified within twelve months are
 * flagged.
 */

const valid = {
  name: "Invented Support Trust",
  slug: "invented-support-trust",
  registeredNumber: "0000001",
  regulator: Regulator.CCEW,
  websiteUrl: "https://invented-support.example.test",
  donationUrl: "https://invented-support.example.test/donate",
  description:
    "An invented charity, used only in tests. It does nothing, because it does not exist.",
  logoUrl: "",
  logoPermission: false,
  active: true,
  conditionIds: [] as string[],
};

describe("verification dates", () => {
  it("falls due twelve months after the check", () => {
    const verifiedAt = new Date("2026-01-15T00:00:00.000Z");
    expect(REVERIFY_AFTER_MONTHS).toBe(12);
    expect(reverifyDueAt(verifiedAt).toISOString()).toBe("2027-01-15T00:00:00.000Z");
  });

  it("calls a listing lapsed the moment it is twelve months old, and not before", () => {
    const verifiedAt = new Date("2026-01-15T00:00:00.000Z");
    const charity = { verifiedAt, verifiedById: "editor-1" };

    expect(verificationState(charity, new Date("2026-12-31T00:00:00.000Z"))).toBe("current");
    expect(verificationState(charity, new Date("2027-01-15T00:00:00.000Z"))).toBe("lapsed");
    expect(needsReverification(charity, new Date("2027-02-01T00:00:00.000Z"))).toBe(true);
  });

  it("calls a listing with no check never verified, whichever half is missing", () => {
    expect(verificationState({ verifiedAt: null, verifiedById: null })).toBe("never_verified");
    expect(verificationState({ verifiedAt: new Date(), verifiedById: null })).toBe(
      "never_verified",
    );
    expect(verificationState({ verifiedAt: null, verifiedById: "editor-1" })).toBe(
      "never_verified",
    );
  });
});

describe("creating and verifying a listing", () => {
  beforeEach(resetDatabase);
  afterAll(async () => {
    await testDb.$disconnect();
  });

  it("creates a listing that is not yet public", async () => {
    const result = await createCharity(valid);

    expect(result.ok).toBe(true);
    expect(await listPublicCharities()).toHaveLength(0);

    const [row] = await listCharitiesForAdmin();
    expect(row.verification).toBe("never_verified");
    expect(row.publiclyVisible).toBe(false);
  });

  it("publishes it once an editor records a check, with their name and the date", async () => {
    const editor = await makeUser({ role: "editor" });
    const created = await createCharity(valid);
    if (!created.ok) throw new Error("fixture failed");

    const at = new Date("2026-09-16T09:00:00.000Z");
    await verifyCharity(created.id, editor.id, at);

    const row = await getCharityForAdmin(created.id);
    expect(row?.verifiedAt?.toISOString()).toBe(at.toISOString());
    expect(row?.verifiedByEmail).toBe(editor.email);
    expect(await getPublicCharity(valid.slug)).not.toBeNull();
  });

  it("never records a date without a person, because the database will not have it", async () => {
    const created = await createCharity(valid);
    if (!created.ok) throw new Error("fixture failed");

    await expect(
      testDb.charity.update({
        where: { id: created.id },
        data: { verifiedAt: new Date(), verifiedById: null },
      }),
    ).rejects.toThrow();
  });

  it("rejects a listing with no description of our own", async () => {
    const result = await createCharity({ ...valid, description: "Good charity." });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected a failure");
    expect(result.problems.description).toBeTruthy();
  });

  it("rejects a second listing with the same registered number", async () => {
    await createCharity(valid);
    const result = await createCharity({ ...valid, slug: "a-different-slug" });

    expect(result.ok).toBe(false);
  });

  it("makes a sensible web address from a name", () => {
    expect(slugify("Invented Support Trust")).toBe("invented-support-trust");
    expect(slugify("St Anne's (Wales) Fund")).toBe("st-anne-s-wales-fund");
  });
});

describe("editing a listing", () => {
  beforeEach(resetDatabase);

  it("takes it out of the public directory when a checked fact changes", async () => {
    const editor = await makeUser({ role: "editor" });
    const created = await createCharity(valid);
    if (!created.ok) throw new Error("fixture failed");
    await verifyCharity(created.id, editor.id);
    expect(await getPublicCharity(valid.slug)).not.toBeNull();

    // The registered number is one of the things the editor checked against the register.
    const updated = await updateCharity(created.id, { ...valid, registeredNumber: "0000009" });

    expect(updated.ok).toBe(true);
    expect(await getPublicCharity(valid.slug)).toBeNull();
    expect((await getCharityForAdmin(created.id))?.verification).toBe("never_verified");
  });

  it("leaves the verification alone when only the description changes", async () => {
    const editor = await makeUser({ role: "editor" });
    const created = await createCharity(valid);
    if (!created.ok) throw new Error("fixture failed");
    await verifyCharity(created.id, editor.id);

    await updateCharity(created.id, {
      ...valid,
      description:
        "A rewritten description, still in our own words, still about a charity that does not exist.",
    });

    expect(await getPublicCharity(valid.slug)).not.toBeNull();
  });

  it("can withdraw a listing without losing its referral history", async () => {
    const editor = await makeUser({ role: "editor" });
    const created = await createCharity(valid);
    if (!created.ok) throw new Error("fixture failed");
    await verifyCharity(created.id, editor.id);
    await testDb.donationReferral.create({
      data: { charityId: created.id, originPage: "charity" },
    });

    await setCharityActive(created.id, false);

    expect(await getPublicCharity(valid.slug)).toBeNull();
    expect(await testDb.donationReferral.count()).toBe(1);
  });
});

describe("the admin flags listings that need looking at", () => {
  beforeEach(resetDatabase);

  it("flags a listing not re-verified within twelve months", async () => {
    const editor = await makeUser({ role: "editor" });

    const fresh = await createCharity({ ...valid, slug: "fresh", registeredNumber: "0000010" });
    const stale = await createCharity({ ...valid, slug: "stale", registeredNumber: "0000011" });
    const never = await createCharity({ ...valid, slug: "never", registeredNumber: "0000012" });
    if (!fresh.ok || !stale.ok || !never.ok) throw new Error("fixture failed");

    const now = new Date("2026-09-16T00:00:00.000Z");
    await verifyCharity(fresh.id, editor.id, new Date("2026-08-01T00:00:00.000Z"));
    await verifyCharity(stale.id, editor.id, new Date("2025-01-01T00:00:00.000Z"));

    const attention = await charitiesNeedingAttention(now);

    expect(attention.lapsed.map((row) => row.slug)).toEqual(["stale"]);
    expect(attention.neverVerified.map((row) => row.slug)).toEqual(["never"]);

    const rows = await listCharitiesForAdmin(now);
    const bySlug = Object.fromEntries(rows.map((row) => [row.slug, row]));
    expect(bySlug["stale"].needsReverification).toBe(true);
    expect(bySlug["fresh"].needsReverification).toBe(false);
    // A lapsed listing is flagged, but people can still find the charity. D-013.
    expect(bySlug["stale"].publiclyVisible).toBe(true);
    expect(bySlug["never"].publiclyVisible).toBe(false);
  });
});
