// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  appleStamp,
  createAppleHealthReader,
  dayIn,
  hourIn,
  mergedLength,
  nightOf,
  parseCsv,
  planSleepImport,
  planWaterImport,
} from "@/lib/trackers/wearable-import";

/**
 * Reading exported files from phones and watches. Everything here is pure, so it is tested
 * directly; the screen that feeds it lines is covered in `trackers.test.tsx`.
 *
 * The fixtures are made up, and shaped like the real exports: Apple Health's `export.xml` and
 * Fitbit's sleep CSV.
 */

const sleepRecord = (start: string, end: string, value = "HKCategoryValueSleepAnalysisAsleepCore") =>
  ` <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Test Watch" startDate="${start}" endDate="${end}" value="${value}"/>`;

const waterRecord = (start: string, value: string, unit = "mL") =>
  ` <Record type="HKQuantityTypeIdentifierDietaryWater" sourceName="Test Phone" unit="${unit}" startDate="${start}" endDate="${start}" value="${value}"/>`;

describe("dates", () => {
  it("reads ISO dates and UK slashed dates, and refuses impossible ones", () => {
    expect(dayIn("2026-09-26")).toBe("2026-09-26");
    expect(dayIn("03/04/2026")).toBe("2026-04-03");
    expect(dayIn("09/26/2026")).toBe("2026-09-26");
    expect(dayIn("2026-02-30")).toBeNull();
    expect(dayIn("yesterday")).toBeNull();
  });

  it("reads the hour in 24-hour and 12-hour clocks, ignoring the date", () => {
    expect(hourIn("2026-09-25 23:10")).toBe(23);
    expect(hourIn("2026-09-25 11:10PM")).toBe(23);
    expect(hourIn("2026-09-25 12:05 am")).toBe(0);
    expect(hourIn("2026-09-25")).toBeNull();
  });

  it("puts sleep that began after midnight on the previous evening's night", () => {
    expect(nightOf("2026-09-26", 1)).toBe("2026-09-25");
    expect(nightOf("2026-09-25", 23)).toBe("2026-09-25");
    expect(nightOf("2026-03-01", 2)).toBe("2026-02-28");
  });

  it("reads an Apple timestamp in the zone it was written in", () => {
    const stamp = appleStamp("2026-09-25 23:10:00 +0100");
    expect(stamp).toMatchObject({ day: "2026-09-25", hour: 23 });
    expect(stamp?.ms).toBe(Date.UTC(2026, 8, 25, 22, 10));
  });
});

describe("Apple Health export", () => {
  it("adds up the asleep stages of a night and ignores time in bed and awake", () => {
    const reader = createAppleHealthReader();
    reader.line(sleepRecord("2026-09-25 22:30:00 +0100", "2026-09-26 06:30:00 +0100", "HKCategoryValueSleepAnalysisInBed"));
    reader.line(sleepRecord("2026-09-25 23:00:00 +0100", "2026-09-26 02:00:00 +0100"));
    reader.line(sleepRecord("2026-09-26 02:00:00 +0100", "2026-09-26 02:30:00 +0100", "HKCategoryValueSleepAnalysisAwake"));
    reader.line(sleepRecord("2026-09-26 02:30:00 +0100", "2026-09-26 06:00:00 +0100", "HKCategoryValueSleepAnalysisAsleepDeep"));

    const { sleep, skipped } = reader.result();
    expect(sleep).toEqual([
      { night: "2026-09-25", minutesAsleep: 390, origin: "imported", importedFrom: "Apple Health" },
    ]);
    expect(skipped).toBe(0);
  });

  it("does not count a night twice when a phone and a watch both recorded it", () => {
    const reader = createAppleHealthReader();
    reader.line(sleepRecord("2026-09-25 23:00:00 +0100", "2026-09-26 05:00:00 +0100"));
    reader.line(sleepRecord("2026-09-25 23:30:00 +0100", "2026-09-26 06:00:00 +0100"));
    expect(reader.result().sleep[0].minutesAsleep).toBe(7 * 60);
  });

  it("totals water by day across units", () => {
    const reader = createAppleHealthReader();
    reader.line(waterRecord("2026-09-25 09:00:00 +0100", "250"));
    reader.line(waterRecord("2026-09-25 13:00:00 +0100", "0.5", "L"));
    reader.line(waterRecord("2026-09-26 09:00:00 +0100", "300"));
    expect(reader.result().water.map((entry) => [entry.day, entry.amountMl])).toEqual([
      ["2026-09-25", 750],
      ["2026-09-26", 300],
    ]);
  });

  it("takes nothing but sleep and water, and counts what it could not read", () => {
    const reader = createAppleHealthReader();
    reader.line(
      ` <Record type="HKQuantityTypeIdentifierHeartRate" unit="count/min" startDate="2026-09-25 09:00:00 +0100" endDate="2026-09-25 09:00:00 +0100" value="72"/>`,
    );
    reader.line(waterRecord("not a date", "250"));
    reader.line(waterRecord("2026-09-25 09:00:00 +0100", "2", "gallons"));
    const result = reader.result();
    expect(result.sleep).toEqual([]);
    expect(result.water).toEqual([]);
    expect(result.skipped).toBe(2);
  });
});

describe("spreadsheets", () => {
  it("reads a Fitbit sleep export as it comes", () => {
    const csv = [
      "Start Time,End Time,Minutes Asleep,Minutes Awake,Number of Awakenings,Time in Bed",
      '"2026-09-25 11:10PM","2026-09-26 6:40AM","412","38","4","450"',
      '"2026-09-26 1:05AM","2026-09-26 7:00AM","330","25","2","355"',
      '"2026-09-26 3:00PM","2026-09-26 3:40PM","40","0","0","40"',
    ].join("\n");
    const result = parseCsv(csv, "a spreadsheet");
    expect("problem" in result).toBe(false);
    if ("problem" in result) return;
    // The 1:05am start is the night of the 25th, so it joins the first row.
    expect(result.sleep.map((entry) => [entry.night, entry.minutesAsleep])).toEqual([
      ["2026-09-25", 742],
      ["2026-09-26", 40],
    ]);
  });

  it("reads a home-made sheet of hours and water", () => {
    const csv = "Date,Hours asleep,Water ml\n25/09/2026,7.5,1500\n26/09/2026,,800\nnonsense,1,1";
    const result = parseCsv(csv, "a spreadsheet");
    if ("problem" in result) throw new Error(result.problem);
    expect(result.sleep).toEqual([
      { night: "2026-09-25", minutesAsleep: 450, origin: "imported", importedFrom: "a spreadsheet" },
    ]);
    expect(result.water.map((entry) => [entry.day, entry.amountMl])).toEqual([
      ["2026-09-25", 1500],
      ["2026-09-26", 800],
    ]);
    expect(result.skipped).toBe(1);
  });

  it("says plainly when it cannot find what it needs", () => {
    expect(parseCsv("Date,Steps\n2026-09-25,4000", "x")).toHaveProperty("problem");
    expect(parseCsv("Minutes asleep\n400", "x")).toHaveProperty("problem");
    expect(parseCsv("", "x")).toHaveProperty("problem");
  });
});

describe("merging an import", () => {
  it("never overwrites a night or day already written down, so importing twice adds nothing", () => {
    const incoming = [
      { night: "2026-09-24", minutesAsleep: 400, origin: "imported" as const },
      { night: "2026-09-25", minutesAsleep: 420, origin: "imported" as const },
    ];
    const plan = planSleepImport([{ night: "2026-09-25" }], incoming);
    expect(plan.add.map((entry) => entry.night)).toEqual(["2026-09-24"]);
    expect(plan.alreadyHeld).toBe(1);

    const again = planSleepImport([{ night: "2026-09-24" }, { night: "2026-09-25" }], incoming);
    expect(again.add).toEqual([]);
  });

  it("leaves a day of water alone if drinks were already tapped in", () => {
    const plan = planWaterImport([{ day: "2026-09-25" }], [
      { day: "2026-09-25", amountMl: 1500, origin: "imported" },
    ]);
    expect(plan.add).toEqual([]);
  });

  it("counts overlapping stretches of time once", () => {
    expect(mergedLength([[0, 10], [5, 15], [20, 25]])).toBe(20);
    expect(mergedLength([])).toBe(0);
  });
});
