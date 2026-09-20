import { describe, expect, it } from "vitest";

import {
  comparePrecedence,
  isStrongSource,
  isUnsettled,
  proposeWinner,
  qualify,
} from "@/lib/timeline/provenance";
import { UNCONFIRMED } from "@/lib/timeline/records";

const record = (source: Parameters<typeof isStrongSource>[0], confidence: "confirmed" | "probable" | "unconfirmed" = "confirmed") =>
  ({ source, confidence }) as const;

describe("a note written at the time beats a memory", () => {
  it("even when the memory is the more certain of the two", () => {
    // This is the whole rule. A memory formed two weeks later feels clearer than the note
    // does, and that feeling is what memories do as they settle, not evidence.
    const note = record("contemporaneous_note", "probable");
    const memory = record("recollection", "confirmed");

    expect(comparePrecedence(note, memory)).toBe(1);
    expect(proposeWinner(note, memory)?.keep).toBe(note);
  });

  it("and so does a document", () => {
    expect(comparePrecedence(record("document"), record("recollection", "confirmed"))).toBe(1);
  });

  it("puts a first-hand memory above something somebody else said", () => {
    expect(comparePrecedence(record("recollection"), record("third_party", "confirmed"))).toBe(1);
  });
});

describe("when the evidence does not decide it", () => {
  it("returns no proposal rather than inventing a tiebreak", () => {
    const letter = record("document", "confirmed");
    const note = record("contemporaneous_note", "confirmed");

    expect(comparePrecedence(letter, note)).toBe(0);
    expect(proposeWinner(letter, note)).toBeNull();
  });

  it("uses confidence only to separate two records of the same strength", () => {
    const sure = record("recollection", "confirmed");
    const unsure = record("recollection", "unconfirmed");

    expect(proposeWinner(sure, unsure)?.keep).toBe(sure);
    expect(proposeWinner(sure, unsure)?.because).toMatch(/more sure/);
  });

  it("says which kind of evidence decided it", () => {
    const proposal = proposeWinner(record("document"), record("recollection"));
    expect(proposal?.because).toMatch(/from a document/);
    expect(proposal?.because).toMatch(/from recollection/);
  });
});

describe("unknown survives all the way out", () => {
  it("renders a missing value as the marker, not as a blank", () => {
    expect(qualify(null, "confirmed")).toBe(UNCONFIRMED);
    expect(qualify("", "confirmed")).toBe(UNCONFIRMED);
    expect(qualify("   ", "confirmed")).toBe(UNCONFIRMED);
  });

  it("marks a value the person is not sure of", () => {
    expect(qualify("3 March 2026", "unconfirmed")).toBe(`3 March 2026 ${UNCONFIRMED}`);
  });

  it("says approximate rather than pretending to precision", () => {
    expect(qualify("3 March 2026", "probable")).toBe("3 March 2026 (approximate)");
  });

  it("leaves a confirmed value alone", () => {
    expect(qualify("3 March 2026", "confirmed")).toBe("3 March 2026");
  });

  it("knows what would reach a clinician unchecked", () => {
    expect(isUnsettled(null, "confirmed")).toBe(true);
    expect(isUnsettled("something", "unconfirmed")).toBe(true);
    expect(isUnsettled("something", "confirmed")).toBe(false);
  });
});

describe("which sources outrank a memory", () => {
  it.each(["contemporaneous_note", "document"] as const)("%s does", (source) => {
    expect(isStrongSource(source)).toBe(true);
  });

  it.each(["recollection", "third_party"] as const)("%s does not", (source) => {
    expect(isStrongSource(source)).toBe(false);
  });
});
