import type { Metadata } from "next";
import Link from "next/link";

import { StepHeader } from "@/components/onboarding/step-header";
import { SymptomsForm } from "@/components/onboarding/symptoms-form";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Container } from "@/components/ui/container";
import { requireAdult } from "@/lib/auth/guards";
import { ONBOARDING_STEPS } from "@/lib/onboarding";
import { requireTrackingConsent } from "@/lib/onboarding/require-consent";
import { activeSymptomIds, symptomsForUser } from "@/lib/onboarding/symptoms";

import { saveSymptomsAction } from "../actions";

export const metadata: Metadata = { title: "What you want to keep an eye on" };

const POSITION = ONBOARDING_STEPS.findIndex((step) => step.key === "symptoms") + 1;

export default async function SymptomsStepPage() {
  const user = await requireAdult("/onboarding/symptoms");
  await requireTrackingConsent(user.id);

  const [symptoms, chosen] = await Promise.all([
    symptomsForUser(user.id),
    activeSymptomIds(user.id),
  ]);

  if (symptoms.length === 0) {
    return (
      <Container reading className="py-12 sm:py-16">
        <StepHeader
          position={POSITION}
          total={ONBOARDING_STEPS.length}
          title="What you want to keep an eye on"
        />
        <Callout tone="care" className="mt-8" title="Choose a condition first">
          <p>The symptoms here come from the conditions you have chosen, so that step comes first.</p>
        </Callout>
        <div className="mt-6">
          <Button asChild size="lg">
            <Link href="/onboarding/conditions">Go to conditions</Link>
          </Button>
        </div>
      </Container>
    );
  }

  return (
    <Container reading className="py-12 sm:py-16">
      <StepHeader
        position={POSITION}
        total={ONBOARDING_STEPS.length}
        title="What you want to keep an eye on"
        lead="Your daily log is built from these, so pick the ones that matter to you rather than everything on the list. Most people choose three or four."
      />

      <div className="mt-8">
        <SymptomsForm action={saveSymptomsAction} symptoms={symptoms} initialIds={chosen} />
      </div>

      <Callout className="mt-10" title="You can change these whenever you like">
        <p>
          If you stop tracking a symptom, everything you have already recorded about it stays in
          your own record. It just stops appearing on the daily log.
        </p>
      </Callout>
    </Container>
  );
}
