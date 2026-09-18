// @vitest-environment node
import { describe, expect, it } from "vitest";

import { doseLanguageProblem, doseLanguageProblems } from "@/lib/medicines/dose-language";
import { NOT_MEDICAL_ADVICE, INDEPENDENT_SOURCE_NOTE } from "@/lib/medicines/safety";
import { medicineSchema, storyMedicineSchema } from "@/lib/medicines/schemas";
import { SUBSTANCE_SUPPORT_CONTACTS, SUBSTANCE_SUPPORT_COPY } from "@/lib/safety/substance-support";

/**
 * AGENTS.md rule 15. "Never publish a dose, a regimen, or how much of something someone
 * took. A story can say a person was prescribed a drug, became dependent on it, and came
 * off it. It must not be readable as instructions."
 *
 * The detector is checked here against the sentences an editor might actually type, and
 * against the sentences we want them to be able to type instead. The rendered surfaces are
 * scanned separately in medicine-surfaces.test.tsx.
 */

const DOSE_SHAPED = [
  "20mg at night",
  "20 mg",
  "started on 5mg",
  "two tablets before bed",
  "a tablet whenever she could not sleep",
  "half a tablet",
  "three capsules",
  "took two",
  "they doubled her dose",
  "her dose was increased",
  "the dosage went up",
  "one a day",
  "taken twice a day",
  "every night for years",
  "10ml of it",
  "500 micrograms",
  "taking it daily",
];

const ALLOWED = [
  "prescribed, aged eight",
  "bought online",
  "came off it in 2019",
  "prescribed after a bereavement, and never reviewed",
  "still taking it thirty years later",
  "given it in hospital and sent home with a repeat prescription",
  "stopped, with help from her GP, after a long time on it",
  "she became dependent on it and said so publicly",
];

describe("the dose detector", () => {
  for (const phrase of DOSE_SHAPED) {
    it(`refuses "${phrase}"`, () => {
      expect(doseLanguageProblem(phrase)).not.toBeNull();
    });
  }

  for (const phrase of ALLOWED) {
    it(`allows "${phrase}"`, () => {
      expect(doseLanguageProblem(phrase)).toBeNull();
    });
  }

  it("names every problem it found, so a failure is actionable", () => {
    expect(doseLanguageProblems("two tablets, 20mg, twice a day").length).toBeGreaterThan(1);
  });
});

describe("the context line on a story-to-medicine link", () => {
  const base = { storyId: "story-1", interventionId: "medicine-1", sourceId: "source-1" };

  it("accepts a phrase about how someone came to a medicine", () => {
    const parsed = storyMedicineSchema.safeParse({
      ...base,
      context: "prescribed, aged eight, and never reviewed",
    });
    expect(parsed.success).toBe(true);
  });

  it("refuses a dose", () => {
    const parsed = storyMedicineSchema.safeParse({ ...base, context: "prescribed 10mg at night" });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toContain("never publish");
  });

  it("refuses a regimen even with no numbers in it", () => {
    const parsed = storyMedicineSchema.safeParse({ ...base, context: "took one every night" });
    expect(parsed.success).toBe(false);
  });

  it("caps the context at the length the database caps it at", () => {
    const parsed = storyMedicineSchema.safeParse({ ...base, context: "x".repeat(161) });
    expect(parsed.success).toBe(false);
  });

  it("treats an empty context as no context, not as an empty string", () => {
    const parsed = storyMedicineSchema.safeParse({ ...base, context: "   " });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.context).toBeNull();
  });

  it("treats an empty source as no source, so the flag can find it", () => {
    const parsed = storyMedicineSchema.safeParse({ ...base, sourceId: "", context: "" });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.sourceId).toBeNull();
  });
});

describe("a medicine an editor adds", () => {
  const base = {
    name: "Invented sedative",
    slug: "invented-sedative",
    type: "rx" as const,
    isSensitiveTopic: true,
  };

  it("needs a plain-English description, because without one it has no page", () => {
    const parsed = medicineSchema.safeParse({ ...base, summary: "A sedative." });
    expect(parsed.success).toBe(false);
  });

  it("refuses a description with a dose in it", () => {
    const parsed = medicineSchema.safeParse({
      ...base,
      summary:
        "An invented sedative for tests. It is normally prescribed as 5mg tablets and is only meant for short-term use.",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts a description that says what it is and no more", () => {
    const parsed = medicineSchema.safeParse({
      ...base,
      summary:
        "An invented sedative for tests. It is licensed only for short-term use, and people can become dependent on it even after a short course.",
    });
    expect(parsed.success).toBe(true);
  });
});

describe("our own fixed copy", () => {
  const copy = [
    NOT_MEDICAL_ADVICE,
    INDEPENDENT_SOURCE_NOTE,
    SUBSTANCE_SUPPORT_COPY.heading,
    SUBSTANCE_SUPPORT_COPY.intro,
    SUBSTANCE_SUPPORT_COPY.clinical,
    ...SUBSTANCE_SUPPORT_CONTACTS.map((contact) => `${contact.name} ${contact.detail}`),
  ];

  for (const sentence of copy) {
    it(`is not dose-shaped: "${sentence.slice(0, 40)}…"`, () => {
      expect(doseLanguageProblem(sentence)).toBeNull();
    });
  }
});

describe("the dependence contacts", () => {
  it("are FRANK and the NHS, and nothing that sells treatment", () => {
    const keys = SUBSTANCE_SUPPORT_CONTACTS.map((contact) => contact.key);
    expect(keys).toContain("frank");
    expect(keys.some((key) => key.startsWith("nhs"))).toBe(true);
  });

  it("carries FRANK's helpline number", () => {
    const frank = SUBSTANCE_SUPPORT_CONTACTS.find((contact) => contact.key === "frank");
    expect(frank?.contact).toBe("0300 123 6600");
    expect(frank?.href).toBe("tel:03001236600");
  });

  it("links only to talktofrank.com and nhs.uk — AGENTS.md rule 14", () => {
    const external = SUBSTANCE_SUPPORT_CONTACTS.filter((contact) =>
      contact.href.startsWith("http"),
    );
    expect(external.length).toBeGreaterThan(0);
    for (const contact of external) {
      expect(contact.href).toMatch(/^https:\/\/(www\.talktofrank\.com|www\.nhs\.uk)\//);
    }
  });

  it("asks nobody for money", () => {
    const words = SUBSTANCE_SUPPORT_CONTACTS.map(
      (contact) => `${contact.name} ${contact.detail}`,
    ).join(" ");
    expect(words).not.toMatch(/donat|fundrais|£/i);
  });
});
