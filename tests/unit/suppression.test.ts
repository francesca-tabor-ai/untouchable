import { describe, expect, it, vi, afterEach } from "vitest";

import { applySuppression, minGroupSize, toCsv, type RawGroup } from "@/lib/research/aggregate";

const group = (key: string, userCount: number): RawGroup => ({
  key,
  label: key,
  userCount,
  values: { meanScore: 6.2 },
});

describe("small-group suppression", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("suppresses a group smaller than the threshold", () => {
    const { disclosed, suppressedCount } = applySuppression([group("depression", 9)]);

    expect(suppressedCount).toBe(1);
    expect(disclosed[0].suppressed).toBe(true);
    expect(disclosed[0].values).toBeNull();
    expect(disclosed[0].userCount).toBeNull();
  });

  it("discloses a group exactly at the threshold", () => {
    const { disclosed, suppressedCount } = applySuppression([group("depression", 10)]);

    expect(suppressedCount).toBe(0);
    expect(disclosed[0].suppressed).toBe(false);
    expect(disclosed[0].values).toEqual({ meanScore: 6.2 });
  });

  it("keeps the suppressed group in the results rather than dropping it", () => {
    // Dropping a group silently would let someone infer what was withheld by elimination.
    const { disclosed } = applySuppression([group("a", 40), group("b", 3), group("c", 20)]);

    expect(disclosed).toHaveLength(3);
    expect(disclosed.map((g) => g.key)).toEqual(["a", "b", "c"]);
  });

  it("never leaks the count of a suppressed group", () => {
    const { disclosed } = applySuppression([group("tiny", 1)]);

    expect(JSON.stringify(disclosed)).not.toContain("1");
  });

  it("falls back to 10 when the threshold is missing or nonsense", () => {
    vi.stubEnv("PRIVACY_MIN_GROUP_SIZE", "");
    expect(minGroupSize()).toBe(10);

    vi.stubEnv("PRIVACY_MIN_GROUP_SIZE", "not-a-number");
    expect(minGroupSize()).toBe(10);

    vi.stubEnv("PRIVACY_MIN_GROUP_SIZE", "0");
    expect(minGroupSize()).toBe(10);
  });

  it("honours a raised threshold", () => {
    vi.stubEnv("PRIVACY_MIN_GROUP_SIZE", "25");

    const { disclosed } = applySuppression([group("borderline", 24)]);
    expect(disclosed[0].suppressed).toBe(true);
  });
});

describe("csv export", () => {
  it("escapes values that would otherwise break the file", () => {
    const csv = toCsv([{ label: 'Smith, "Jo"', count: 12, note: null }]);

    expect(csv).toBe('label,count,note\n"Smith, ""Jo""",12,');
  });

  it("returns an empty string for no rows rather than a stray header", () => {
    expect(toCsv([])).toBe("");
  });
});
