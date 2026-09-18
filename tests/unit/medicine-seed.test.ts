// @vitest-environment node
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";

import { seedMedicines } from "../../prisma/seed/medicines";
import { doseLanguageProblems } from "@/lib/medicines/dose-language";
import { getPublicMedicine, listPublicMedicines } from "@/lib/medicines/queries";

import { resetDatabase, testDb } from "../helpers/db";

/**
 * The one real medicine we ship: nitrazepam, sold in the UK as Mogadon.
 *
 * It is the first entry that is not invented, so it is the first place the independence
 * rule can be broken. AGENTS.md rule 14: the NHS, the BNF, or the electronic Medicines
 * Compendium — never a company that sells treatment. A private clinic's page on this exact
 * drug was offered for this entry and rejected, so the test checks the file itself as well
 * as the row, because the row cannot tell you where the words came from.
 */

beforeAll(async () => {
  await resetDatabase();
  await seedMedicines(testDb);
}, 60_000);

const SEED_FILE = readFileSync(
  new URL("../../prisma/seed/medicines.ts", import.meta.url),
  "utf8",
);

describe("the seeded medicine", () => {
  it("is nitrazepam, with a page of its own", async () => {
    const medicine = await getPublicMedicine("nitrazepam");
    expect(medicine).not.toBeNull();
    expect(medicine?.name).toMatch(/nitrazepam/i);
    expect(medicine?.name).toMatch(/mogadon/i);
    expect(medicine?.type).toBe("rx");
  });

  it("is marked a sensitive topic, so it carries a content note and support contacts", async () => {
    expect((await getPublicMedicine("nitrazepam"))?.isSensitiveTopic).toBe(true);
  });

  it("says what it is, in plain English and at a useful length", async () => {
    const summary = (await getPublicMedicine("nitrazepam"))?.summary ?? "";
    expect(summary.length).toBeGreaterThan(200);
    expect(summary).toMatch(/benzodiazepine/i);
    expect(summary).toMatch(/dependen/i);
  });

  it("contains no dose, no strength and no regimen", async () => {
    const summary = (await getPublicMedicine("nitrazepam"))?.summary ?? "";
    expect(doseLanguageProblems(summary)).toEqual([]);
  });

  it("does not describe what taking it feels like", async () => {
    const summary = (await getPublicMedicine("nitrazepam"))?.summary ?? "";
    for (const advert of [
      /\bfeels? like\b/i,
      /\bcalm(s|ing)?\b/i,
      /\brelax(es|ing|ed)?\b/i,
      /\bhigh\b/i,
      /\beuphor/i,
      /\bknocks? you out\b/i,
    ]) {
      expect(summary).not.toMatch(advert);
    }
  });

  it("makes no claim that it helps or harms anyone", async () => {
    const summary = (await getPublicMedicine("nitrazepam"))?.summary ?? "";
    for (const claim of [/\bworks well\b/i, /\bsafe\b/i, /\bdangerous\b/i, /\brecommend/i]) {
      expect(summary).not.toMatch(claim);
    }
  });

  it("is on the public index once", async () => {
    const listed = await listPublicMedicines();
    expect(listed.filter((medicine) => medicine.slug === "nitrazepam")).toHaveLength(1);
  });

  it("can be re-run without duplicating itself", async () => {
    await seedMedicines(testDb);
    const rows = await testDb.intervention.findMany({ where: { slug: "nitrazepam" } });
    expect(rows).toHaveLength(1);
  });

  it("adopts a row somebody's own treatment log created first", async () => {
    await testDb.intervention.deleteMany({ where: { slug: "nitrazepam" } });
    const logged = await testDb.intervention.create({
      data: { name: "Nitrazepam (Mogadon)", type: "rx" },
      select: { id: true },
    });

    await seedMedicines(testDb);

    const rows = await testDb.intervention.findMany({ where: { name: "Nitrazepam (Mogadon)" } });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(logged.id);
    expect(rows[0]?.slug).toBe("nitrazepam");
  });
});

describe("where the words came from", () => {
  it("cites the NHS and the electronic Medicines Compendium", () => {
    expect(SEED_FILE).toMatch(/nhs\.uk/);
    expect(SEED_FILE).toMatch(/medicines\.org\.uk\/emc/);
  });

  it("records that the NHS has no page for this drug, so the reader can check", () => {
    // The NHS medicines A-Z has no nitrazepam entry. The seed says so rather than leaving a
    // future editor to wonder why the obvious source is not cited.
    expect(SEED_FILE).toMatch(/nhs\.uk\/medicines\/nitrazepam\/ returns a 404/);
  });

  it("names no private clinic, treatment provider or rehab — AGENTS.md rule 14", () => {
    const commercial = [
      /\bukat\b/i,
      /\brehab\b/i,
      /\bdetox (?:centre|center|clinic)\b/i,
      /\bprivate clinic'?s? (?:page|website) at\b/i,
      /\bpriory\b/i,
      /\btreatment centre\b/i,
    ];
    for (const pattern of commercial) {
      expect(SEED_FILE).not.toMatch(pattern);
    }
  });

  it("links to nothing but nhs.uk and medicines.org.uk", () => {
    const hosts = [...SEED_FILE.matchAll(/(?:https?:\/\/)?(?:www\.)?([a-z0-9.-]+\.[a-z]{2,})\//g)]
      .map((match) => match[1])
      .filter((host) => host.includes("."));
    for (const host of hosts) {
      expect(["nhs.uk", "www.nhs.uk", "medicines.org.uk", "www.medicines.org.uk"]).toContain(host);
    }
  });
});
