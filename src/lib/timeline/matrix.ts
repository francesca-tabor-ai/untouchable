import type { CandidateStatus, MatrixFit } from "@/generated/prisma";

import { MATRIX_FIT_LABELS } from "./records";

/**
 * The candidate matrix: symptoms down the side, possible explanations across the top.
 *
 * **Read DECISIONS.md PL-49 before changing anything here.** This feature sits against
 * AGENTS.md rule 9, which says the product never interprets or ranks. It is built on the
 * product owner's explicit decision, inside a boundary that the rest of this file enforces:
 *
 *   - **Nothing in this codebase invents a candidate.** Every column is a condition the
 *     person typed in themselves, usually because somebody said it to them in a corridor.
 *     There is no list of conditions here, no scoring of symptoms against one, and no code
 *     path that adds a row the person did not write.
 *   - **No probabilities, ever.** The tally is a count of cells and is labelled as one, on
 *     the same line as the number. Fit is not likelihood and the two are easy to blur.
 *   - **It never reaches a clinician.** `handover.ts` will not render it. Handing a doctor
 *     your own differential list turns an appointment into a negotiation about your anxiety
 *     instead of an examination. Candidates leave this system as questions and nothing else.
 *   - **A candidate with no discriminating feature and no test that would settle it is not
 *     usable** and is called out rather than displayed as if it meant something.
 *
 * The rows that read "not looked at yet" are the actual output. They are what turns into
 * questions, and they are the reason the grid exists at all.
 */

/** Shown with every render of the matrix, without exception. */
export const MATRIX_FRAMING =
  "This shows how well each symptom fits each possible cause. It is not a probability, not a ranking, and not a diagnosis. Only examination, testing and a clinician can decide. Take this to an appointment as a set of questions, not as a conclusion.";

export interface CandidateRecord {
  id: string;
  name: string;
  discriminatingFeatures: string;
  testsThatWouldSettleIt: string;
  status: CandidateStatus;
  excludedBy: string | null;
}

export interface AssessmentRecord {
  candidateId: string;
  userSymptomId: string;
  fit: MatrixFit;
  note: string | null;
}

export interface MatrixCell {
  userSymptomId: string;
  candidateId: string;
  fit: MatrixFit;
  label: string;
  note: string | null;
}

export interface MatrixRow {
  userSymptomId: string;
  name: string;
  cells: MatrixCell[];
}

export interface MatrixColumn {
  candidate: CandidateRecord;
  /**
   * Counts of each answer. Deliberately not a single number: one figure invites being read
   * as a score, and `tallyLabel` never lets it stand on its own.
   */
  counts: Record<MatrixFit, number>;
  tallyLabel: string;
  /** Null when the candidate is usable. A sentence saying what is missing when it is not. */
  problem: string | null;
}

export interface Matrix {
  framing: string;
  rows: MatrixRow[];
  columns: MatrixColumn[];
  /** Kept visible. Conditions get excluded on partial evidence and later need revisiting. */
  ruledDown: MatrixColumn[];
  /** Every symptom-and-candidate pair nobody has looked at. The actionable part. */
  untested: { symptomName: string; candidateName: string }[];
}

export function buildMatrix(input: {
  symptoms: { id: string; name: string }[];
  candidates: CandidateRecord[];
  assessments: AssessmentRecord[];
}): Matrix {
  const live = input.candidates.filter((candidate) => candidate.status === "live");
  const closed = input.candidates.filter((candidate) => candidate.status !== "live");

  const fitFor = (candidateId: string, userSymptomId: string): AssessmentRecord | undefined =>
    input.assessments.find(
      (row) => row.candidateId === candidateId && row.userSymptomId === userSymptomId,
    );

  const rows: MatrixRow[] = input.symptoms.map((symptom) => ({
    userSymptomId: symptom.id,
    name: symptom.name,
    cells: live.map((candidate) => {
      const assessment = fitFor(candidate.id, symptom.id);
      const fit = assessment?.fit ?? "not_yet_tested";
      return {
        userSymptomId: symptom.id,
        candidateId: candidate.id,
        fit,
        label: MATRIX_FIT_LABELS[fit],
        note: assessment?.note ?? null,
      };
    }),
  }));

  const column = (candidate: CandidateRecord): MatrixColumn => {
    const counts = emptyCounts();
    for (const symptom of input.symptoms) {
      counts[fitFor(candidate.id, symptom.id)?.fit ?? "not_yet_tested"] += 1;
    }
    return {
      candidate,
      counts,
      tallyLabel: tallyLabel(counts),
      problem: candidateProblem(candidate),
    };
  };

  const untested = rows.flatMap((row) =>
    row.cells
      .filter((cell) => cell.fit === "not_yet_tested")
      .map((cell) => ({
        symptomName: row.name,
        candidateName: live.find((candidate) => candidate.id === cell.candidateId)?.name ?? "",
      })),
  );

  return {
    framing: MATRIX_FRAMING,
    rows,
    columns: live.map(column),
    ruledDown: closed.map(column),
    untested,
  };
}

/**
 * The sentence that goes next to the number.
 *
 * It says what the number counts, in the same breath as the number, because a tally with its
 * caveat in a footnote is a ranking with extra steps.
 */
export function tallyLabel(counts: Record<MatrixFit, number>): string {
  return `${counts.supports} of your symptoms fit this, ${counts.against} do not — a count of fit, not a likelihood`;
}

/**
 * Why this candidate cannot be used, or null.
 *
 * A possible explanation with nothing that would tell it apart from its neighbours, and no
 * test that would settle it, cannot turn into a question. It is a worry, which is a real
 * thing to have and not something this grid can do anything with.
 */
export function candidateProblem(candidate: CandidateRecord): string | null {
  const noFeature = candidate.discriminatingFeatures.trim().length === 0;
  const noTest = candidate.testsThatWouldSettleIt.trim().length === 0;

  if (noFeature && noTest) {
    return "Nothing here says what would tell this apart from the others, or what would settle it. Add one of those, or take it off the list.";
  }
  if (noFeature) return "Nothing here says what would tell this apart from the others.";
  if (noTest) return "Nothing here says what test or examination would settle it.";
  return null;
}

function emptyCounts(): Record<MatrixFit, number> {
  return { supports: 0, partial: 0, against: 0, neutral: 0, not_yet_tested: 0 };
}
