import { describe, expect, it } from "vitest";

import {
  analyseExperiment,
  checkInsCsv,
  experimentsCsv,
  gpSummaryMarkdown,
  labJson,
  toCsv,
} from "@/lib/lab";

import { checkIn, doneEvery, experiment, run } from "./lab-fixtures";

const mag = experiment({
  id: "mag",
  status: "complete",
  conclusion: "keep",
  hypothesis: "PRIVATE HYPOTHESIS",
  conclusionNote: "PRIVATE CONCLUSION",
});
const nights = run([50, 60, 45, 55, 65, 50, 55], Array(14).fill(40));
nights[3].note = "PRIVATE NOTE, with a comma";
nights[4].newSymptoms = ["pulsing_tinnitus"];
const adherence = doneEvery("mag", "2026-09-08", 14);

describe("the person's own files", () => {
  it("gives their notes back to them in the CSV and JSON", () => {
    expect(checkInsCsv(nights, adherence, [mag])).toContain('"PRIVATE NOTE, with a comma"');
    expect(experimentsCsv([mag])).toContain("PRIVATE HYPOTHESIS");
    const json = JSON.parse(labJson({ checkIns: nights, experiments: [mag], adherence, exportedAt: new Date() }));
    expect(json.version).toBe(1);
    expect(json.checkIns[3].note).toBe("PRIVATE NOTE, with a comma");
    expect(json.checkIns[0].date).toBe("2026-09-01");
  });

  it("writes did-I-do-it and its time on each day", () => {
    expect(checkInsCsv(nights, adherence, [mag])).toContain("Magnesium in the evening: yes at 21:30");
  });

  it("defuses anything a spreadsheet would run as a formula", () => {
    expect(toCsv([["=HYPERLINK(\"x\")", "-2", 3]])).toBe("\"'=HYPERLINK(\"\"x\"\")\",'-2,3\r\n");
  });
});

describe("the GP summary", () => {
  const summary = gpSummaryMarkdown({
    checkIns: nights,
    experiments: [mag],
    results: new Map([["mag", analyseExperiment({ experiment: mag, checkIns: nights, adherence })]]),
    today: new Date("2026-09-25T00:00:00Z"),
  });

  it("leaves out notes, hypotheses and conclusion notes", () => {
    expect(summary).not.toMatch(/PRIVATE/);
  });

  it("states what was tried and what was recorded", () => {
    expect(summary).toMatch(/21 daily check-ins/);
    expect(summary).toMatch(/\*\*Magnesium in the evening\*\*/);
    expect(summary).toMatch(/Done on 100% of days/);
    expect(summary).toMatch(/Patient's own conclusion: keeping it/);
    expect(summary).toMatch(/Minutes to fall asleep: 54\.3 min before \(n=7\), 40 min during \(n=14\)/);
  });

  it("lists any red-flag answers with their dates", () => {
    expect(summary).toMatch(/Tinnitus beats in time with your heart/);
  });

  it("says what kind of evidence it is", () => {
    expect(summary).toMatch(/not medical evidence/);
  });

  it("handles nobody having checked in yet", () => {
    expect(
      gpSummaryMarkdown({ checkIns: [], experiments: [], results: new Map(), today: new Date() }),
    ).toMatch(/No check-ins/);
  });
});

it("fixtures are fictional", () => {
  expect(checkIn("2026-09-01", {}).id).toMatch(/^c\d+$/);
});
