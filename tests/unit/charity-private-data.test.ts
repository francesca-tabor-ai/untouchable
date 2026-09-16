// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { Regulator } from "@/generated/prisma";
import {
  addDonationNote,
  deleteDonationNote,
  donationNotesFor,
} from "@/lib/charities/donation-notes";
import {
  followCharity,
  followedCharities,
  isFollowing,
  unfollowCharity,
} from "@/lib/charities/follows";
import { makeUser, resetDatabase, testDb } from "../helpers/db";

/**
 * Brief 6.4 and docs/privacy.md: following a condition-specific charity effectively
 * discloses a diagnosis. Follows and donation notes are health data — one person's own, and
 * never shared with the charity or with anyone else.
 */

let counter = 0;

async function makeCharity(editorId: string | null, options: { conditionId?: string } = {}) {
  counter += 1;
  return testDb.charity.create({
    data: {
      name: `Invented Charity ${counter}`,
      slug: `follow-charity-${counter}`,
      registeredNumber: String(3000000 + counter),
      regulator: Regulator.CCEW,
      websiteUrl: `https://follow-${counter}.example.test`,
      donationUrl: `https://follow-${counter}.example.test/donate`,
      description: "An invented charity, used only in tests.",
      ...(editorId ? { verifiedAt: new Date(), verifiedById: editorId } : {}),
      ...(options.conditionId
        ? { conditions: { create: { conditionId: options.conditionId } } }
        : {}),
    },
  });
}

describe("following a charity", () => {
  beforeEach(resetDatabase);
  afterAll(async () => {
    await testDb.$disconnect();
  });

  it("is visible to the person who follows and to nobody else", async () => {
    const editor = await makeUser({ role: "editor" });
    const charity = await makeCharity(editor.id);
    const alice = await makeUser();
    const bob = await makeUser();

    await followCharity(alice.id, charity.id);

    expect(await isFollowing(alice.id, charity.id)).toBe(true);
    expect(await isFollowing(bob.id, charity.id)).toBe(false);
    expect(await followedCharities(bob.id)).toHaveLength(0);
    expect((await followedCharities(alice.id)).map((item) => item.charity.slug)).toEqual([
      charity.slug,
    ]);
  });

  it("can be undone, and undoing it leaves nothing behind", async () => {
    const editor = await makeUser({ role: "editor" });
    const charity = await makeCharity(editor.id);
    const person = await makeUser();

    await followCharity(person.id, charity.id);
    await unfollowCharity(person.id, charity.id);

    expect(await followedCharities(person.id)).toHaveLength(0);
    expect(await testDb.charityFollow.count()).toBe(0);
  });

  it("is idempotent, so a double click does not fail", async () => {
    const editor = await makeUser({ role: "editor" });
    const charity = await makeCharity(editor.id);
    const person = await makeUser();

    await followCharity(person.id, charity.id);
    await followCharity(person.id, charity.id);

    expect(await testDb.charityFollow.count()).toBe(1);
  });

  it("cannot be used to follow a charity nobody has verified", async () => {
    // Otherwise an unverified listing reappears through someone's own account page.
    const charity = await makeCharity(null);
    const person = await makeUser();

    await followCharity(person.id, charity.id);

    expect(await testDb.charityFollow.count()).toBe(0);
  });

  it("disappears entirely when the person deletes their account", async () => {
    const editor = await makeUser({ role: "editor" });
    const charity = await makeCharity(editor.id);
    const person = await makeUser();

    await followCharity(person.id, charity.id);
    await testDb.user.delete({ where: { id: person.id } });

    expect(await testDb.charityFollow.count()).toBe(0);
  });
});

describe("donation notes", () => {
  beforeEach(resetDatabase);

  it("belong to one person and are invisible to everyone else", async () => {
    const editor = await makeUser({ role: "editor" });
    const charity = await makeCharity(editor.id);
    const alice = await makeUser();
    const bob = await makeUser();

    await addDonationNote({
      userId: alice.id,
      charityId: charity.id,
      amount: "25.50",
      donatedOn: new Date("2026-09-01"),
      note: "In memory of someone.",
    });

    const hers = await donationNotesFor(alice.id);

    expect(hers).toHaveLength(1);
    expect(hers[0].amount).toBe("25.50");
    expect(hers[0].note).toBe("In memory of someone.");
    expect(await donationNotesFor(bob.id)).toHaveLength(0);
  });

  it("cannot be deleted by anyone but their owner", async () => {
    const editor = await makeUser({ role: "editor" });
    const charity = await makeCharity(editor.id);
    const alice = await makeUser();
    const bob = await makeUser();

    await addDonationNote({
      userId: alice.id,
      charityId: charity.id,
      donatedOn: new Date("2026-09-01"),
    });
    const [note] = await donationNotesFor(alice.id);

    await deleteDonationNote(bob.id, note.id);
    expect(await donationNotesFor(alice.id)).toHaveLength(1);

    await deleteDonationNote(alice.id, note.id);
    expect(await donationNotesFor(alice.id)).toHaveLength(0);
  });

  it("refuses an amount that is not money", async () => {
    const editor = await makeUser({ role: "editor" });
    const charity = await makeCharity(editor.id);
    const person = await makeUser();

    const result = await addDonationNote({
      userId: person.id,
      charityId: charity.id,
      amount: "twenty five quid",
      donatedOn: new Date("2026-09-01"),
    });

    expect(result.ok).toBe(false);
    expect(await donationNotesFor(person.id)).toHaveLength(0);
  });

  it("accepts a note with no amount, because saying what you gave is optional", async () => {
    const editor = await makeUser({ role: "editor" });
    const charity = await makeCharity(editor.id);
    const person = await makeUser();

    const result = await addDonationNote({
      userId: person.id,
      charityId: charity.id,
      amount: "",
      donatedOn: new Date("2026-09-01"),
    });

    expect(result.ok).toBe(true);
    expect((await donationNotesFor(person.id))[0].amount).toBeNull();
  });
});
