import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PublishForm } from "@/components/questionnaires/publish-form";
import { DefinitionSummary, QuestionnairePreview } from "@/components/questionnaires/questionnaire-preview";
import { VersionForm } from "@/components/questionnaires/version-form";
import { Badge } from "@/components/ui/badge";
import { Callout } from "@/components/ui/callout";
import { Container } from "@/components/ui/container";
import { requireEditor } from "@/lib/auth/guards";
import { formValuesFrom, loadVersion } from "@/lib/questionnaires/admin";

import { publishVersionAction, saveVersionAction } from "../../../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "A questionnaire version",
  robots: { index: false, follow: false },
};

/**
 * One version: edit it while it is a draft, preview it, publish it.
 *
 * A published version has no form on this page at all. It is not disabled, it is not there:
 * the only way to change what a questionnaire asks is a new version, and the screen should
 * not suggest otherwise.
 */
export default async function VersionPage({
  params,
}: {
  params: Promise<{ key: string; versionId: string }>;
}) {
  await requireEditor();
  const { key, versionId } = await params;

  const version = await loadVersion(versionId).catch(() => null);
  if (!version || version.questionnaireKey !== key) notFound();

  const published = version.publishedAt !== null;

  return (
    <Container className="py-12">
      <p className="text-small">
        <Link
          href={`/admin/questionnaires/${key}`}
          className="text-forest-600 underline underline-offset-4"
        >
          {version.title}
        </Link>
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <h1 className="text-display">Version {version.version}</h1>
        {published ? <Badge tone="forest">Published</Badge> : <Badge>Draft</Badge>}
      </div>

      {published ? (
        <Callout tone="care" className="mt-6 max-w-[46rem]" title="This version is in use and cannot be changed">
          <p>
            People have been asked these exact questions, and their answers are stored against this
            version. Rewording one of them here would quietly change what their score means.
          </p>
          <p className="mt-2">
            To change anything,{" "}
            <Link href={`/admin/questionnaires/${key}`} className="underline underline-offset-2">
              write the next version
            </Link>
            .
          </p>
        </Callout>
      ) : null}

      <div className="mt-10 grid gap-12 lg:grid-cols-2">
        <div>
          <h2 className="text-title">What it asks</h2>
          <div className="mt-4">
            <QuestionnairePreview definition={version.definition} />
          </div>
        </div>
        <div>
          <h2 className="text-title">How it works</h2>
          <div className="mt-4">
            <DefinitionSummary definition={version.definition} />
          </div>

          <h2 className="text-title mt-10">Licence note</h2>
          <p className="text-ink-soft mt-2 text-small">
            {version.licenceNote ?? "None recorded."}
          </p>

          {!published ? (
            <>
              <h2 className="text-title mt-10">Publish</h2>
              <div className="mt-4">
                <PublishForm
                  action={publishVersionAction}
                  versionId={version.id}
                  version={version.version}
                />
              </div>
            </>
          ) : null}
        </div>
      </div>

      {!published ? (
        <>
          <h2 className="text-title mt-14">Edit this draft</h2>
          <VersionForm
            action={saveVersionAction}
            lockKey
            submitLabel="Save the draft"
            values={formValuesFrom(version)}
            hidden={{ versionId: version.id }}
          />
        </>
      ) : null}
    </Container>
  );
}
