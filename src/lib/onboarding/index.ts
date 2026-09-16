import { ONBOARDING_STEPS, type OnboardingStep } from "./steps";

export * from "./steps";

export interface OnboardingStepState {
  step: OnboardingStep;
  complete: boolean;
  /** Position in the flow, from 1. Shown as "Step 3 of 6". */
  position: number;
}

export interface OnboardingProgress {
  steps: OnboardingStepState[];
  /** Where "Continue" goes: the first built step that is not done yet. */
  nextHref: string | null;
  /** True once every built step is done. */
  finished: boolean;
  completedCount: number;
  readyCount: number;
}

/**
 * Where someone is up to, worked out from what they have actually saved.
 *
 * Deliberately one function that reads everything: onboarding is six small reads on a page
 * a person sees a handful of times, and a correct, obvious answer is worth more here than a
 * clever one.
 */
export async function onboardingProgress(userId: string): Promise<OnboardingProgress> {
  const steps: OnboardingStepState[] = await Promise.all(
    ONBOARDING_STEPS.map(async (step, index) => ({
      step,
      complete: await step.isComplete(userId),
      position: index + 1,
    })),
  );

  const ready = steps.filter((state) => state.step.status === "ready");
  const next = ready.find((state) => !state.complete);

  return {
    steps,
    nextHref: next?.step.href ?? null,
    finished: ready.every((state) => state.complete),
    completedCount: ready.filter((state) => state.complete).length,
    readyCount: ready.length,
  };
}

/**
 * Where to send someone once they have finished (or skipped) a step: the next thing in the
 * flow they have not done, or back to the onboarding page when there is nothing left.
 *
 * Steps that are not built yet are still walked through, so nobody reaches the end of
 * onboarding without being told those parts exist and are coming.
 */
export async function nextHrefAfter(userId: string, completedKey: string): Promise<string> {
  const progress = await onboardingProgress(userId);
  const index = ONBOARDING_STEPS.findIndex((step) => step.key === completedKey);

  const later = progress.steps.slice(index + 1).find((state) => !state.complete);
  if (later) return later.step.href;

  return progress.nextHref ?? "/onboarding";
}
