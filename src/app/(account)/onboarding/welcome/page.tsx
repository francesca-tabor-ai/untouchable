import type { Metadata } from "next";

import { StepHeader } from "@/components/onboarding/step-header";
import { WelcomeForm } from "@/components/onboarding/welcome-form";
import { Callout } from "@/components/ui/callout";
import { Container } from "@/components/ui/container";
import { requireAdult } from "@/lib/auth/guards";
import { ONBOARDING_STEPS } from "@/lib/onboarding";
import { getProfile, latestYearOfBirth, REGIONS, SEX_OPTIONS } from "@/lib/profile";

import { saveWelcomeAction } from "../actions";

export const metadata: Metadata = { title: "Welcome" };

const POSITION = ONBOARDING_STEPS.findIndex((step) => step.key === "welcome") + 1;

export default async function WelcomeStepPage() {
  const user = await requireAdult("/onboarding/welcome");
  const profile = await getProfile(user.id);

  return (
    <Container reading className="py-12 sm:py-16">
      <StepHeader
        position={POSITION}
        total={ONBOARDING_STEPS.length}
        title="Welcome"
        lead="A few things about you, so the rest of this makes sense. Only the first one is needed."
      />

      <section className="mt-8 space-y-4 text-ink-soft">
        <h2 className="text-title text-ink">What happens next</h2>
        <p>
          We will ask what you may like us to do with your data, what you are living with, and what
          you want to keep an eye on. It takes a few minutes, and every answer can be changed later.
        </p>
        <p>
          UnTouchable records and shows you information. It does not diagnose anything, it does not
          recommend treatments, and it is not a substitute for your GP.
        </p>
      </section>

      <div className="mt-8">
        <WelcomeForm
          action={saveWelcomeAction}
          regions={REGIONS}
          sexOptions={SEX_OPTIONS}
          latestYearOfBirth={latestYearOfBirth()}
          initial={{
            displayName: profile?.displayName ?? "",
            yearOfBirth: profile?.yearOfBirth ?? null,
            sex: profile?.sex ?? null,
            region: profile?.region ?? null,
          }}
        />
      </div>

      <Callout className="mt-10" title="Why year, and not date of birth">
        <p>
          A year is enough to put you in an age band, which is all the research needs. A full date of
          birth is one of the most useful things a person can steal, so we do not hold one. The same
          goes for your address: a region is enough, a postcode is not something we will ask for.
        </p>
      </Callout>
    </Container>
  );
}
