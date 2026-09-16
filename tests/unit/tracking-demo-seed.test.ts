// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";

import { seedCore } from "../../prisma/seed/core";
import { seedDemoTracking } from "../../prisma/seed/demo-tracking";
import { ConsentPurpose } from "@/generated/prisma";
import { consentedUserIds } from "@/lib/consent";
import { applySuppression, minGroupSize, type RawGroup } from "@/lib/research/aggregate";

import { resetDatabase, testDb } from "../helpers/db";

/**
 * The demo tracking seed.
 *
 * This is the data the research milestone will build its view against, so what matters is
 * not that it exists but that it has the right *shape*: cohorts on both sides of the
 * small-group threshold after consent filtering, consent that varies, and symptom scores
 * with no story in them.
 *
 * The suppression assertions go through `applySuppression` from the real aggregate module
 * rather than comparing numbers by hand, so if the threshold moves this suite says so.
 */

let consented: Set<string>;

beforeAll(async () => {
  await resetDatabase();
  const { conditions } = await seedCore(testDb);
  await seedDemoTracking(testDb, {
    conditions,
    // The demo seed only uses `conditions` and `passwordHash`. The staff accounts are not
    // needed to generate patients, and creating them here would only couple two seeds.
    passwordHash: "not-a-real-hash",
    editorOne: null as never,
    editorTwo: null as never,
    admin: null as never,
  });

  consented = new Set(await consentedUserIds(ConsentPurpose.research_anonymised));
}, 120_000);

async function groupsByCondition(): Promise<RawGroup[]> {
  const links = await testDb.userCondition.findMany({
    include: { condition: { select: { slug: true, name: true } } },
  });

  const byCondition = new Map<string, { label: string; users: Set<string> }>();
  for (const link of links) {
    if (!consented.has(link.userId)) continue;
    const entry = byCondition.get(link.condition.slug) ?? {
      label: link.condition.name,
      users: new Set<string>(),
    };
    entry.users.add(link.userId);
    byCondition.set(link.condition.slug, entry);
  }

  return [...byCondition].map(([key, entry]) => ({
    key,
    label: entry.label,
    userCount: entry.users.size,
    values: { people: entry.users.size },
  }));
}

async function groupsByTreatment(): Promise<RawGroup[]> {
  const courses = await testDb.treatmentCourse.findMany({
    include: { intervention: { select: { name: true } } },
  });

  const byTreatment = new Map<string, Set<string>>();
  for (const course of courses) {
    if (!consented.has(course.userId)) continue;
    const users = byTreatment.get(course.intervention.name) ?? new Set<string>();
    users.add(course.userId);
    byTreatment.set(course.intervention.name, users);
  }

  return [...byTreatment].map(([name, users]) => ({
    key: name,
    label: name,
    userCount: users.size,
    values: { people: users.size },
  }));
}

describe("the demo cohorts straddle the suppression threshold", () => {
  it("has at least one condition over it and at least one under it", async () => {
    const { disclosed, suppressedCount } = applySuppression(await groupsByCondition());

    expect(disclosed.length).toBeGreaterThanOrEqual(3);
    expect(disclosed.some((group) => !group.suppressed)).toBe(true);
    expect(suppressedCount).toBeGreaterThanOrEqual(1);

    // Named, so the research view knows what to expect to see and not see.
    const shown = disclosed.filter((group) => !group.suppressed).map((group) => group.key);
    const hidden = disclosed.filter((group) => group.suppressed).map((group) => group.key);
    expect(shown).toContain("type-2-diabetes");
    expect(shown).toContain("depression");
    expect(hidden).toContain("breast-cancer");
  });

  it("has at least one treatment over it and several under it", async () => {
    const { disclosed, suppressedCount } = applySuppression(await groupsByTreatment());

    const shown = disclosed.filter((group) => !group.suppressed).map((group) => group.key);
    const hidden = disclosed.filter((group) => group.suppressed).map((group) => group.key);

    expect(shown).toContain("Metformin");
    expect(shown).toContain("Sertraline");
    expect(hidden).toContain("Letrozole");
    expect(suppressedCount).toBeGreaterThanOrEqual(3);
  });

  it("withholds the figures for a small group rather than dropping the group", async () => {
    const { disclosed } = applySuppression(await groupsByCondition());
    const small = disclosed.find((group) => group.suppressed);

    expect(small).toBeDefined();
    expect(small!.values).toBeNull();
    expect(small!.userCount).toBeNull();
    // Dropping it silently would let somebody infer it existed by elimination.
    expect(small!.label).toBeTruthy();
  });

  it("is sized against the threshold that is actually configured", () => {
    expect(minGroupSize()).toBe(10);
  });
});

describe("consent in the demo data is not uniform", () => {
  it("includes people who consented, people who refused and people who withdrew", async () => {
    const patients = await testDb.user.findMany({
      where: { email: { startsWith: "demo." } },
      select: { id: true },
    });
    expect(patients.length).toBeGreaterThanOrEqual(30);

    const granted = patients.filter((user) => consented.has(user.id));
    const notGranted = patients.filter((user) => !consented.has(user.id));
    expect(granted.length).toBeGreaterThan(0);
    expect(notGranted.length).toBeGreaterThan(0);

    // A withdrawal is a second row, not an edited one — which is how the real flow records it.
    const withdrawals = await testDb.consentRecord.groupBy({
      by: ["userId"],
      where: { purpose: ConsentPurpose.research_anonymised },
      _count: { _all: true },
      having: { userId: { _count: { gt: 1 } } },
    });
    expect(withdrawals.length).toBeGreaterThan(0);
  });

  it("gives everybody core tracking consent, because they all have tracking data", async () => {
    const tracking = new Set(await consentedUserIds(ConsentPurpose.core_tracking));
    const logged = await testDb.dailyLog.groupBy({ by: ["userId"] });

    for (const row of logged) expect(tracking.has(row.userId)).toBe(true);
  });
});

describe("the demo history is realistic enough to be worth looking at", () => {
  it("has months of daily logs, with gaps", async () => {
    const logs = await testDb.dailyLog.count();
    expect(logs).toBeGreaterThan(1000);

    const perPerson = await testDb.dailyLog.groupBy({ by: ["userId"], _count: { _all: true } });
    const counts = perPerson.map((row) => row._count._all);
    expect(Math.max(...counts)).toBeGreaterThan(80);
    // Somebody who barely logs, because the dashboard will have to render that too.
    expect(Math.min(...counts)).toBeLessThan(20);
  });

  it("has treatment courses that start and stop, with reasons", async () => {
    const stopped = await testDb.treatmentCourse.findMany({ where: { endDate: { not: null } } });
    expect(stopped.length).toBeGreaterThanOrEqual(5);
    expect(new Set(stopped.map((course) => course.stopReason)).size).toBeGreaterThanOrEqual(3);

    for (const course of stopped) {
      expect(course.endDate!.getTime()).toBeGreaterThan(course.startDate.getTime());
    }
  });

  it("covers treatments that are not medicines", async () => {
    const kinds = await testDb.intervention.groupBy({ by: ["type"] });
    const used = await testDb.treatmentCourse.findMany({ include: { intervention: true } });
    const usedKinds = new Set(used.map((course) => course.intervention.type));

    expect(kinds.length).toBeGreaterThanOrEqual(4);
    expect(usedKinds.has("non_drug")).toBe(true);
    expect(usedKinds.has("device")).toBe(true);
  });

  it("invents no standardised codes", async () => {
    const coded = await testDb.intervention.count({ where: { dmdCode: { not: null } } });
    expect(coded).toBe(0);
  });

  it("stamps every seeded side effect report as having been shown the Yellow Card scheme", async () => {
    const reports = await testDb.sideEffectReport.count();
    expect(reports).toBeGreaterThan(0);
    expect(await testDb.sideEffectReport.count({ where: { yellowCardShownAt: null } })).toBe(0);
  });

  it("includes free text, so the never-exported rule has something to bite on", async () => {
    expect(await testDb.dailyLog.count({ where: { note: { not: null } } })).toBeGreaterThan(0);
    expect(
      await testDb.treatmentCourse.count({ where: { stopReasonNote: { not: null } } }),
    ).toBeGreaterThan(0);
  });
});

describe("the symptom scores tell no story", () => {
  it("wanders up and down rather than trending", async () => {
    const perPerson = await testDb.dailyLog.groupBy({
      by: ["userId"],
      _count: { _all: true },
      having: { userId: { _count: { gt: 60 } } },
    });
    expect(perPerson.length).toBeGreaterThan(5);

    let checked = 0;
    for (const person of perPerson.slice(0, 8)) {
      const logs = await testDb.dailyLog.findMany({
        where: { userId: person.userId },
        orderBy: { date: "asc" },
      });

      const keys = Object.keys(logs[0].symptomScoresJson as Record<string, number>);
      for (const key of keys) {
        const series = logs.map((log) => (log.symptomScoresJson as Record<string, number>)[key]);

        let up = 0;
        let down = 0;
        for (let index = 1; index < series.length; index += 1) {
          if (series[index] > series[index - 1]) up += 1;
          if (series[index] < series[index - 1]) down += 1;
        }

        // Both directions, in every series. A generated "recovery" would be one-sided.
        expect(up, "a symptom series that only ever goes down").toBeGreaterThan(0);
        expect(down, "a symptom series that only ever goes up").toBeGreaterThan(0);
        checked += 1;
      }
    }

    expect(checked).toBeGreaterThan(10);
  });

  it("keeps every score inside the 0 to 10 scale", async () => {
    const logs = await testDb.dailyLog.findMany({ take: 400 });
    for (const log of logs) {
      for (const score of Object.values(log.symptomScoresJson as Record<string, number>)) {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(10);
      }
    }
  });
});

describe("nobody in the demo data is real", () => {
  it("puts every demo patient on the example domain", async () => {
    const patients = await testDb.user.findMany({
      where: { email: { startsWith: "demo." } },
      select: { email: true },
    });

    expect(patients.length).toBeGreaterThan(0);
    for (const patient of patients) {
      expect(patient.email).toMatch(/@untouchable\.example$/);
    }
  });
});
