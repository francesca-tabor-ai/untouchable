import type { RawDefinition } from "@/lib/questionnaires";

/**
 * Fixtures for the questionnaire engine.
 *
 * `SEEDED_WELLBEING` is a copy of the placeholder questionnaire in `prisma/seed/core.ts`.
 * It is copied rather than imported so these tests run against an empty database and still
 * fail loudly if the seeded shape and the engine's understanding of it drift apart.
 *
 * Nothing here is a validated instrument, and nothing here names a real person.
 */

export const SEEDED_WELLBEING: RawDefinition = {
  itemsJson: [
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
    { key: "sleep_quality", type: "scale_0_10", label: "How well have you been sleeping?", required: true, min: 0, max: 10 },
    { key: "mood", type: "scale_0_10", label: "How has your mood been?", required: true, min: 0, max: 10 },
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
  ],
  scoringJson: {
    method: "mean",
    items: ["overall_health", "daily_activities", "sleep_quality", "mood"],
    scale: { min: 0, max: 10 },
  },
  redFlagRulesJson: [
    {
      key: "not_coping",
      itemKey: "coping",
      operator: "equals",
      value: "not_coping",
      message: "You have said you are not coping at all.",
    },
    { key: "very_low_mood", itemKey: "mood", operator: "lte", value: 2, message: "You have recorded a very low mood." },
    {
      key: "very_poor_health",
      itemKey: "overall_health",
      operator: "lte",
      value: 1,
      message: "You have recorded your health as very poor.",
    },
  ],
  scheduleJson: {
    baseline: true,
    afterTreatmentDays: [14, 90, 180],
    thenEveryDays: 180,
    generalEveryDays: 28,
  },
};

/** Every item type the brief asks for, in one version, so the renderer and the validator meet all of them. */
export const EVERY_ITEM_TYPE: RawDefinition = {
  itemsJson: [
    {
      key: "effort",
      type: "likert",
      label: "How much effort has everyday life taken?",
      required: true,
      options: [
        { value: 1, label: "Hardly any" },
        { value: 2, label: "A little" },
        { value: 3, label: "A fair amount" },
        { value: 4, label: "A great deal" },
      ],
    },
    { key: "overall", type: "scale_0_10", label: "How have things been overall?", required: true, min: 0, max: 10 },
    {
      key: "who_helps",
      type: "single_choice",
      label: "Who has helped you most?",
      required: false,
      options: [
        { value: "family", label: "Family" },
        { value: "friends", label: "Friends" },
        { value: "nobody", label: "Nobody" },
      ],
    },
    {
      key: "changes",
      type: "multi_choice",
      label: "Has anything changed recently?",
      required: false,
      min: 0,
      max: 2,
      options: [
        { value: "sleep", label: "Sleep" },
        { value: "appetite", label: "Appetite" },
        { value: "work", label: "Work" },
      ],
    },
    { key: "seen_gp", type: "yes_no", label: "Have you seen your GP since the last check-in?", required: true },
    { key: "last_seen", type: "date", label: "When did you last see them?", required: false },
    { key: "notes", type: "text", label: "Anything else for your own record?", required: false, max: 40 },
  ],
  scoringJson: { method: "sum", items: ["effort", "overall"] },
  redFlagRulesJson: [
    { key: "nobody_helps", itemKey: "who_helps", operator: "equals", value: "nobody", message: "You have said nobody has been able to help." },
    { key: "someone_helps", itemKey: "who_helps", operator: "not_equals", value: "nobody", message: "You have said somebody has helped." },
    { key: "great_effort", itemKey: "effort", operator: "gte", value: 4, message: "You have said everyday life is taking a great deal of effort." },
    { key: "some_effort", itemKey: "effort", operator: "gt", value: 2, message: "You have recorded more than a little effort." },
    { key: "low_overall", itemKey: "overall", operator: "lt", value: 3, message: "You have recorded a low overall score." },
    { key: "very_low_overall", itemKey: "overall", operator: "lte", value: 1, message: "You have recorded a very low overall score." },
    { key: "sleep_changed", itemKey: "changes", operator: "includes", value: "sleep", message: "You have said your sleep has changed." },
    { key: "gp_answered", itemKey: "seen_gp", operator: "answered", message: "You have answered the question about your GP." },
    { key: "no_date", itemKey: "last_seen", operator: "not_answered", message: "You have not given a date." },
  ],
  scheduleJson: { baseline: false, afterTreatmentDays: [14], thenEveryDays: null, generalEveryDays: 28 },
};

/** A questionnaire whose score is a custom mapping from answers to numbers. */
export const MAPPED_SCORING: RawDefinition = {
  itemsJson: [
    {
      key: "coping",
      type: "single_choice",
      label: "How have you been coping?",
      required: true,
      options: [
        { value: "well", label: "Well" },
        { value: "mostly", label: "Most of the time" },
        { value: "struggling", label: "Struggling" },
        { value: "not_coping", label: "Not at all" },
      ],
    },
    { key: "rested", type: "yes_no", label: "Have you felt rested?", required: false },
  ],
  scoringJson: {
    method: "map",
    items: ["coping", "rested"],
    mapping: {
      coping: { well: 0, mostly: 1, struggling: 2, not_coping: 3 },
      rested: { true: 0, false: 1 },
    },
  },
  redFlagRulesJson: [],
  scheduleJson: {},
};
