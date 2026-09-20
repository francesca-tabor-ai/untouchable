import { describe, expect, it } from "vitest";

import { findContradictions } from "@/lib/timeline/contradictions";

import { day, event, observation, symptom } from "./timeline-fixtures";

const scan = (input: Parameters<typeof findContradictions>[0]) => findContradictions(input);

describe("an entry dated before the symptom started", () => {
  const headaches = symptom({ id: "s1", firstOnset: day("2026-03-03") });
  const earlier = observation({ id: "o1", userSymptomId: "s1", occurredAt: day("2026-02-10") });

  it("is found", () => {
    const found = scan({ symptoms: [headaches], observations: [earlier], events: [] });
    expect(found).toHaveLength(1);
    expect(found[0].kind).toBe("observation_before_onset");
  });

  it("shows both versions, with both dates and both sources", () => {
    const [contradiction] = scan({ symptoms: [headaches], observations: [earlier], events: [] });

    expect(contradiction.sides).toHaveLength(2);
    expect(contradiction.sides[0].what).toMatch(/3 March 2026/);
    expect(contradiction.sides[1].what).toMatch(/10 February 2026/);
    expect(contradiction.sides.map((side) => side.source)).toEqual([
      "recollection",
      "contemporaneous_note",
    ]);
  });

  it("proposes, but never resolves", () => {
    const [contradiction] = scan({ symptoms: [headaches], observations: [earlier], events: [] });

    // A proposal is a suggestion on a screen with both versions still on it. Nothing in the
    // returned value has changed anybody's record.
    expect(contradiction.proposal?.keep).toBe(1);
    expect(contradiction.proposal?.because).toMatch(/noted at the time/);
    expect(earlier.supersededAt).toBeNull();
  });

  it("asks once, not once per entry", () => {
    const found = scan({
      symptoms: [headaches],
      observations: [
        earlier,
        observation({ userSymptomId: "s1", occurredAt: day("2026-02-14") }),
        observation({ userSymptomId: "s1", occurredAt: day("2026-02-20") }),
      ],
      events: [],
    });

    expect(found).toHaveLength(1);
    expect(found[0].sides[1].what).toMatch(/10 February/);
  });
});

describe("an entry dated after the symptom stopped", () => {
  it("is found", () => {
    const found = scan({
      symptoms: [
        symptom({ id: "s1", status: "resolved", resolvedDate: day("2026-05-01") }),
      ],
      observations: [observation({ userSymptomId: "s1", occurredAt: day("2026-06-02") })],
      events: [],
    });

    expect(found[0].kind).toBe("observation_after_resolved");
  });
});

describe("a symptom that stopped before it started", () => {
  it("is raised with no proposal, because nothing decides it", () => {
    const found = scan({
      symptoms: [
        symptom({
          id: "s1",
          firstOnset: day("2026-05-01"),
          status: "resolved",
          resolvedDate: day("2026-03-01"),
        }),
      ],
      observations: [],
      events: [],
    });

    const clash = found.find((row) => row.kind === "resolved_before_onset");
    expect(clash?.summary).toMatch(/before it started/);
    expect(clash?.proposal).toBeNull();
  });
});

describe("two entries for the same day", () => {
  const twice = (a: number, b: number) =>
    scan({
      symptoms: [symptom({ id: "s1", firstOnset: day("2026-01-01") })],
      observations: [
        observation({ userSymptomId: "s1", occurredAt: day("2026-06-01"), severity: a }),
        observation({
          userSymptomId: "s1",
          occurredAt: day("2026-06-01"),
          severity: b,
          source: "recollection",
        }),
      ],
      events: [],
    });

  it("is left alone when the two are close", () => {
    // A symptom varies within a day. Two and four is a day, not a contradiction.
    expect(twice(2, 4)).toHaveLength(0);
  });

  it("is raised when they are far apart", () => {
    const [found] = twice(2, 9);
    expect(found.kind).toBe("same_day_severity_clash");
    expect(found.summary).toMatch(/at 2 and at 9 out of 10/);
  });
});

describe("medication timing", () => {
  it("notices the same medicine changed on two dates", () => {
    const found = scan({
      symptoms: [],
      observations: [],
      events: [
        event({
          id: "e1",
          type: "medication_change",
          description: "Started amlodipine",
          occurredAt: day("2026-04-02"),
          source: "document",
        }),
        event({
          id: "e2",
          type: "medication_change",
          description: "Started on amlodipine I think",
          occurredAt: day("2026-04-20"),
          source: "recollection",
        }),
      ],
    });

    expect(found[0].kind).toBe("medication_timing");
    expect(found[0].proposal?.keep).toBe(0);
  });

  it("does not match on the ordinary words every entry shares", () => {
    const found = scan({
      symptoms: [],
      observations: [],
      events: [
        event({ type: "medication_change", description: "Started tablets", occurredAt: day("2026-04-02") }),
        event({ type: "medication_change", description: "Stopped tablets", occurredAt: day("2026-04-20") }),
      ],
    });

    expect(found).toHaveLength(0);
  });
});

describe("what the scan ignores", () => {
  it("leaves superseded records out", () => {
    const found = scan({
      symptoms: [symptom({ id: "s1", firstOnset: day("2026-03-03") })],
      observations: [
        observation({
          userSymptomId: "s1",
          occurredAt: day("2026-02-10"),
          supersededAt: day("2026-06-01"),
        }),
      ],
      events: [],
    });

    expect(found).toHaveLength(0);
  });

  it("says nothing about a symptom with no onset date recorded", () => {
    const found = scan({
      symptoms: [symptom({ id: "s1", firstOnset: null })],
      observations: [observation({ userSymptomId: "s1", occurredAt: day("2026-02-10") })],
      events: [],
    });

    expect(found).toHaveLength(0);
  });
});

describe("ordering", () => {
  it("puts the one that would change a conversation most at the top", () => {
    const found = scan({
      symptoms: [symptom({ id: "s1", firstOnset: day("2026-03-03") })],
      observations: [
        observation({ userSymptomId: "s1", occurredAt: day("2026-02-10") }),
        observation({ userSymptomId: "s1", occurredAt: day("2026-06-01"), severity: 1 }),
        observation({
          userSymptomId: "s1",
          occurredAt: day("2026-06-01"),
          severity: 9,
          source: "recollection",
        }),
      ],
      events: [],
    });

    expect(found.map((row) => row.kind)).toEqual([
      "observation_before_onset",
      "same_day_severity_clash",
    ]);
  });
});
