import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DefinitionSummary } from "@/components/questionnaires/questionnaire-preview";
import { VersionForm } from "@/components/questionnaires/version-form";
import { Badge } from "@/components/ui/badge";
import { Callout } from "@/components/ui/callout";
import { Container } from "@/components/ui/container";
import { requireEditor } from "@/lib/auth/guards";
import { formValuesFrom, listQuestionnaires, loadVersion, STARTER_VALUES } from "@/lib/questionnaires/admin";

import { addVersionAction } from "../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "A questionnaire",
  robots: { index: false, follow: false },
};

const dateFormat: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };

/**
 * One questionnaire: its versions, and the form for writing the next one.
 *
 * The new version starts as a copy of the most recent one, because that is what changing a
 * questionnaire usually means — one reworded question, not a fresh start.
 */
export default async function QuestionnairePage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ published?: string }>;
}) {
  await requireEditor();
  const { key } = await params;
  const { published } = await searchParams;

  const questionnaire = (await listQuestionnaires()).find((row) => row.key === key);
  if (!questionnaire) notFound();

  const newest = questionnaire.versions[0];
  const newestView = newest ? await loadVersion(newest.id).catch(() => null) : null;

  const startingValues = newestView
    ? formValuesFrom(newestView)
    : {
        key: questionnaire.key,
        title: questionnaire.title,
        licenceNote: questionnaire.licenceNote ?? "",
        ...STARTER_VALUES,
      };

  return (
    <Container className="py-12">
      <p className="text-small">
        <Link href="/admin/questionnaires" className="text-forest-600 underline underline-offset-4">
          Questionnaires
        </Link>
      </p>
      <h1 className="text-display mt-6">{questionnaire.title}</h1>
      <p className="text-muted mt-2 font-mono text-small">{questionnaire.key}</p>

      {published ? (
        <Callout tone="care" className="mt-6 max-w-[46rem]" title={`Version ${published} is published`}>
          <p>
            It can be answered now, and it can never be changed. A change means a new version.
          </p>
        </Callout>
      ) : null}

      <Callout className="mt-6 max-w-[46rem]" title="Licence note">
        <p>
          {questionnaire.licenceNote ??
            "None recorded. No version of this questionnaire can be published until there is one."}
        </p>
      </Callout>

      <h2 className="text-title mt-10">Versions</h2>
      <ul className="mt-4 space-y-4">
        {questionnaire.versions.map((version) => (
          <li key={version.id} className="rounded-card border border-line bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h3 className="text-body font-semibold">
                <Link
                  href={`/admin/questionnaires/${questionnaire.key}/versions/${version.id}`}
                  className="text-forest-700 underline underline-offset-4"
                >
                  Version {version.version}
                </Link>
              </h3>
              {version.publishedAt ? (
                <Badge tone="forest">
                  Published {version.publishedAt.toLocaleDateString("en-GB", dateFormat)}
                </Badge>
              ) : (
                <Badge>Draft</Badge>
              )}
            </div>
            <p className="text-muted mt-2 text-small">
              {version.responseCount} {version.responseCount === 1 ? "answer" : "answers"} recorded.
            </p>
            {version.definition ? (
              <div className="mt-4">
                <DefinitionSummary definition={version.definition} />
              </div>
            ) : (
              <p className="text-danger mt-2 text-small">
                This version cannot be read: {Object.values(version.problems ?? {}).join(" ")}
              </p>
            )}
          </li>
        ))}
      </ul>

      <h2 className="text-title mt-12">Write the next version</h2>
      <p className="text-ink-soft mt-2 max-w-[46rem]">
        This starts as a copy of version {newest?.version ?? 1} and is saved as a draft. Nothing that
        is already published changes.
      </p>
      <VersionForm
        action={addVersionAction}
        lockKey
        submitLabel="Create the next version as a draft"
        values={startingValues}
      />
    </Container>
  );
}
