import { describe, expect, it } from "vitest";

import { charityInput } from "@/lib/charities/admin";
import { CONDITION_SYSTEMS } from "@/lib/conditions/body-systems";

import { CONDITION_CHARITIES } from "../../scripts/condition-charities";

describe("real charities for conditions", () => {
  it("gives every known condition at least one charity", () => {
    const covered = new Set(CONDITION_CHARITIES.flatMap((charity) => charity.conditions));
    // Conditions outside the body-system table, which exist in the database too.
    const known = [...Object.keys(CONDITION_SYSTEMS), "bereavement-by-suicide"];
    expect(known.filter((slug) => !covered.has(slug))).toEqual([]);
  });

  it("carries no verification — an editor must check each one against the register", () => {
    for (const charity of CONDITION_CHARITIES) {
      expect(charity).not.toHaveProperty("verifiedAt");
      expect(charity).not.toHaveProperty("verifiedById");
    }
  });

  it("passes the same validation an editor's form does", () => {
    for (const charity of CONDITION_CHARITIES) {
      const result = charityInput.safeParse(charity);
      expect(result.success, `${charity.slug}: ${result.error?.message}`).toBe(true);
    }
  });

  it("has no duplicate slugs or register numbers", () => {
    const slugs = CONDITION_CHARITIES.map((charity) => charity.slug);
    const numbers = CONDITION_CHARITIES.map((c) => `${c.regulator}:${c.registeredNumber}`);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it("links only over https, and never to a .test address", () => {
    for (const charity of CONDITION_CHARITIES) {
      for (const url of [charity.websiteUrl, charity.donationUrl]) {
        expect(url).toMatch(/^https:\/\//);
        expect(new URL(url).hostname.endsWith(".test")).toBe(false);
      }
    }
  });
});
