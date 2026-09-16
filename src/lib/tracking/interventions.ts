import { InterventionType, Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";

/**
 * What a treatment *is*, separately from one person's course of it.
 *
 * Brief 7.6 covers prescription medicines, things bought over the counter, supplements,
 * devices and things that are not drugs at all — physiotherapy, talking therapy, structured
 * exercise. All five are in `InterventionType` already.
 *
 * **Codes.** The schema has room for a dm+d code on a medicine and SNOMED CT on a condition.
 * A real dm+d import needs an NHS TRUD account and is a later task. Until then `dmdCode`
 * stays null on everything we create. A guessed code is worse than no code: it would be
 * wrong in a way that looks authoritative, and somebody downstream would trust it.
 */

export const INTERVENTION_TYPES: { value: InterventionType; label: string; hint: string }[] = [
  { value: "rx", label: "Prescription medicine", hint: "Something a doctor prescribed." },
  { value: "otc", label: "Medicine from a pharmacy or shop", hint: "Bought without a prescription." },
  { value: "supplement", label: "Supplement or vitamin", hint: "" },
  { value: "device", label: "Device or equipment", hint: "A monitor, a pump, a brace." },
  {
    value: "non_drug",
    label: "Something that is not a medicine",
    hint: "Physiotherapy, talking therapy, structured exercise, meditation.",
  },
];

export function interventionTypeLabel(type: InterventionType): string {
  return INTERVENTION_TYPES.find((option) => option.value === type)?.label ?? String(type);
}

/**
 * How a medicine is taken. Optional, and meaningless for a good deal of what people record,
 * so the empty option is first and stays selected unless somebody chooses otherwise.
 */
export const ROUTE_OPTIONS = [
  "By mouth",
  "Injection",
  "Patch or cream on the skin",
  "Inhaled",
  "Drops",
  "Suppository or pessary",
  "Other",
];

/** Offered through a `<datalist>`, so they are shortcuts rather than a closed list. */
export const FREQUENCY_SUGGESTIONS = [
  "Once a day",
  "Twice a day",
  "Three times a day",
  "Every morning",
  "Every night",
  "When I need it",
  "Once a week",
  "Once a month",
];

/** The sample lookup list, for the name field's suggestions. Never a limit on what you can record. */
export function interventionOptions() {
  return db.intervention.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }],
    select: { id: true, name: true, type: true, dmdCode: true },
  });
}

function tidyName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

/**
 * Find the intervention someone means, or create it.
 *
 * A real medicine cabinet will not match our sample list, and a person should never be
 * stopped from recording something they are actually taking because we have not heard of it.
 *
 * Matching is case-insensitive so "metformin" and "Metformin" do not become two rows and
 * split a research cohort in half. The stored name keeps the capitalisation of whoever got
 * there first.
 */
export async function findOrCreateIntervention(name: string, type: InterventionType) {
  const clean = tidyName(name);

  const existing = await db.intervention.findFirst({
    where: { type, name: { equals: clean, mode: "insensitive" } },
  });
  if (existing) return existing;

  try {
    return await db.intervention.create({ data: { name: clean, type, dmdCode: null } });
  } catch (error) {
    // Two people adding the same new treatment at the same moment. The unique constraint on
    // (name, type) is doing its job; read back the row that won.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const winner = await db.intervention.findFirst({
        where: { type, name: { equals: clean, mode: "insensitive" } },
      });
      if (winner) return winner;
    }
    throw error;
  }
}

