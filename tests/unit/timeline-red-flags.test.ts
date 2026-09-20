import { describe, expect, it } from "vitest";

import {
  activeFlag,
  evaluateUrgentFlags,
  flagRulesFor,
  HISTORICAL_AFTER_HOURS,
} from "@/lib/timeline/urgent-flags";

/**
 * The red flag engine is the one part of this feature where being wrong has a body count.
 * These tests are written as the cases that worried us, not as coverage of the branches.
 */

const NOW = new Date("2026-09-20T09:00:00Z");
const JUST_NOW = new Date("2026-09-20T08:30:00Z");

const check = (text: string, when = JUST_NOW, areas: Parameters<typeof evaluateUrgentFlags>[0]["areas"] = []) =>
  evaluateUrgentFlags({ text, occurredAt: when, areas, now: NOW });

describe("firing on the person's own words", () => {
  it.each([
    ["I blacked out", "collapse"],
    ["I went down in the kitchen", "collapse"],
    ["my legs gave way", "collapse"],
    ["I couldn't stand", "collapse"],
    ["she found me on the floor", "collapse"],
  ])("treats %s as a collapse", (text, key) => {
    expect(check(text).map((hit) => hit.rule.key)).toContain(key);
  });

  it("catches stroke wording without anybody typing the word stroke", () => {
    const hits = check("my arm went numb down one side and my speech was slurred");
    expect(hits[0].rule.key).toBe("stroke_signs");
    expect(hits[0].tier).toBe("emergency");
  });

  it("puts emergencies ahead of same-day flags", () => {
    const hits = check("I collapsed, and the worst headache I have ever had came on in seconds");
    expect(hits[0].tier).toBe("emergency");
    expect(hits.some((hit) => hit.tier === "same_day")).toBe(true);
  });
});

describe("reassurance never switches a flag off", () => {
  // The most serious entries arrive wrapped in an apology. None of this is evidence, and a
  // system that lets it suppress a flag is a system that fails exactly when it is needed.
  it.each([
    "I blacked out but it's fine now",
    "I blacked out, I don't want to make a fuss",
    "I blacked out, I'm probably overreacting",
    "I blacked out. Honestly it was nothing, I feel fine",
  ])("still flags: %s", (text) => {
    expect(check(text).map((hit) => hit.rule.key)).toContain("collapse");
  });
});

describe("negation does switch a flag off", () => {
  it.each([
    "I did not pass out",
    "I felt dizzy but I never fainted",
    "no chest pain, and I am not breathless",
  ])("does not flag: %s", (text) => {
    expect(check(text)).toHaveLength(0);
  });
});

describe("two-part rules need both parts", () => {
  it("does not flag chest pain on its own", () => {
    expect(check("some chest tightness after running").map((h) => h.rule.key)).not.toContain(
      "chest_pain_breathless",
    );
  });

  it("flags chest pain with breathlessness", () => {
    const hits = check("chest pain and I am short of breath");
    expect(hits[0].rule.key).toBe("chest_pain_breathless");
    expect(hits[0].tier).toBe("emergency");
  });
});

describe("something that has already happened", () => {
  const weeksAgo = new Date("2026-09-01T10:00:00Z");

  it("is still flagged, so it reaches the next handover", () => {
    expect(check("I collapsed at work", weeksAgo)).toHaveLength(1);
  });

  it("is not treated as happening now", () => {
    const hits = check("I collapsed at work", weeksAgo);
    expect(hits[0].historical).toBe(true);
    expect(activeFlag(hits)).toBeNull();
  });

  it("is live when it is inside the window", () => {
    const hits = check("I collapsed at work", JUST_NOW);
    expect(hits[0].historical).toBe(false);
    expect(activeFlag(hits)?.rule.key).toBe("collapse");
  });

  it("uses the window the module documents", () => {
    const edge = new Date(NOW.getTime() - (HISTORICAL_AFTER_HOURS - 1) * 3_600_000);
    expect(check("I collapsed", edge)[0].historical).toBe(false);
  });
});

describe("per-area overlays", () => {
  it("does not apply a bowel rule to somebody tracking an ear", () => {
    expect(check("black tarry stools", JUST_NOW, ["ear"])).toHaveLength(0);
  });

  it("applies it when that is the area being tracked", () => {
    const hits = check("black tarry stools", JUST_NOW, ["bowel"]);
    expect(hits[0].rule.key).toBe("black_stool");
  });

  it("never removes a general rule", () => {
    const general = flagRulesFor([]).map((rule) => rule.key);
    const withArea = flagRulesFor(["bowel", "ear", "headache"]).map((rule) => rule.key);
    for (const key of general) expect(withArea).toContain(key);
  });

  it("does not repeat a rule when two areas carry it", () => {
    const keys = flagRulesFor(["ear", "ear", "bowel"]).map((rule) => rule.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("wording that changes a care pathway", () => {
  it("carries the exact phrase and the reason for it", () => {
    const hits = check("the hearing in my left ear has gone");
    const rule = hits.find((hit) => hit.rule.key === "sudden_hearing_loss")?.rule;

    expect(rule?.sayExactly).toBe("sudden hearing loss in one ear");
    expect(rule?.whySaying).toMatch(/ringing/i);
  });
});

describe("what it does not do", () => {
  it("says nothing about ordinary wording", () => {
    expect(check("tired again today, headache in the afternoon")).toHaveLength(0);
  });

  it("never names a condition in what it says back", () => {
    for (const rule of flagRulesFor(["ear", "bowel", "headache"])) {
      expect(rule.noticed).toMatch(/^You have described/);
      expect(rule.noticed).not.toMatch(/stroke|meningitis|heart attack|cancer|clot/i);
    }
  });
});
