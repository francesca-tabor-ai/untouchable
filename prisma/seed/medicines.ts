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
 * company that sells treatment. A private clinic's page on nitrazepam was offered for that
 * entry and rejected — a page like that exists to find customers, and linking to it would
 * sell the one thing this platform has.
 *
 * Every entry names its source in the comment above it. Where the NHS medicines A–Z has a
 * page, that is the source. Where it has none, the entry says so and uses the UK Summary of
 * Product Characteristics on the electronic Medicines Compendium instead.
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
 * **Nor has it a tamoxifen page.** Checked on 26 September 2026: nhs.uk/medicines/tamoxifen/
 * returns a 404. That entry is written from the Nolvadex licence on the electronic
 * Medicines Compendium.
 *
 * The other ten were written from their NHS pages, all checked on 26 September 2026.
 *
 * ## What the words may not say
 *
 * Nothing about how much, how often, or how long a course runs in numbers. AGENTS.md rule
 * 17: a page about a medicine must not be readable as instructions for taking it. Nothing
 * about what it feels like, either — people in recovery read pages like these, and a
 * description of the effect is an advertisement whatever else it is. Nothing that says a
 * medicine works, or is safe, or is dangerous: what it is for and what its licence warns
 * about, no more. tests/unit/medicine-seed.test.ts checks every entry for all of this.
 *
 * ## Names
 *
 * The seven medicines that `core.ts` already puts in the treatment picker keep exactly the
 * name they have there, so the loop below adopts that row rather than creating a second
 * "Sertraline" beside the first. Brand names go in the summary instead.
 *
 * Re-check every source at the twelve-month review.
 */
export async function seedMedicines(db: PrismaClient) {
  const medicines = [
    // Sources: medicines.org.uk/emc/product/3901/smpc and nhs.uk/conditions/insomnia/ — see above.
    {
      name: "Nitrazepam (Mogadon)",
      slug: "nitrazepam",
      type: "rx" as const,
      isSensitiveTopic: true,
      summary:
        "Nitrazepam is a benzodiazepine. Mogadon is the brand name it has been sold under in the UK for decades. It is a prescription-only sleeping tablet, licensed only for short-term use, and only when insomnia is severe enough to be disabling or genuinely distressing. Its UK licence says a course should be kept as short as possible and that it should be stopped gradually rather than suddenly, because stopping abruptly can bring the sleeplessness back worse than before, along with anxiety and other withdrawal effects. The body adjusts to benzodiazepines quickly, so the same course can become less effective over time, and physical dependence can develop even in someone who took it for a short while exactly as prescribed. The NHS now says GPs rarely prescribe sleeping pills at all.",
    },
    // Source: nhs.uk/medicines/diazepam/
    {
      name: "Diazepam",
      slug: "diazepam",
      type: "rx" as const,
      isSensitiveTopic: true,
      summary:
        "Diazepam is a benzodiazepine. It is prescription-only. It is used for severe anxiety, for seizures, for muscle spasms, and to sedate people before some medical procedures. The NHS says it should only be used for a short time, because a longer course can lead to addiction and to withdrawal symptoms. Stopping suddenly can also cause withdrawal symptoms, so the NHS says a doctor will bring it down gradually rather than stopping it all at once.",
    },
    // Source: nhs.uk/medicines/zopiclone/
    {
      name: "Zopiclone",
      slug: "zopiclone",
      type: "rx" as const,
      isSensitiveTopic: true,
      summary:
        "Zopiclone is a prescription-only sleeping pill. It belongs to a group sometimes called Z-drugs, which are hypnotics: medicines for sleep. It is meant for short-term insomnia that is affecting someone's life, whether that is trouble getting to sleep, waking in the night or waking too early. The NHS says a course usually lasts from a few days to a few weeks, and is kept short because the body can get used to it. It is possible to become addicted to zopiclone. Stopping suddenly can cause withdrawal symptoms, so a doctor brings it down gradually.",
    },
    // Source: nhs.uk/medicines/codeine/
    {
      name: "Codeine",
      slug: "codeine",
      type: "rx" as const,
      isSensitiveTopic: true,
      summary:
        "Codeine is an opioid painkiller. On its own it is prescription-only, and it is used for pain, for example after an operation or an injury, when other painkillers have not been enough. It is also used for a dry, painful cough and for diarrhoea. Some medicines combine it with paracetamol or ibuprofen, and some of those can be bought from a pharmacy. The NHS says that with long-term use the body can get used to codeine, and that it is possible to become addicted to it. Stopping suddenly can cause withdrawal symptoms, such as feeling agitated or anxious, so a doctor brings it down gradually over weeks or months.",
    },
    // Sources: nhs.uk/medicines/pregabalin/ and its common questions page,
    // nhs.uk/medicines/pregabalin/common-questions-about-pregabalin/
    {
      name: "Pregabalin",
      slug: "pregabalin",
      type: "rx" as const,
      isSensitiveTopic: true,
      summary:
        "Pregabalin is a prescription-only medicine for epilepsy, generalised anxiety disorder and nerve pain, including nerve pain caused by diabetes or by shingles. Brand names in the UK include Lyrica, Alzain, Axalid and Misabri. It is a controlled medicine, which means there are strict rules about how it is prescribed and handed out, because it can be misused. The NHS says some people become addicted to pregabalin and have withdrawal symptoms when they stop, including anxiety, panic attacks, trouble sleeping, sweating and restlessness. It should not be stopped without talking to a doctor, and it is brought down gradually.",
    },
    // Source: nhs.uk/medicines/sertraline/
    {
      name: "Sertraline",
      slug: "sertraline",
      type: "rx" as const,
      isSensitiveTopic: false,
      summary:
        "Sertraline is an antidepressant. It belongs to a group called selective serotonin reuptake inhibitors, or SSRIs, which raise the level of serotonin, a chemical in the brain linked to mood. It is prescription-only. It is used for depression, obsessive compulsive disorder, panic disorder, post-traumatic stress disorder and social anxiety disorder. People are often on it for several months or longer. The NHS says it should not be stopped suddenly, because that can cause withdrawal symptoms, and that a doctor will bring it down gradually over several weeks or months.",
    },
    // Source: nhs.uk/medicines/fluoxetine/
    {
      name: "Fluoxetine",
      slug: "fluoxetine",
      type: "rx" as const,
      isSensitiveTopic: false,
      summary:
        "Fluoxetine is an antidepressant. It belongs to a group called selective serotonin reuptake inhibitors, or SSRIs. It is prescription-only. It is used for depression, obsessive compulsive disorder and bulimia, and sometimes for symptoms of the menopause. The NHS says it should not be stopped suddenly, because that may cause withdrawal symptoms, and that a doctor will bring it down gradually over several weeks or months.",
    },
    // Source: medicines.org.uk/emc/product/101401/smpc (Nolvadex). The NHS has no page — see above.
    {
      name: "Tamoxifen",
      slug: "tamoxifen",
      type: "rx" as const,
      isSensitiveTopic: false,
      summary:
        "Tamoxifen is a hormone medicine used in breast cancer. It is an anti-oestrogen: in breast tissue it blocks oestrogen from reaching cancer cells that need it to grow. Nolvadex is one brand name. It is prescription-only. Its UK licence covers treating breast cancer, lowering the chance of breast cancer in women at moderate or raised risk of it, and some kinds of infertility. The licence warns that it raises the risk of blood clots and of changes to the lining of the womb, including womb cancer, and says unexpected vaginal bleeding should always be looked into. It must not be used in pregnancy.",
    },
    // Sources: nhs.uk/medicines/letrozole/ and nhs.uk/medicines/letrozole/about-letrozole/
    {
      name: "Letrozole",
      slug: "letrozole",
      type: "rx" as const,
      isSensitiveTopic: false,
      summary:
        "Letrozole is a hormone medicine used in breast cancer. Femara is one brand name. It is an aromatase inhibitor, which means it lowers the amount of oestrogen the body makes, for breast cancers that need oestrogen to grow. It is prescription-only, and is mainly prescribed to women who have been through the menopause, often after surgery or chemotherapy, to lower the chance of the cancer coming back, or to lower the chance of breast cancer in people at raised risk. It is occasionally used in men, and rarely as a fertility treatment. People usually stay on it for several years. The NHS says doctors check bone density, blood pressure and cholesterol during treatment.",
    },
    // Source: nhs.uk/medicines/metformin/
    {
      name: "Metformin",
      slug: "metformin",
      type: "rx" as const,
      isSensitiveTopic: false,
      summary:
        "Metformin is a prescription-only medicine for type 2 diabetes. It lowers the level of sugar in the blood when the body does not make enough insulin, or the insulin it makes does not work properly. It is also used for diabetes that develops in pregnancy, alongside insulin for some people with type 1 diabetes, and for polyendocrine metabolic ovarian syndrome (PMOS), which was previously called polycystic ovary syndrome. Many people are on it for a long time. The NHS says not to stop it without talking to a doctor, because blood sugar can rise again, and that over time it can lower vitamin B12, which can make people very tired.",
    },
    // Source: nhs.uk/medicines/gliclazide/
    {
      name: "Gliclazide",
      slug: "gliclazide",
      type: "rx" as const,
      isSensitiveTopic: false,
      summary:
        "Gliclazide is a prescription-only medicine for type 2 diabetes. It makes the body produce more of its own insulin, which lowers the level of sugar in the blood. People are usually on it for a long time, and the NHS says not to stop it unless a doctor says so. Because it raises insulin, it can make blood sugar fall too low, which is called a hypo. Signs of a hypo include feeling dizzy, sick, hungry or very tired.",
    },
    // Source: nhs.uk/medicines/paracetamol-for-adults/
    {
      name: "Paracetamol",
      slug: "paracetamol",
      type: "otc" as const,
      isSensitiveTopic: false,
      summary:
        "Paracetamol is a painkiller, and is also used for a fever. It is used for headaches, toothache, a sore throat, aching and stiff joints, and the symptoms of a cold or flu. Most kinds can be bought in shops and pharmacies, and some are only available on prescription. Many cold and flu remedies already contain paracetamol, and the NHS says not to have two paracetamol products at the same time, because it is easy to have too much without realising. Too much paracetamol can damage the liver, and the NHS says anyone who has had too much should get medical advice from NHS 111.",
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
