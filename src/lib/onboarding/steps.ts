import { hasProfileName } from "@/lib/profile";
import { canTrack } from "@/lib/profile/consent";
import { BASELINE_STEP_STATUS, hasCompletedBaseline } from "@/lib/questionnaires/onboarding-step";
import { TREATMENTS_STEP_STATUS, hasConfirmedTreatments } from "@/lib/tracking/onboarding-step";

import { hasChosenConditions } from "./conditions";
import { hasChosenSymptoms } from "./symptoms";

/**
 * The onboarding flow, as data.
 *
 * Brief 7.1: welcome → consent → conditions → symptoms → current treatments → baseline
 * assessment. Two of those six are built by later milestones, so they are registered here
 * with a placeholder screen rather than left out — a later team fills in the screen and
 * flips its own status constant, and nothing about the flow, the progress display or the
 * resume logic has to be rewritten.
 *
 * Each pending step's status and completeness live in the module owned by the team that
 * will finish it, so two teams finishing two steps never edit this file at all.
 *
 * Every step's completeness is derived from the data the step saves. Nothing is remembered
 * in a session or a cookie, which is what makes the flow resumable: close the tab, come
 * back next week on a different device, and you are where you left off.
 */
export interface OnboardingStep {
  key: string;
  title: string;
  href: string;
  /** One plain line under the title on the onboarding page. */
  summary: string;
  /**
   * `ready`       — built. Counts towards finishing onboarding.
   * `coming_soon` — registered, with a placeholder screen someone can skip. Does not block
   *                 finishing, and does not pretend to be done.
   */
  status: "ready" | "coming_soon";
  /**
   * Has this person finished this step? Reads the real data, never a flag.
   * Must be safe to call for a user who has done nothing at all.
   */
  isComplete(userId: string): Promise<boolean>;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    key: "welcome",
    title: "Welcome",
    href: "/onboarding/welcome",
    summary: "What this is, and what we should call you.",
    status: "ready",
    isComplete: hasProfileName,
  },
  {
    key: "consent",
    title: "Your choices about your data",
    href: "/onboarding/consent",
    summary: "Five separate questions. You decide each one, and you can change any of them later.",
    status: "ready",
    // Complete once tracking consent is actually held. If someone withdraws it later, this
    // step is honestly no longer done, and the tracking features close behind them.
    isComplete: canTrack,
  },
  {
    key: "conditions",
    title: "What you are living with",
    href: "/onboarding/conditions",
    summary: "Choose your conditions, and the year of diagnosis if you know it.",
    status: "ready",
    isComplete: hasChosenConditions,
  },
  {
    key: "symptoms",
    title: "What you want to keep an eye on",
    href: "/onboarding/symptoms",
    summary: "The symptoms your daily log will ask about.",
    status: "ready",
    isComplete: hasChosenSymptoms,
  },
  {
    key: "treatments",
    title: "Treatments you are on now",
    href: "/onboarding/treatments",
    summary: "Medicines and other treatments, with the date each one started.",
    status: TREATMENTS_STEP_STATUS,
    isComplete: hasConfirmedTreatments,
  },
  {
    key: "baseline",
    title: "Your first check-in",
    href: "/onboarding/baseline",
    summary: "A short set of questions that everything later is measured against.",
    status: BASELINE_STEP_STATUS,
    isComplete: hasCompletedBaseline,
  },
];

export function onboardingStep(key: string): OnboardingStep | undefined {
  return ONBOARDING_STEPS.find((step) => step.key === key);
}

/** The steps that are built, and so the ones that decide whether onboarding is finished. */
export const READY_STEPS = ONBOARDING_STEPS.filter((step) => step.status === "ready");
