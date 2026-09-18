import { PrismaClient } from "../../src/generated/prisma";

/**
 * Foundation seed data: conditions, symptoms, interventions and the placeholder
 * questionnaire. Owned by the platform lead — feature seeds live in their own files and are
 * called from index.ts.
 *
 * Launch conditions are one acute treatment journey, one long-term metabolic condition and
 * one mental health condition, so the sensitive-topic path is exercised by real content
 * rather than stubbed (DECISIONS.md D-004).
 */
export async function seedCore(db: PrismaClient) {
  const conditions = await Promise.all(
    [
      {
        name: "Breast cancer",
        slug: "breast-cancer",
        snomedCode: "254837009",
        isSensitiveTopic: false,
        summary:
          "Breast cancer is the most common cancer in the UK. It is usually treated with some combination of surgery, radiotherapy, chemotherapy and hormone therapy, and most people diagnosed with it are alive ten years later. Treatment is long, and the effects of it often carry on well after it finishes.",
      },
      {
        name: "Type 2 diabetes",
        slug: "type-2-diabetes",
        snomedCode: "44054006",
        isSensitiveTopic: false,
        summary:
          "In type 2 diabetes the body either does not make enough insulin or cannot use it properly, so the amount of sugar in the blood becomes too high. It is a long-term condition managed day to day, through some combination of food, movement, medicine and regular checks.",
      },
      {
        name: "Depression",
        slug: "depression",
        snomedCode: "35489007",
        isSensitiveTopic: true,
        summary:
          "Depression is more than feeling low for a few days. It can affect sleep, appetite, concentration and the ability to do ordinary things, and it can last for weeks or months. It is common, and it is treatable — usually with talking therapy, medication, or both.",
      },
    ].map((data) => db.condition.upsert({ where: { slug: data.slug }, update: data, create: data })),
  );

  const bySlug = Object.fromEntries(conditions.map((c) => [c.slug, c]));

  const symptoms: { name: string; slug: string; conditions: string[] }[] = [
    { name: "Fatigue", slug: "fatigue", conditions: ["breast-cancer", "type-2-diabetes", "depression", "encephalitis", "tinnitus", "hodgkin-lymphoma", "motor-neurone-disease", "multiple-sclerosis", "brain-tumour"] },
    { name: "Pain", slug: "pain", conditions: ["breast-cancer", "hodgkin-lymphoma", "multiple-sclerosis", "brain-tumour"] },
    { name: "Nausea", slug: "nausea", conditions: ["breast-cancer", "brain-tumour", "encephalitis", "hodgkin-lymphoma"] },
    { name: "Trouble sleeping", slug: "trouble-sleeping", conditions: ["breast-cancer", "type-2-diabetes", "depression", "encephalitis", "tinnitus", "hodgkin-lymphoma", "motor-neurone-disease", "multiple-sclerosis", "brain-tumour"] },
    { name: "Brain fog", slug: "brain-fog", conditions: ["breast-cancer", "depression", "encephalitis", "multiple-sclerosis", "brain-tumour", "hodgkin-lymphoma"] },
    { name: "Low mood", slug: "low-mood", conditions: ["depression", "breast-cancer", "encephalitis", "tinnitus", "hodgkin-lymphoma", "motor-neurone-disease", "multiple-sclerosis", "brain-tumour"] },
    { name: "Anxiety", slug: "anxiety", conditions: ["depression", "breast-cancer", "type-2-diabetes", "tinnitus", "encephalitis", "hodgkin-lymphoma", "motor-neurone-disease", "multiple-sclerosis", "brain-tumour"] },
    { name: "Loss of interest", slug: "loss-of-interest", conditions: ["depression"] },
    { name: "Thirst", slug: "thirst", conditions: ["type-2-diabetes"] },
    { name: "Blurred vision", slug: "blurred-vision", conditions: ["type-2-diabetes", "multiple-sclerosis", "brain-tumour"] },
    { name: "Numbness or tingling", slug: "numbness-feet", conditions: ["type-2-diabetes", "multiple-sclerosis"] },
    { name: "Hot flushes", slug: "hot-flushes", conditions: ["breast-cancer"] },
    { name: "Headaches", slug: "headaches", conditions: ["brain-tumour", "encephalitis", "multiple-sclerosis"] },
    { name: "Memory problems", slug: "memory-problems", conditions: ["encephalitis", "brain-tumour", "multiple-sclerosis"] },
    { name: "Ringing or noise in the ears", slug: "ringing-in-the-ears", conditions: ["tinnitus"] },
    { name: "Sensitivity to noise", slug: "sensitivity-to-noise", conditions: ["tinnitus", "encephalitis"] },
    { name: "Changes in taste or smell", slug: "changes-in-taste-or-smell", conditions: ["encephalitis"] },
    { name: "Seizures", slug: "seizures", conditions: ["brain-tumour", "encephalitis"] },
    { name: "Night sweats", slug: "night-sweats", conditions: ["hodgkin-lymphoma"] },
    { name: "Itchy skin", slug: "itchy-skin", conditions: ["hodgkin-lymphoma"] },
    { name: "Weight loss", slug: "weight-loss", conditions: ["hodgkin-lymphoma", "motor-neurone-disease"] },
    { name: "Muscle weakness", slug: "muscle-weakness", conditions: ["motor-neurone-disease", "multiple-sclerosis"] },
    { name: "Trouble swallowing", slug: "trouble-swallowing", conditions: ["motor-neurone-disease"] },
    { name: "Breathlessness", slug: "breathlessness", conditions: ["motor-neurone-disease", "hodgkin-lymphoma"] },
    { name: "Problems with balance", slug: "problems-with-balance", conditions: ["multiple-sclerosis", "brain-tumour"] },
  ];

  for (const symptom of symptoms) {
    // A symptom may name a condition that is not seeded here — conditions are also added by
    // editors. Skip those links rather than crashing the whole seed on a missing key.
    const record = await db.symptom.upsert({
      where: { slug: symptom.slug },
      update: { name: symptom.name },
      create: { name: symptom.name, slug: symptom.slug },
    });
    for (const conditionSlug of symptom.conditions) {
      const condition = bySlug[conditionSlug] ?? (await db.condition.findUnique({ where: { slug: conditionSlug } }));
      if (!condition) continue;
      await db.symptomCondition.upsert({
        where: { symptomId_conditionId: { symptomId: record.id, conditionId: condition.id } },
        update: {},
        create: { symptomId: record.id, conditionId: condition.id },
      });
    }
  }

  // A small sample lookup. A full dm+d import needs an NHS TRUD account and is a later task,
  // so dmdCode is left null rather than guessed.
  const interventions = [
    { name: "Tamoxifen", type: "rx" as const },
    { name: "Letrozole", type: "rx" as const },
    { name: "Metformin", type: "rx" as const },
    { name: "Gliclazide", type: "rx" as const },
    { name: "Sertraline", type: "rx" as const },
    { name: "Fluoxetine", type: "rx" as const },
    { name: "Paracetamol", type: "otc" as const },
    { name: "Vitamin D", type: "supplement" as const },
    { name: "Blood glucose monitor", type: "device" as const },
    { name: "Cognitive behavioural therapy", type: "non_drug" as const },
    { name: "Physiotherapy", type: "non_drug" as const },
    { name: "Structured exercise", type: "non_drug" as const },
    { name: "Mindfulness practice", type: "non_drug" as const },
  ];

  for (const intervention of interventions) {
    await db.intervention.upsert({
      where: { name_type: { name: intervention.name, type: intervention.type } },
      update: {},
      create: intervention,
    });
  }

  await seedWellbeingQuestionnaire(db);

  return { conditions: bySlug };
}

/**
 * A placeholder generic wellbeing questionnaire.
 *
 * Deliberately NOT a validated instrument. EQ-5D and PROMIS carry licence terms, so the
 * engine is built to load them later without code changes; nothing here should be mistaken
 * for a clinically validated measure, and the licence note says so.
 */
async function seedWellbeingQuestionnaire(db: PrismaClient) {
  const questionnaire = await db.questionnaire.upsert({
    where: { key: "general-wellbeing" },
    update: {},
    create: {
      key: "general-wellbeing",
      title: "How you have been getting on",
      licenceNote:
        "Placeholder written for UnTouchable. Not a validated clinical instrument and not comparable to one. Validated instruments (EQ-5D, PROMIS) carry licence terms and must be loaded through the questionnaire engine once licensed.",
    },
  });

  const items = [
    {
      key: "overall_health",
      type: "scale_0_10",
      label: "Overall, how has your health been over the last two weeks?",
      help: "0 is the worst it has been, 10 is the best it has been.",
      required: true,
      min: 0,
      max: 10,
    },
    {
      key: "daily_activities",
      type: "scale_0_10",
      label: "How easy has it been to do your usual daily activities?",
      help: "0 is not at all, 10 is completely as usual.",
      required: true,
      min: 0,
      max: 10,
    },
    {
      key: "sleep_quality",
      type: "scale_0_10",
      label: "How well have you been sleeping?",
      required: true,
      min: 0,
      max: 10,
    },
    {
      key: "mood",
      type: "scale_0_10",
      label: "How has your mood been?",
      required: true,
      min: 0,
      max: 10,
    },
    {
      key: "coping",
      type: "single_choice",
      label: "How have you been coping in general?",
      required: true,
      options: [
        { value: "well", label: "I am coping well" },
        { value: "mostly", label: "I am coping most of the time" },
        { value: "struggling", label: "I am struggling" },
        { value: "not_coping", label: "I am not coping at all" },
      ],
    },
    {
      key: "anything_else",
      type: "text",
      label: "Is there anything else you want to note down for yourself?",
      help: "Only you will ever see this. It is never included in research.",
      required: false,
    },
  ];

  const scoring = {
    method: "mean",
    // Free text and the coping item are excluded: a mean over a Likert choice would be
    // arithmetic on a label, which is exactly the kind of false precision we avoid.
    items: ["overall_health", "daily_activities", "sleep_quality", "mood"],
    scale: { min: 0, max: 10 },
  };

  // Red flags are about getting someone support, never about diagnosis. They trigger the
  // signposting screen and nothing else — no alerts, no interpretation, no contact.
  const redFlags = [
    {
      key: "not_coping",
      itemKey: "coping",
      operator: "equals",
      value: "not_coping",
      message: "You have said you are not coping at all.",
    },
    {
      key: "very_low_mood",
      itemKey: "mood",
      operator: "lte",
      value: 2,
      message: "You have recorded a very low mood.",
    },
    {
      key: "very_poor_health",
      itemKey: "overall_health",
      operator: "lte",
      value: 1,
      message: "You have recorded your health as very poor.",
    },
  ];

  const schedule = {
    baseline: true,
    afterTreatmentDays: [14, 90, 180],
    thenEveryDays: 180,
    generalEveryDays: 28,
  };

  await db.questionnaireVersion.upsert({
    where: { questionnaireId_version: { questionnaireId: questionnaire.id, version: 1 } },
    update: {},
    create: {
      questionnaireId: questionnaire.id,
      version: 1,
      itemsJson: items,
      scoringJson: scoring,
      redFlagRulesJson: redFlags,
      scheduleJson: schedule,
      publishedAt: new Date(),
    },
  });
}
