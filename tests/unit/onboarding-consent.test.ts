// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { ConsentPurpose } from "@/generated/prisma";
import { consentedUserIds, currentConsents } from "@/lib/consent";
import {
  CONSENT_COPY,
  CONSENT_LEGAL_REVIEW_NOTE,
  CONSENT_PURPOSES,
  CONSENT_TEXT_VERSION,
  OPTIONAL_CONSENT_PURPOSES,
  STOP_TRACKING_CONSEQUENCES,
} from "@/lib/consent/text";
import {
  canTrack,
  consentDecisions,
  hasAnsweredCoreTracking,
  recordConsentDecisions,
  recordSingleConsent,
} from "@/lib/profile/consent";

import { makeUser, resetDatabase, testDb } from "../helpers/db";

/** Everything unticked except core tracking — what the onboarding screen posts by default. */
const ONLY_CORE_TRACKING = {
  [ConsentPurpose.core_tracking]: true,
  [ConsentPurpose.research_anonymised]: false,
  [ConsentPurpose.commercial_research]: false,
  [ConsentPurpose.contact_for_studies]: false,
  [ConsentPurpose.marketing_email]: false,
};

describe("the consent wording", () => {
  it("is versioned with a date", () => {
    expect(CONSENT_TEXT_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("covers every purpose the database knows about", () => {
    expect(new Set(CONSENT_PURPOSES)).toEqual(new Set(Object.values(ConsentPurpose)));
    expect(CONSENT_COPY).toHaveLength(Object.values(ConsentPurpose).length);
  });

  it("makes exactly one of them required, and it is core tracking", () => {
    const required = CONSENT_COPY.filter((copy) => copy.required);
    expect(required.map((copy) => copy.purpose)).toEqual([ConsentPurpose.core_tracking]);
    expect(OPTIONAL_CONSENT_PURPOSES).toHaveLength(4);
  });

  it("tells people what we collect, who sees it and what it is for, for every purpose", () => {
    for (const copy of CONSENT_COPY) {
      // Whole sentences, every one of them answered. "Nothing extra." is a short answer but
      // it is an honest one, so only the explanations are held to a length.
      for (const part of [copy.label, copy.whatWeCollect, copy.whoSeesIt, copy.whatItIsFor, copy.ifYouSayNo]) {
        expect(part.trim()).not.toBe("");
        expect(part.trim().endsWith(".")).toBe(true);
      }
      for (const part of [copy.label, copy.whoSeesIt, copy.whatItIsFor, copy.ifYouSayNo]) {
        expect(part.length).toBeGreaterThan(20);
      }
    }
  });

  it("says out loud that the wording still needs legal review", () => {
    // Brief section 12. A person agreeing to hand over special category data deserves to
    // know the words have not been checked by a lawyer yet.
    expect(CONSENT_LEGAL_REVIEW_NOTE).toMatch(/lawyer|legal/i);
  });

  it("says plainly what stops working if tracking is turned off", () => {
    const text = STOP_TRACKING_CONSEQUENCES.join(" ");
    expect(text).toMatch(/stops working/i);
    expect(text).toMatch(/delete your account/i);
  });
});

describe("recording consent decisions", () => {
  beforeEach(resetDatabase);
  afterAll(async () => {
    await testDb.$disconnect();
  });

  it("holds nothing at all until somebody is asked", async () => {
    const user = await makeUser();

    const state = await currentConsents(user.id);
    expect(Object.values(state).every((granted) => granted === false)).toBe(true);
    expect(await hasAnsweredCoreTracking(user.id)).toBe(false);
  });

  it("writes one record per decision, each with the wording version and a timestamp", async () => {
    const user = await makeUser();

    await recordConsentDecisions(user.id, ONLY_CORE_TRACKING);

    const rows = await testDb.consentRecord.findMany({ where: { userId: user.id } });
    expect(rows).toHaveLength(5);
    for (const row of rows) {
      expect(row.consentTextVersion).toBe(CONSENT_TEXT_VERSION);
      expect(row.createdAt).toBeInstanceOf(Date);
    }
  });

  it("leaves every optional purpose off unless it was actively ticked", async () => {
    const user = await makeUser();
    await recordConsentDecisions(user.id, ONLY_CORE_TRACKING);

    const state = await currentConsents(user.id);
    expect(state[ConsentPurpose.core_tracking]).toBe(true);
    for (const purpose of OPTIONAL_CONSENT_PURPOSES) {
      expect(state[purpose]).toBe(false);
    }
  });

  it("never updates a record in place — a change of mind is a new row", async () => {
    const user = await makeUser();
    await recordConsentDecisions(user.id, ONLY_CORE_TRACKING);
    await recordSingleConsent(user.id, ConsentPurpose.research_anonymised, true);
    await recordSingleConsent(user.id, ConsentPurpose.research_anonymised, false);

    const rows = await testDb.consentRecord.findMany({
      where: { userId: user.id, purpose: ConsentPurpose.research_anonymised },
      orderBy: { createdAt: "asc" },
    });
    expect(rows.map((row) => row.granted)).toEqual([false, true, false]);
  });

  it("does not fill the history with identical rows when nothing changed", async () => {
    const user = await makeUser();
    await recordConsentDecisions(user.id, ONLY_CORE_TRACKING);

    const written = await recordConsentDecisions(user.id, ONLY_CORE_TRACKING);

    expect(written).toEqual([]);
    expect(await testDb.consentRecord.count({ where: { userId: user.id } })).toBe(5);
  });

  it("asks again when the wording changes, and records which wording was answered", async () => {
    const user = await makeUser();
    await recordConsentDecisions(user.id, ONLY_CORE_TRACKING, "2026-01-01");

    const before = await consentDecisions(user.id);
    expect(before.every((decision) => decision.underOldWording)).toBe(true);

    const written = await recordConsentDecisions(user.id, ONLY_CORE_TRACKING);
    expect(written).toHaveLength(5);

    const after = await consentDecisions(user.id);
    expect(after.every((decision) => decision.textVersion === CONSENT_TEXT_VERSION)).toBe(true);
    expect(after.every((decision) => !decision.underOldWording)).toBe(true);
  });

  it("shows when each decision was made", async () => {
    const user = await makeUser();
    await recordConsentDecisions(user.id, ONLY_CORE_TRACKING);

    const decisions = await consentDecisions(user.id);
    expect(decisions).toHaveLength(5);
    for (const decision of decisions) {
      expect(decision.decidedAt).toBeInstanceOf(Date);
      expect(decision.textVersion).toBe(CONSENT_TEXT_VERSION);
    }
  });

  it("keeps one purpose from carrying another with it", async () => {
    const user = await makeUser();
    await recordConsentDecisions(user.id, ONLY_CORE_TRACKING);
    await recordSingleConsent(user.id, ConsentPurpose.research_anonymised, true);

    const state = await currentConsents(user.id);
    expect(state[ConsentPurpose.research_anonymised]).toBe(true);

    // Agreeing to anonymised research is not agreeing to company-funded studies, and it is
    // certainly not agreeing to marketing email.
    expect(state[ConsentPurpose.commercial_research]).toBe(false);
    expect(state[ConsentPurpose.contact_for_studies]).toBe(false);
    expect(state[ConsentPurpose.marketing_email]).toBe(false);
  });
});

describe("withdrawing consent takes effect immediately", () => {
  beforeEach(resetDatabase);

  it("drops someone out of the research cohort on the very next query", async () => {
    const stays = await makeUser();
    const withdraws = await makeUser();

    for (const user of [stays, withdraws]) {
      await recordConsentDecisions(user.id, {
        ...ONLY_CORE_TRACKING,
        [ConsentPurpose.research_anonymised]: true,
      });
    }
    expect((await consentedUserIds(ConsentPurpose.research_anonymised)).sort()).toEqual(
      [stays.id, withdraws.id].sort(),
    );

    await recordSingleConsent(withdraws.id, ConsentPurpose.research_anonymised, false);

    // No batch job, no cache to expire. The next read already excludes them.
    expect(await consentedUserIds(ConsentPurpose.research_anonymised)).toEqual([stays.id]);
  });

  it("closes the tracking features the moment core tracking is withdrawn", async () => {
    const user = await makeUser();
    await recordConsentDecisions(user.id, ONLY_CORE_TRACKING);
    expect(await canTrack(user.id)).toBe(true);

    await recordSingleConsent(user.id, ConsentPurpose.core_tracking, false);

    expect(await canTrack(user.id)).toBe(false);
    // The decision is recorded, so we know they were asked and answered.
    expect(await hasAnsweredCoreTracking(user.id)).toBe(true);
  });

  it("does not quietly take anything else with it", async () => {
    const user = await makeUser();
    await recordConsentDecisions(user.id, {
      ...ONLY_CORE_TRACKING,
      [ConsentPurpose.marketing_email]: true,
    });

    await recordSingleConsent(user.id, ConsentPurpose.marketing_email, false);

    const state = await currentConsents(user.id);
    expect(state[ConsentPurpose.marketing_email]).toBe(false);
    expect(state[ConsentPurpose.core_tracking]).toBe(true);
  });
});
