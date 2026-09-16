import type { Metadata } from "next";

import { ComingSoonStep } from "@/components/onboarding/coming-soon-step";
import { Container } from "@/components/ui/container";
import { requireAdult } from "@/lib/auth/guards";
import { nextHrefAfter, ONBOARDING_STEPS } from "@/lib/onboarding";
import { requireTrackingConsent } from "@/lib/onboarding/require-consent";

export const metadata: Metadata = { title: "Your first check-in" };

const POSITION = ONBOARDING_STEPS.findIndex((step) => step.key === "baseline") + 1;

/** Placeholder until milestone 4 builds the questionnaire engine. Contract in DECISIONS.md D-016. */
export default async function BaselineStepPage() {
  const user = await requireAdult("/onboarding/baseline");
  await requireTrackingConsent(user.id);

  return (
    <Container reading className="py-12 sm:py-16">
      <ComingSoonStep
        position={POSITION}
        total={ONBOARDING_STEPS.length}
        title="Your first check-in"
        lead="A short set of questions about how things are for you right now. Everything you record later is compared against this, so it is worth doing when you have a quiet few minutes."
        whatItWillDo={[
          "A handful of questions about how you have been over the last two weeks.",
          "Sliders and simple choices — no writing unless you want to.",
          "Answers are kept against the exact version of the questions you were asked.",
        ]}
        skipHref={await nextHrefAfter(user.id, "baseline")}
      />
    </Container>
  );
}
