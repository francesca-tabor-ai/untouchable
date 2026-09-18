import { PrismaClient } from "../../src/generated/prisma";

/**
 * Medicines that have a public page of their own.
 *
 * Unlike everything else in this seed, these are real. A medicine is not a person: naming
 * nitrazepam makes no claim about anybody, and a page that says what a drug is has to say
 * what a real drug really is or it is worth nothing. The fictional-people rule (AGENTS.md
 * rule 1, brief section 9) is untouched — no story here names anyone.
 *
 * ## Where the words come from
 *
 * AGENTS.md rule 14: the NHS, the BNF, or the electronic Medicines Compendium. Never a
 * company that sells treatment. A private clinic's page on this exact drug was offered for
 * this entry and rejected — a page like that exists to find customers, and linking to it
 * would sell the one thing this platform has.
 *
 * **The NHS medicines A–Z has no nitrazepam page.** It was checked on 18 September 2026:
 * nhs.uk/medicines/nitrazepam/ returns a 404, and the A–Z lists no nitrazepam between
 * nifedipine and nitrofurantoin. So the description below is written in our own words from
 * the two independent sources AGENTS.md rule 14 allows in its place:
 *
 * - The UK Summary of Product Characteristics for Mogadon, on the electronic Medicines
 *   Compendium: medicines.org.uk/emc/product/3901/smpc — the licensed indication, the
 *   benzodiazepine class, and what section 4.4 says about tolerance, dependence and
 *   stopping gradually.
 * - The NHS page on insomnia: nhs.uk/conditions/insomnia/ — that GPs now rarely prescribe
 *   sleeping pills, that a course is short when they do, and that people can become
 *   dependent on them.
 *
 * Nothing about how much, how often, or how long a course runs in numbers. AGENTS.md rule
 * 15: a page about a medicine must not be readable as instructions for taking it. Nothing
 * about what it feels like, either — people in recovery read pages like these, and a
 * description of the effect is an advertisement whatever else it is.
 *
 * Re-check both sources at the twelve-month review.
 */
export async function seedMedicines(db: PrismaClient) {
  const medicines = [
    {
      name: "Nitrazepam (Mogadon)",
      slug: "nitrazepam",
      type: "rx" as const,
      isSensitiveTopic: true,
      summary:
        "Nitrazepam is a benzodiazepine. Mogadon is the brand name it has been sold under in the UK for decades. It is a prescription-only sleeping tablet, licensed only for short-term use, and only when insomnia is severe enough to be disabling or genuinely distressing. Its UK licence says a course should be kept as short as possible and that it should be stopped gradually rather than suddenly, because stopping abruptly can bring the sleeplessness back worse than before, along with anxiety and other withdrawal effects. The body adjusts to benzodiazepines quickly, so the same course can become less effective over time, and physical dependence can develop even in someone who took it for a short while exactly as prescribed. The NHS now says GPs rarely prescribe sleeping pills at all.",
    },
  ];

  for (const medicine of medicines) {
    // Somebody's own treatment log may already have created a row for this name through
    // `findOrCreateIntervention`, which writes no slug and no summary. Adopt that row
    // rather than failing on the unique (name, type) constraint — the same thing
    // `createMedicine` does in the admin.
    const existing = await db.intervention.findFirst({
      where: { type: medicine.type, name: { equals: medicine.name, mode: "insensitive" } },
      select: { id: true },
    });

    if (existing) {
      await db.intervention.update({
        where: { id: existing.id },
        data: {
          slug: medicine.slug,
          summary: medicine.summary,
          isSensitiveTopic: medicine.isSensitiveTopic,
        },
      });
      continue;
    }

    await db.intervention.upsert({
      where: { slug: medicine.slug },
      update: {
        name: medicine.name,
        type: medicine.type,
        summary: medicine.summary,
        isSensitiveTopic: medicine.isSensitiveTopic,
      },
      create: medicine,
    });
  }

  return { count: medicines.length };
}
