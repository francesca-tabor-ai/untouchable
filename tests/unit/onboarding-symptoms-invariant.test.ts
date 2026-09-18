// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { symptomsForUser } from "@/lib/onboarding/symptoms";
import { makeUser, resetDatabase, testDb } from "../helpers/db";

/**
 * Onboarding must never present a step that demands a choice and offers none.
 *
 * This shipped: six conditions were added through content work with no symptoms linked to
 * them, and anyone choosing one reached the symptoms step with an empty list, a validation
 * rule insisting on at least one, and no way forward — locked out of every tracking feature
 * in the product. An end-to-end test caught it; nothing in the unit suite would have.
 *
 * The invariant is not "the seed links symptoms to everything", because editors add
 * conditions through the admin and cannot be asked to link symptoms in the same breath. It
 * is that the step always has something to offer.
 */
describe("the symptoms step always offers something", () => {
  beforeEach(resetDatabase);
  afterAll(async () => {
    await testDb.$disconnect();
  });

  async function conditionWithNoSymptoms() {
    return testDb.condition.create({
      data: {
        name: "A condition an editor just added",
        slug: `unlinked-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        summary: "Added through the admin, with no symptoms linked to it yet.",
      },
    });
  }

  it("falls back to the full list when the chosen condition has no symptoms of its own", async () => {
    const user = await makeUser();
    const condition = await conditionWithNoSymptoms();
    await testDb.symptom.create({ data: { name: "Fatigue", slug: `fatigue-${Date.now()}` } });
    await testDb.userCondition.create({ data: { userId: user.id, conditionId: condition.id } });

    const offered = await symptomsForUser(user.id);

    expect(offered.length).toBeGreaterThan(0);
  });

  it("still prefers the symptoms actually linked to their condition", async () => {
    const user = await makeUser();
    const condition = await conditionWithNoSymptoms();
    const linked = await testDb.symptom.create({
      data: {
        name: "Ringing in the ears",
        slug: `ringing-${Date.now()}`,
        conditions: { create: { conditionId: condition.id } },
      },
    });
    await testDb.symptom.create({ data: { name: "Something else", slug: `other-${Date.now()}` } });
    await testDb.userCondition.create({ data: { userId: user.id, conditionId: condition.id } });

    const offered = await symptomsForUser(user.id);

    expect(offered.map((s) => s.id)).toEqual([linked.id]);
  });

  it("offers nothing to someone who has chosen no conditions at all", async () => {
    const user = await makeUser();
    await testDb.symptom.create({ data: { name: "Fatigue", slug: `fatigue-${Date.now()}` } });

    // Not a dead end: the conditions step comes first and is what they need to finish.
    expect(await symptomsForUser(user.id)).toEqual([]);
  });
});
