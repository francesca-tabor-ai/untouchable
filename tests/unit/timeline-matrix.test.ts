import { describe, expect, it } from "vitest";

import { buildMatrix, candidateProblem, MATRIX_FRAMING, tallyLabel } from "@/lib/timeline/matrix";

import { candidate } from "./timeline-fixtures";

const symptoms = [
  { id: "s1", name: "Headaches" },
  { id: "s2", name: "Dizziness" },
];

describe("the framing that has to go with every render", () => {
  it("is returned with the grid, not left to the page to remember", () => {
    const matrix = buildMatrix({ symptoms, candidates: [], assessments: [] });
    expect(matrix.framing).toBe(MATRIX_FRAMING);
  });

  it("says all four things: not a probability, not a ranking, not a diagnosis, ask a clinician", () => {
    expect(MATRIX_FRAMING).toMatch(/not a probability/i);
    expect(MATRIX_FRAMING).toMatch(/not a ranking/i);
    expect(MATRIX_FRAMING).toMatch(/not a diagnosis/i);
    expect(MATRIX_FRAMING).toMatch(/clinician/i);
  });
});

describe("the tally", () => {
  it("says what it counts, on the same line as the number", () => {
    const label = tallyLabel({ supports: 3, partial: 1, against: 2, neutral: 0, not_yet_tested: 1 });

    expect(label).toMatch(/^3 /);
    expect(label).toMatch(/a count of fit, not a likelihood/);
  });

  it("never states a percentage or a probability", () => {
    const label = tallyLabel({ supports: 4, partial: 0, against: 0, neutral: 0, not_yet_tested: 0 });
    expect(label).not.toMatch(/%|percent|probab|likel(y|ihood) that|chance/i);
  });
});

describe("a candidate that cannot be used", () => {
  it("is called out when nothing would tell it apart", () => {
    expect(candidateProblem(candidate({ discriminatingFeatures: "  " }))).toMatch(/tell this apart/);
  });

  it("is called out when no test would settle it", () => {
    expect(candidateProblem(candidate({ testsThatWouldSettleIt: "" }))).toMatch(/settle it/);
  });

  it("is told to go when it has neither", () => {
    const problem = candidateProblem(
      candidate({ discriminatingFeatures: "", testsThatWouldSettleIt: "" }),
    );
    expect(problem).toMatch(/take it off the list/);
  });

  it("is clean when it has both", () => {
    expect(candidateProblem(candidate())).toBeNull();
  });

  it("still appears in the grid, with the problem attached", () => {
    const broken = candidate({ id: "c1", testsThatWouldSettleIt: "" });
    const matrix = buildMatrix({ symptoms, candidates: [broken], assessments: [] });

    expect(matrix.columns[0].problem).toMatch(/settle it/);
  });
});

describe("the untested cells", () => {
  it("default to not looked at yet rather than to neutral", () => {
    const matrix = buildMatrix({ symptoms, candidates: [candidate({ id: "c1" })], assessments: [] });

    expect(matrix.rows[0].cells[0].fit).toBe("not_yet_tested");
    expect(matrix.rows[0].cells[0].label).toBe("Not looked at yet");
  });

  it("are listed on their own, because they are what turns into questions", () => {
    const matrix = buildMatrix({
      symptoms,
      candidates: [candidate({ id: "c1", name: "An ear thing" })],
      assessments: [{ candidateId: "c1", userSymptomId: "s1", fit: "supports", note: null }],
    });

    expect(matrix.untested).toEqual([{ symptomName: "Dizziness", candidateName: "An ear thing" }]);
  });
});

describe("a candidate that has been ruled down", () => {
  it("stays visible instead of vanishing", () => {
    // Conditions get set aside on partial evidence and need revisiting six months later by
    // somebody who watched them disappear off the screen.
    const matrix = buildMatrix({
      symptoms,
      candidates: [
        candidate({ id: "c1", status: "ruled_down", excludedBy: "Blood test in June was normal" }),
      ],
      assessments: [],
    });

    expect(matrix.columns).toHaveLength(0);
    expect(matrix.ruledDown).toHaveLength(1);
    expect(matrix.ruledDown[0].candidate.excludedBy).toMatch(/normal/);
  });
});

describe("what the module will not do", () => {
  it("invents no candidates of its own", () => {
    const matrix = buildMatrix({ symptoms, candidates: [], assessments: [] });

    expect(matrix.columns).toHaveLength(0);
    expect(matrix.ruledDown).toHaveLength(0);
    expect(matrix.rows.every((row) => row.cells.length === 0)).toBe(true);
  });

  it("orders columns as they were written, not by how well they score", () => {
    const weak = candidate({ id: "c1", name: "First one written" });
    const strong = candidate({ id: "c2", name: "Second one written" });
    const matrix = buildMatrix({
      symptoms,
      candidates: [weak, strong],
      assessments: [
        { candidateId: "c2", userSymptomId: "s1", fit: "supports", note: null },
        { candidateId: "c2", userSymptomId: "s2", fit: "supports", note: null },
        { candidateId: "c1", userSymptomId: "s1", fit: "against", note: null },
      ],
    });

    expect(matrix.columns.map((column) => column.candidate.name)).toEqual([
      "First one written",
      "Second one written",
    ]);
  });
});
