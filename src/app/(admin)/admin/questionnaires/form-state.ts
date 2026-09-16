import type { AdminProblems, VersionFormValues } from "@/lib/questionnaires/admin";

/**
 * Shared shape for the questionnaire admin forms.
 *
 * Outside `actions.ts` on purpose: a `"use server"` module may only export async functions,
 * and a constant exported from one is a build error that names a page rather than this file
 * — AGENTS.md section 9.
 */
export interface QuestionnaireAdminState {
  status: "idle" | "error" | "saved";
  problems: AdminProblems;
  message?: string;
}

export const EMPTY_ADMIN_STATE: QuestionnaireAdminState = { status: "idle", problems: {} };

export const DEFINITION_FIELDS: {
  name: keyof Pick<VersionFormValues, "items" | "scoring" | "redFlags" | "schedule">;
  label: string;
  hint: string;
}[] = [
  {
    name: "items",
    label: "Questions",
    hint: "A list. Each one needs a key, a type and a label. Types: likert, scale_0_10, single_choice, multi_choice, yes_no, date, text.",
  },
  {
    name: "scoring",
    label: "Scoring",
    hint: 'How the score is worked out: { "method": "sum" | "mean" | "map" | "none", "items": [...] }. A mean can only be taken over questions answered with a number — use "map" to give worded answers numbers first.',
  },
  {
    name: "redFlags",
    label: "Red flag rules",
    hint: "A list of { key, itemKey, operator, value, message }. These offer somebody support. They are never a diagnosis, and no rule may watch a free-text question.",
  },
  {
    name: "schedule",
    label: "Schedule",
    hint: '{ "baseline": true } marks the questions asked during onboarding. afterTreatmentDays, thenEveryDays and generalEveryDays are read by the check-in scheduler.',
  },
];
