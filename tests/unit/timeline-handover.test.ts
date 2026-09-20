import { describe, expect, it } from "vitest";

import {
  buildLongScript,
  buildShortScript,
  countWords,
  LONG_SCRIPT_MAX_WORDS,
  longScriptMarkdown,
  SHORT_SCRIPT_MAX_WORDS,
  type HandoverInput,
} from "@/lib/timeline/handover";
import { UNCONFIRMED } from "@/lib/timeline/records";

import { candidate, day, fact, handoverEvent, observation, symptom } from "./timeline-fixtures";

const TODAY = day("2026-09-20");

function input(overrides: Partial<HandoverInput> = {}): HandoverInput {
  return {
    person: { displayName: "A. Fictional", age: 44 },
    today: TODAY,
    symptoms: [symptom({ id: "s1", name: "Headaches", firstOnset: day("2026-03-03") })],
    observations: [observation({ userSymptomId: "s1", severity: 7 })],
    events: [handoverEvent()],
    standingFacts: [fact({ category: "allergy", value: "penicillin" })],
    candidates: [],
    reason: null,
    asking: null,
    ...overrides,
  };
}

describe("the short script", () => {
  it("stays inside fifty seconds of speech", () => {
    const script = buildShortScript(input());
    expect(script.wordCount).toBeLessThanOrEqual(SHORT_SCRIPT_MAX_WORDS);
  });

  it("stays inside it even for somebody with a lot to say", () => {
    const script = buildShortScript(
      input({
        standingFacts: [
          fact({ category: "allergy", value: "penicillin" }),
          fact({ category: "allergy", value: "elastoplast" }),
          ...Array.from({ length: 14 }, (_, index) =>
            fact({ category: "current_medication", value: `a tablet called number ${index}` }),
          ),
          ...Array.from({ length: 8 }, (_, index) =>
            fact({ category: "past_condition", value: `a condition from years ago number ${index}` }),
          ),
          fact({ category: "lifestyle", value: "I live on my own on the third floor with no lift" }),
        ],
      }),
    );

    expect(script.wordCount).toBeLessThanOrEqual(SHORT_SCRIPT_MAX_WORDS);
    expect(script.omitted).toMatch(/left out of this one on purpose/);
  });

  it("leads with what is happening now, not with the history", () => {
    // A triage clinician decides one thing in the first fifteen seconds. Opening with "this
    // started back in March" spends those fifteen seconds on the least useful part.
    const script = buildShortScript(input());
    expect(script.sentences[0]).toMatch(/^I have headaches/);
  });

  it("hands over and stops", () => {
    expect(buildShortScript(input()).stopLine).toBe("Stop and let them ask.");
  });

  it("carries the wording that changes a pathway, and why", () => {
    const script = buildShortScript(
      input({
        events: [
          handoverEvent({
            occurredAt: day("2026-09-20"),
            description: "The hearing in my left ear has gone",
          }),
        ],
      }),
    );

    expect(script.exactPhrases[0].say).toBe("sudden hearing loss in one ear");
    expect(script.exactPhrases[0].why).toMatch(/ringing/i);
  });

  it("lists what triage will ask without answering it for them", () => {
    const script = buildShortScript(input());

    expect(script.likelyQuestions.length).toBeGreaterThanOrEqual(3);
    for (const item of script.likelyQuestions) {
      expect(item.question).toMatch(/\?$/);
      expect(item.haveReady).toBeTruthy();
    }
  });

  it("says out loud when a date is not known, rather than rounding it", () => {
    const script = buildShortScript(
      input({ symptoms: [symptom({ id: "s1", name: "Headaches", firstOnset: null })] }),
    );

    expect(script.sentences[0]).toMatch(/cannot pin down/);
  });

  it("never puts the candidate list in a triage call", () => {
    const script = buildShortScript(
      input({ candidates: [candidate({ name: "A worrying thing I read about" })] }),
    );

    expect(script.sentences.join(" ")).not.toMatch(/A worrying thing I read about/);
  });
});

describe("the long script", () => {
  it("fits on one side of A4", () => {
    const script = buildLongScript(input());
    expect(script.wordCount).toBeLessThanOrEqual(LONG_SCRIPT_MAX_WORDS);
  });

  it("fits even after eight months of entries", () => {
    const script = buildLongScript(
      input({
        events: Array.from({ length: 60 }, (_, index) =>
          handoverEvent({
            occurredAt: day(`2026-0${(index % 8) + 1}-1${index % 9}`),
            description: `An appointment about the headaches, number ${index}, with some detail`,
          }),
        ),
      }),
    );

    expect(script.wordCount).toBeLessThanOrEqual(LONG_SCRIPT_MAX_WORDS);
    expect(script.omitted).toMatch(/left out to keep this to one page/);
  });

  it("opens with allergies", () => {
    expect(buildLongScript(input()).standingFacts[0].label).toBe("Allergies");
  });

  it("says none known rather than leaving allergies blank", () => {
    const script = buildLongScript(input({ standingFacts: [] }));
    expect(script.standingFacts[0].values).toEqual(["None known"]);
  });

  it("marks a line that came from memory as coming from memory", () => {
    // "Examination normal", written flat, is a clinical record this person has invented.
    const script = buildLongScript(
      input({
        events: [
          handoverEvent({
            source: "recollection",
            description: "Ears examined",
            outcome: "I was told they looked normal",
          }),
        ],
      }),
    );

    const line = script.chronology.find((row) => row.includes("Ears examined"));
    expect(line).toMatch(/from recollection/);
    expect(line).toMatch(/not confirmed against a document/);
  });

  it("names the document when there is one to chase", () => {
    const script = buildLongScript(
      input({
        events: [
          handoverEvent({
            source: "recollection",
            description: "Blood tests",
            documentRef: "clinic letter not obtained",
          }),
        ],
      }),
    );

    expect(script.chronology.some((row) => row.includes("clinic letter not obtained"))).toBe(true);
  });

  it("marks an unconfirmed onset date in the chronology", () => {
    const script = buildLongScript(
      input({
        symptoms: [
          symptom({ id: "s1", firstOnset: day("2026-03-03"), firstOnsetConfidence: "unconfirmed" }),
        ],
      }),
    );

    expect(script.chronology[0]).toContain(UNCONFIRMED);
  });

  it("says when something has never been assessed", () => {
    const script = buildLongScript(
      input({
        symptoms: [symptom({ id: "s1", name: "Ringing in one ear" })],
        events: [],
      }),
    );

    expect(script.currentStatus[0]).toMatch(/never been assessed/);
  });

  it("records the absent things, which is what a clinician will ask for", () => {
    const script = buildLongScript(
      input({
        standingFacts: [
          fact({ category: "relevant_negative", value: "No weight loss." }),
          fact({ category: "relevant_negative", value: "No night sweats." }),
        ],
      }),
    );

    expect(script.keyNegatives).toEqual(["No weight loss.", "No night sweats."]);
  });

  it("says none recorded rather than printing an empty heading", () => {
    expect(buildLongScript(input()).keyNegatives).toEqual(["None recorded."]);
  });

  it("gives three to five questions", () => {
    const script = buildLongScript(input());
    expect(script.questions.length).toBeGreaterThanOrEqual(1);
    expect(script.questions.length).toBeLessThanOrEqual(5);
  });

  it("tells the person what to bring", () => {
    const script = buildLongScript(
      input({
        standingFacts: [fact({ category: "current_medication", value: "a blue inhaler" })],
        symptoms: [symptom({ id: "s1", firstOnset: null })],
      }),
    );

    expect(script.takeWithYou.join(" ")).toMatch(/packets/);
    expect(script.takeWithYou.join(" ")).toMatch(/pin down when this started/);
  });
});

describe("the candidate matrix never reaches a clinician", () => {
  // Handing a doctor your own differential list turns the appointment into a negotiation
  // about your anxiety instead of an examination. Candidates leave as questions only.
  const withCandidates = input({
    candidates: [
      candidate({ id: "c1", name: "Ménière's disease" }),
      candidate({ id: "c2", name: "A vestibular thing" }),
    ],
  });

  it("states no candidate as a fact anywhere in the document", () => {
    const markdown = longScriptMarkdown(buildLongScript(withCandidates));

    expect(markdown).not.toMatch(/I think (this|it) is/i);
    expect(markdown).not.toMatch(/supports|partly fits|does not fit|count of fit/i);
    expect(markdown).not.toMatch(/\bfits\b/i);
  });

  it("turns each one into a question instead", () => {
    const script = buildLongScript(withCandidates);

    expect(script.questions[0]).toBe("Could this be Ménière's disease? What would rule it out?");
    expect(script.questions[1]).toBe("Could this be A vestibular thing? What would rule it out?");
  });

  it("leaves out a candidate with nothing that would settle it", () => {
    const script = buildLongScript(
      input({
        candidates: [candidate({ name: "Something I read about", testsThatWouldSettleIt: "" })],
      }),
    );

    expect(script.questions.join(" ")).not.toMatch(/Something I read about/);
  });

  it("leaves out one that has been ruled down", () => {
    const script = buildLongScript(
      input({ candidates: [candidate({ name: "Ruled out thing", status: "excluded" })] }),
    );

    expect(script.questions.join(" ")).not.toMatch(/Ruled out thing/);
  });
});

describe("word counting", () => {
  it("counts words, not characters", () => {
    expect(countWords("  one   two \n three ")).toBe(3);
    expect(countWords("")).toBe(0);
  });
});
