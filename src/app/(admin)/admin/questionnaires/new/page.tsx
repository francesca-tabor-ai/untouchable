import type { Metadata } from "next";
import Link from "next/link";

import { VersionForm } from "@/components/questionnaires/version-form";
import { Callout } from "@/components/ui/callout";
import { Container } from "@/components/ui/container";
import { requireEditor } from "@/lib/auth/guards";
import { STARTER_VALUES } from "@/lib/questionnaires/admin";

import { createQuestionnaireAction } from "../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Create a questionnaire",
  robots: { index: false, follow: false },
};

export default async function NewQuestionnairePage() {
  await requireEditor();

  return (
    <Container className="py-12">
      <p className="text-small">
        <Link href="/admin/questionnaires" className="text-forest-600 underline underline-offset-4">
          Questionnaires
        </Link>
      </p>
      <h1 className="text-display mt-6">Create a questionnaire</h1>

      <Callout className="mt-6 max-w-[46rem]" title="Before you start">
        <p>
          This creates version 1 as a draft. Nobody is asked anything until you publish it, and
          once you do, that version can never be changed — a change is a new version.
        </p>
        <p className="mt-2">
          If this is a validated instrument, the licence has to be in place first. Write the terms
          into the licence note.
        </p>
      </Callout>

      <VersionForm
        action={createQuestionnaireAction}
        lockKey={false}
        submitLabel="Create the draft"
        values={{ key: "", title: "", licenceNote: "", ...STARTER_VALUES }}
      />
    </Container>
  );
}
