// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { seedCore } from "../../prisma/seed/core";
import { symptomsForUser } from "@/lib/onboarding/symptoms";

import { makeUser, resetDatabase, testDb } from "../helpers/db";

/**
 * "Menopause and perimenopause" is added by editors, not by the core seed, so the seed links
 * its symptoms by slug and skips them when the condition is missing. Until they were linked,
 * anyone choosing it was offered every symptom on the platform, seizures and all.
 */

const EXPECTED = [
  "Hot flushes",
  "Night sweats",
  "Trouble sleeping",
  "Brain fog",
  "Changes to periods",
  "Racing or pounding heart",
  "Joint or muscle aches",
  "Vaginal dryness or discomfort",
  "Lower sex drive",
];

beforeAll(async () => {
  await resetDatabase();
  await testDb.condition.create({
    data: {
      name: "Menopause and perimenopause",
      slug: "menopause",
      summary: "A fictional summary for the test.",
    },
  });
  await seedCore(testDb);
}, 60_000);

afterAll(async () => {
  await testDb.$disconnect();
});

describe("menopause symptoms", () => {
  it("are offered to someone who chose menopause, and nothing unrelated is", async () => {
    const user = await makeUser();
    const condition = await testDb.condition.findUniqueOrThrow({ where: { slug: "menopause" } });
    await testDb.userCondition.create({ data: { userId: user.id, conditionId: condition.id } });

    const names = (await symptomsForUser(user.id)).map((symptom) => symptom.name);

    for (const name of EXPECTED) expect(names).toContain(name);
    expect(names).not.toContain("Seizures");
    expect(names).not.toContain("Thirst");
  });
});
