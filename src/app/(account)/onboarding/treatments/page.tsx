import type { Metadata } from "next";

import { ComingSoonStep } from "@/components/onboarding/coming-soon-step";
import { Container } from "@/components/ui/container";
import { requireAdult } from "@/lib/auth/guards";
import { nextHrefAfter, ONBOARDING_STEPS } from "@/lib/onboarding";
import { requireTrackingConsent } from "@/lib/onboarding/require-consent";

export const metadata: Metadata = { title: "Treatments you are on now" };

const POSITION = ONBOARDING_STEPS.findIndex((step) => step.key === "treatments") + 1;

/** Placeholder until milestone 5 builds treatment logging. Contract in DECISIONS.md D-016. */
export default async function TreatmentsStepPage() {
  const user = await requireAdult("/onboarding/treatments");
  await requireTrackingConsent(user.id);

  return (
    <Container reading className="py-12 sm:py-16">
      <ComingSoonStep
        position={POSITION}
        total={ONBOARDING_STEPS.length}
        title="Treatments you are on now"
        lead="The medicines and other treatments you are having at the moment."
        whatItWillDo={[
          "The name of each treatment, the dose, how often you take it and how.",
          "The date it started, because everything later is measured from there.",
          "Whether you have stopped, and what led to that.",
        ]}
        skipHref={await nextHrefAfter(user.id, "treatments")}
      />
    </Container>
  );
}
