import type { Metadata } from "next";
import Link from "next/link";

import { TreatmentForm } from "@/components/tracking/treatment-form";
import { Callout } from "@/components/ui/callout";
import { Container } from "@/components/ui/container";
import { requireAdult } from "@/lib/auth/guards";
import { requireTrackingConsent } from "@/lib/onboarding/require-consent";
import { toDateInputValue, ukToday } from "@/lib/tracking/dates";
import { interventionOptions } from "@/lib/tracking/interventions";

import { addTreatmentAction } from "../actions";

export const metadata: Metadata = { title: "Add a treatment" };

export default async function NewTreatmentPage() {
  const user = await requireAdult("/treatments/new");
  await requireTrackingConsent(user.id);

  const options = await interventionOptions();
  const suggestions = [...new Set(options.map((option) => option.name))].sort((a, b) =>
    a.localeCompare(b),
  );

  return (
    <Container reading className="py-10 sm:py-16">
      <header>
        <h1 className="text-display">Add a treatment</h1>
        <p className="mt-4 text-lead text-ink-soft">
          Anything you are having: a prescription, something from the pharmacy, a supplement, a
          device, physiotherapy, talking therapy, exercise.
        </p>
      </header>

      <div className="mt-8">
        <TreatmentForm
          action={addTreatmentAction}
          values={{
            name: "",
            type: "",
            dose: "",
            frequency: "",
            route: "",
            startDate: toDateInputValue(ukToday()),
            adherenceRating: "",
          }}
          suggestions={suggestions}
          submitLabel="Add this treatment"
          legend="About this treatment"
        />
      </div>

      <Callout className="mt-10" title="If it is not in the suggestions">
        <p>
          Type it in anyway. The suggestions are a short sample list, not a limit — a real
          medicine cabinet will not match it, and yours does not have to.
        </p>
      </Callout>

      <p className="mt-8">
        <Link
          href="/treatments"
          className="text-small font-medium text-forest-600 underline underline-offset-2"
        >
          Back to your treatments
        </Link>
      </p>
    </Container>
  );
}
