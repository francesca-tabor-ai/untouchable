/**
 * Women's health — the first page under Personalised medicine.
 *
 * Four questions, in the order someone tends to ask them: how cycles and hormones change
 * things, what women are more likely to get, how symptoms can show up differently, and why
 * treatment can differ.
 *
 * Every point is written in our own words from a named NHS or UK Government page, and says
 * which one. That is AGENTS.md rule 14 applied beyond medicines: nothing here comes from a
 * company that sells treatment, however good its page is. Each source was read on
 * 26 September 2026.
 *
 * What this page must never do (rule 9, rule 17): recommend, rank or interpret a treatment,
 * say one works, or give a dose. Where the NHS itself gives a safety instruction — "check
 * before taking a medicine in pregnancy" — we say it is the NHS saying it. The tests in
 * tests/unit/personalised-medicine.test.tsx run every point through the dose detector and a
 * list of claim words.
 *
 * Numbers are left out on purpose. "More women than men get lupus" is what the NHS says and
 * is enough; a ratio invites someone to treat a group statistic as their own odds.
 */

export interface Source {
  label: string;
  href: string;
}

export interface Point {
  title: string;
  body: string;
  sources: Source[];
}

export interface Section {
  id: string;
  heading: string;
  intro: string;
  points: Point[];
}

const NHS = {
  periods: { label: "NHS: Periods", href: "https://www.nhs.uk/conditions/periods/" },
  pms: {
    label: "NHS: PMS (premenstrual syndrome)",
    href: "https://www.nhs.uk/conditions/pre-menstrual-syndrome/",
  },
  migraine: { label: "NHS: Migraine", href: "https://www.nhs.uk/conditions/migraine/" },
  menopause: {
    label: "NHS: Menopause and perimenopause",
    href: "https://www.nhs.uk/conditions/menopause-and-perimenopause/",
  },
  osteoporosis: {
    label: "NHS: Osteoporosis",
    href: "https://www.nhs.uk/conditions/osteoporosis/",
  },
  endometriosis: {
    label: "NHS: Endometriosis",
    href: "https://www.nhs.uk/conditions/endometriosis/",
  },
  pmos: {
    label: "NHS: Polyendocrine metabolic ovarian syndrome (PMOS)",
    href: "https://www.nhs.uk/conditions/polyendocrine-metabolic-ovarian-syndrome-pmos/",
  },
  lupus: { label: "NHS: Lupus", href: "https://www.nhs.uk/conditions/lupus/" },
  rheumatoidArthritis: {
    label: "NHS: Rheumatoid arthritis",
    href: "https://www.nhs.uk/conditions/rheumatoid-arthritis/",
  },
  thyroid: {
    label: "NHS: Underactive thyroid",
    href: "https://www.nhs.uk/conditions/underactive-thyroid-hypothyroidism/",
  },
  uti: {
    label: "NHS: Urinary tract infections",
    href: "https://www.nhs.uk/conditions/urinary-tract-infections-utis/",
  },
  autism: {
    label: "NHS: Signs of autism in adults",
    href: "https://www.nhs.uk/conditions/autism/signs-in-adults/",
  },
  pregnancyMedicines: {
    label: "NHS: Medicines in pregnancy",
    href: "https://www.nhs.uk/pregnancy/keeping-well/medicines/",
  },
  epilepsy: {
    label: "NHS: Living with epilepsy",
    href: "https://www.nhs.uk/conditions/epilepsy/living-with/",
  },
  hrt: {
    label: "NHS: Hormone replacement therapy (HRT)",
    href: "https://www.nhs.uk/medicines/hormone-replacement-therapy-hrt/",
  },
} satisfies Record<string, Source>;

const STRATEGY: Source = {
  label: "UK Government: Women's Health Strategy for England",
  href: "https://www.gov.uk/government/publications/womens-health-strategy-for-england/womens-health-strategy-for-england",
};

export const WOMENS_HEALTH = {
  slug: "womens-health",
  title: "Women's health",
  summary:
    "How hormones and cycles change things, what women are more likely to get, how symptoms can show up differently, and why treatment can differ.",
  lead: "Medicine has often treated the male body as the default. Here is what is known about how being a woman can change which conditions you get, how they show up, and how they are treated — each point from the NHS or the UK Government.",
  whoThisIsFor:
    "This page says “women” because that is how most research and NHS pages are written. Some trans men and non-binary people have periods, a womb or ovaries, and some women do not. Where a point is about a part of the body, it is about whoever has it.",
} as const;

export const WOMENS_HEALTH_SECTIONS: readonly Section[] = [
  {
    id: "cycles-and-hormones",
    heading: "Cycles and hormones",
    intro:
      "Hormones rise and fall through each month, and change again at puberty, in pregnancy and around the menopause. Some conditions change with them.",
    points: [
      {
        title: "The monthly cycle",
        body: "A period is one part of the menstrual cycle, a monthly pattern of hormone changes. How long a cycle lasts, and how heavy or painful a period is, differs from person to person.",
        sources: [NHS.periods],
      },
      {
        title: "Before a period",
        body: "Most women have premenstrual syndrome, or PMS, at some point: changes in mood, body and energy in the days before a period. Symptoms can differ from month to month. A small number of women have a more severe form called premenstrual dysphoric disorder, or PMDD.",
        sources: [NHS.pms],
      },
      {
        title: "Conditions that follow the cycle",
        body: "Some conditions change with the cycle. The NHS describes migraine attacks that happen just before or during a period, called menstrual migraine, and says migraine often changes after the menopause and sometimes in pregnancy.",
        sources: [NHS.migraine],
      },
      {
        title: "Perimenopause and menopause",
        body: "The menopause is when periods stop. Perimenopause is the time before it, when hormone levels change and symptoms can begin. The menopause usually happens between 45 and 55, but it can happen earlier.",
        sources: [NHS.menopause],
      },
      {
        title: "After the menopause",
        body: "Women lose bone quickly in the first few years after the menopause. The NHS gives this as one reason osteoporosis, where bones become weaker, is more common in women.",
        sources: [NHS.osteoporosis],
      },
    ],
  },
  {
    id: "more-likely",
    heading: "What women are more likely to get",
    intro:
      "Some conditions only happen in a body with a womb and ovaries. Others can affect anyone but are more common in women. Being more likely to get something is true of a group of people. It is not a prediction about you.",
    points: [
      {
        title: "Conditions only women get",
        body: "Endometriosis is where cells like the lining of the womb grow in other parts of the body. PMOS, which used to be called polycystic ovary syndrome or PCOS, usually starts at puberty. Both can continue until the menopause.",
        sources: [NHS.endometriosis, NHS.pmos],
      },
      {
        title: "Immune system conditions",
        body: "The NHS says more women than men get lupus, and that being a woman is one of the things that makes rheumatoid arthritis more likely. Hashimoto's disease, a common cause of an underactive thyroid, is most common in women.",
        sources: [NHS.lupus, NHS.rheumatoidArthritis, NHS.thyroid],
      },
      {
        title: "Migraine",
        body: "Women are more likely to get migraine than men.",
        sources: [NHS.migraine],
      },
      {
        title: "Weaker bones",
        body: "Women are more at risk of osteoporosis than men, especially if the menopause starts before 45. Men, younger women and children can get it too.",
        sources: [NHS.osteoporosis],
      },
      {
        title: "Urine infections",
        body: "The urethra is the tube that carries urine out of the body. Women have a shorter one than men, so bacteria are more likely to reach the bladder or kidneys and cause an infection.",
        sources: [NHS.uti],
      },
    ],
  },
  {
    id: "symptoms",
    heading: "How symptoms can show up differently",
    intro:
      "The same condition does not always look the same in everyone. The UK Government's women's health strategy says not enough is known about how conditions that affect everyone — including heart disease, dementia and mental health conditions — affect women differently.",
    points: [
      {
        title: "Autism",
        body: "The NHS says signs of autism can be harder to see in women, because of masking — not showing the signs. The women's health strategy says autism is under-recognised in girls.",
        sources: [NHS.autism, STRATEGY],
      },
      {
        title: "Periods that are not “normal”",
        body: "Women told the government they were often told heavy or painful periods were normal, or that they would grow out of them. Many said they waited years for a diagnosis of a condition such as endometriosis.",
        sources: [STRATEGY],
      },
      {
        title: "Not being listened to",
        body: "Feeling unheard by health services was one of the things women raised most often when the government asked about their experience. Research into how GPs listen to women about period and gynaecological symptoms has been commissioned because of it.",
        sources: [STRATEGY],
      },
    ],
  },
  {
    id: "treatment",
    heading: "Why treatment can differ",
    intro:
      "This part is about how medicines are studied and prescribed. It is not advice about any medicine, and nothing here is a reason to start, stop or change one.",
    points: [
      {
        title: "Who medicines were tested on",
        body: "Women have been under-represented in important clinical trials. Pregnant women and women from ethnic minorities have been even less likely to be included. That leaves gaps in what is known about how some treatments affect women.",
        sources: [STRATEGY],
      },
      {
        title: "Pregnancy and breastfeeding",
        body: "The NHS says to check with a pharmacist, midwife or GP before taking any medicine in pregnancy, including painkillers. It also says never to stop a prescribed medicine without checking with your doctor first.",
        sources: [NHS.pregnancyMedicines],
      },
      {
        title: "Medicines and planning a pregnancy",
        body: "Some epilepsy medicines can harm a baby if they are taken in pregnancy. The NHS says anyone taking them who could get pregnant should talk to a specialist about their treatment, and should not stop taking it on their own.",
        sources: [NHS.epilepsy],
      },
      {
        title: "Hormone treatment",
        body: "Hormone replacement therapy, or HRT, is a treatment for menopause symptoms. The NHS page explains the types, and what is known about its benefits and risks. Whether it suits someone is a decision for them and their GP.",
        sources: [NHS.hrt],
      },
      {
        title: "Counting women in research",
        body: "The government has asked that publicly funded health research records how many women and men took part, so that results can be looked at separately for each.",
        sources: [STRATEGY],
      },
    ],
  },
];

/** Every distinct source the page draws on, in first-use order. */
export function womensHealthSources(): Source[] {
  const seen = new Map<string, Source>();
  for (const section of WOMENS_HEALTH_SECTIONS) {
    for (const point of section.points) {
      for (const source of point.sources) {
        if (!seen.has(source.href)) seen.set(source.href, source);
      }
    }
  }
  return [...seen.values()];
}
