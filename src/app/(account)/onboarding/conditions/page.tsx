import type { Metadata } from "next";

import { ConditionsForm } from "@/components/onboarding/conditions-form";
import { StepHeader } from "@/components/onboarding/step-header";
import { Callout } from "@/components/ui/callout";
import { Container } from "@/components/ui/container";
import { requireAdult } from "@/lib/auth/guards";
import { ONBOARDING_STEPS } from "@/lib/onboarding";
import { listConditions, userConditions } from "@/lib/onboarding/conditions";
import { requireTrackingConsent } from "@/lib/onboarding/require-consent";

import { saveConditionsAction } from "../actions";

export const metadata: Metadata = { title: "What you are living with" };

const POSITION = ONBOARDING_STEPS.findIndex((step) => step.key === "conditions") + 1;

export default async function ConditionsStepPage() {
  const user = await requireAdult("/onboarding/conditions");
  await requireTrackingConsent(user.id);

  const [conditions, chosen] = await Promise.all([listConditions(), userConditions(user.id)]);

  return (
    <Container reading className="py-12 sm:py-16">
      <StepHeader
        position={POSITION}
        total={ONBOARDING_STEPS.length}
        title="What you are living with"
        lead="Choose everything that applies. You can add or remove conditions at any time."
      />

      <div className="mt-8">
        <ConditionsForm
          action={saveConditionsAction}
          conditions={conditions}
          currentYear={new Date().getUTCFullYear()}
          initial={chosen.map((row) => ({
            conditionId: row.conditionId,
            diagnosedYear: row.diagnosedYear,
            selfReported: row.selfReported,
          }))}
        />
      </div>

      <Callout className="mt-10" title="Cannot see your condition?">
        <p>
          We have started with a small number of conditions so that the questions we ask about each
          one are actually right. More are coming. Nothing here is a diagnosis, and nothing you
          choose changes your care.
        </p>
      </Callout>
    </Container>
  );
}
