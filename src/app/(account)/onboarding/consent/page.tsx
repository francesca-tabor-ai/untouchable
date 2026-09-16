import type { Metadata } from "next";

import { ConsentForm } from "@/components/consent/consent-form";
import { StepHeader } from "@/components/onboarding/step-header";
import { Callout } from "@/components/ui/callout";
import { Container } from "@/components/ui/container";
import { requireAdult } from "@/lib/auth/guards";
import {
  CONSENT_CHANGE_NOTE,
  CONSENT_COPY,
  CONSENT_LEGAL_REVIEW_NOTE,
  CONSENT_TEXT_VERSION,
} from "@/lib/consent/text";
import { ONBOARDING_STEPS } from "@/lib/onboarding";
import { currentConsents } from "@/lib/profile/consent";

import { saveConsentAction } from "../actions";

export const metadata: Metadata = { title: "Your choices about your data" };

const POSITION = ONBOARDING_STEPS.findIndex((step) => step.key === "consent") + 1;

export default async function ConsentStepPage() {
  const user = await requireAdult("/onboarding/consent");
  const granted = await currentConsents(user.id);

  const choices = CONSENT_COPY.map((copy) => ({ ...copy, granted: granted[copy.purpose] }));

  return (
    <Container reading className="py-12 sm:py-16">
      <StepHeader
        position={POSITION}
        total={ONBOARDING_STEPS.length}
        title="Your choices about your data"
        lead="Five separate questions. Answer each one however you want to — saying no to any of them costs you nothing, and there is no answer here we would rather you gave."
      />

      <Callout tone="warm" className="mt-8" title="This wording has not been through a lawyer yet">
        <p>{CONSENT_LEGAL_REVIEW_NOTE}</p>
      </Callout>

      <Callout tone="care" className="mt-4" title="You are not stuck with any of this">
        <p>{CONSENT_CHANGE_NOTE}</p>
      </Callout>

      <div className="mt-8">
        <ConsentForm choices={choices} action={saveConsentAction} />
      </div>

      <p className="mt-8 text-legal text-muted">
        Wording version {CONSENT_TEXT_VERSION}. We store which version you saw alongside each answer,
        so we can always show you exactly what you agreed to and when.
      </p>
    </Container>
  );
}
