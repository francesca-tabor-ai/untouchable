// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { ConsentPurpose } from "@/generated/prisma";
import { consentedUserIds, currentConsents, recordConsent } from "@/lib/consent";
import { makeUser, resetDatabase, testDb } from "../helpers/db";

describe("consent", () => {
  beforeEach(resetDatabase);
  afterAll(async () => {
    await testDb.$disconnect();
  });

  it("treats everything as not consented until it is explicitly granted", async () => {
    const user = await makeUser();

    const state = await currentConsents(user.id);

    expect(state[ConsentPurpose.research_anonymised]).toBe(false);
    expect(state[ConsentPurpose.commercial_research]).toBe(false);
    expect(state[ConsentPurpose.marketing_email]).toBe(false);
  });

  it("takes the most recent decision for each purpose", async () => {
    const user = await makeUser();

    await recordConsent({
      userId: user.id,
      purpose: ConsentPurpose.research_anonymised,
      granted: true,
      consentTextVersion: "2026-09-01",
    });
    await recordConsent({
      userId: user.id,
      purpose: ConsentPurpose.research_anonymised,
      granted: false,
      consentTextVersion: "2026-09-01",
    });

    const state = await currentConsents(user.id);
    expect(state[ConsentPurpose.research_anonymised]).toBe(false);
  });

  it("keeps the history when someone changes their mind", async () => {
    const user = await makeUser();

    await recordConsent({
      userId: user.id,
      purpose: ConsentPurpose.research_anonymised,
      granted: true,
      consentTextVersion: "2026-09-01",
    });
    await recordConsent({
      userId: user.id,
      purpose: ConsentPurpose.research_anonymised,
      granted: false,
      consentTextVersion: "2026-09-01",
    });

    // We must always be able to show what someone agreed to, and when.
    const records = await testDb.consentRecord.count({ where: { userId: user.id } });
    expect(records).toBe(2);
  });

  it("removes a person from the research cohort the moment they withdraw", async () => {
    const stays = await makeUser();
    const withdraws = await makeUser();

    for (const user of [stays, withdraws]) {
      await recordConsent({
        userId: user.id,
        purpose: ConsentPurpose.research_anonymised,
        granted: true,
        consentTextVersion: "2026-09-01",
      });
    }

    expect(await consentedUserIds(ConsentPurpose.research_anonymised)).toHaveLength(2);

    await recordConsent({
      userId: withdraws.id,
      purpose: ConsentPurpose.research_anonymised,
      granted: false,
      consentTextVersion: "2026-09-01",
    });

    const cohort = await consentedUserIds(ConsentPurpose.research_anonymised);
    expect(cohort).toEqual([stays.id]);
  });

  it("keeps consent to one purpose from leaking into another", async () => {
    const user = await makeUser();

    await recordConsent({
      userId: user.id,
      purpose: ConsentPurpose.research_anonymised,
      granted: true,
      consentTextVersion: "2026-09-01",
    });

    // Agreeing to anonymised research is not agreeing to company-funded studies.
    expect(await consentedUserIds(ConsentPurpose.commercial_research)).toEqual([]);
  });

  it("excludes deleted accounts even where consent was never withdrawn", async () => {
    const user = await makeUser();
    await recordConsent({
      userId: user.id,
      purpose: ConsentPurpose.research_anonymised,
      granted: true,
      consentTextVersion: "2026-09-01",
    });

    await testDb.user.update({ where: { id: user.id }, data: { deletedAt: new Date() } });

    expect(await consentedUserIds(ConsentPurpose.research_anonymised)).toEqual([]);
  });
});
