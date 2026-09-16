import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Container } from "@/components/ui/container";
import { recordAudit, requireEditor } from "@/lib/auth/guards";
import { listQuestionnaires, questionnairesClaimingBaseline } from "@/lib/questionnaires/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Questionnaires",
  robots: { index: false, follow: false },
};

const dateFormat: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };

/**
 * Every questionnaire and every version of it.
 *
 * Questionnaires are data. Everything on this screen was written by somebody sitting here, not
 * by a developer, and a new one can be created and published without a deployment.
 */
export default async function AdminQuestionnairesPage() {
  const editor = await requireEditor();
  const [questionnaires, baselineKeys] = await Promise.all([
    listQuestionnaires(),
    questionnairesClaimingBaseline(),
  ]);
  await recordAudit(editor.id, "questionnaire.list", { count: questionnaires.length });

  return (
    <Container className="py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-display">Questionnaires</h1>
          <p className="text-ink-soft mt-2">
            {questionnaires.length} questionnaires. A version can be answered as soon as it is
            published, and never changes afterwards.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/admin/questionnaires/new">Create a questionnaire</Link>
        </Button>
      </div>

      <Callout tone="warm" className="mt-8 max-w-[46rem]" title="Licensing">
        <p>
          EQ-5D, PROMIS and other validated instruments carry licence terms. Loading one here
          without a licence is not allowed. Every questionnaire must carry a licence note before
          any version of it can be published, and publishing records who confirmed it.
        </p>
      </Callout>

      {baselineKeys.length > 1 ? (
        <Callout tone="warm" className="mt-6 max-w-[46rem]" title="More than one baseline">
          <p>
            {baselineKeys.join(", ")} all have a published version marked{" "}
            <span className="font-mono">baseline</span>. Only{" "}
            <span className="font-mono">{baselineKeys[0]}</span> is used for the onboarding step.
          </p>
        </Callout>
      ) : null}

      {questionnaires.length === 0 ? (
        <p className="text-ink-soft mt-10">
          There are no questionnaires yet.{" "}
          <Link href="/admin/questionnaires/new" className="text-forest-600 underline underline-offset-4">
            Create the first one
          </Link>
          .
        </p>
      ) : null}

      <div className="mt-10 space-y-8">
        {questionnaires.map((questionnaire) => (
          <section key={questionnaire.id} className="rounded-card border border-line bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-title">
                  <Link
                    href={`/admin/questionnaires/${questionnaire.key}`}
                    className="text-forest-700 underline underline-offset-4"
                  >
                    {questionnaire.title}
                  </Link>
                </h2>
                <p className="text-muted mt-1 font-mono text-small">{questionnaire.key}</p>
              </div>
              {questionnaire.licenceNote ? (
                <Badge tone="forest">Licence recorded</Badge>
              ) : (
                <Badge tone="clay">No licence note</Badge>
              )}
            </div>

            <div className="mt-5 overflow-x-auto">
            <table className="text-small w-full min-w-[26rem] border-collapse text-left">
              <caption className="sr-only">Versions of {questionnaire.title}</caption>
              <thead>
                <tr className="border-line-strong border-b">
                  <th scope="col" className="py-2 pr-4 font-semibold">Version</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">State</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Questions</th>
                  <th scope="col" className="py-2 font-semibold">Answers recorded</th>
                </tr>
              </thead>
              <tbody>
                {questionnaire.versions.map((version) => (
                  <tr key={version.id} className="border-line border-b align-top">
                    <th scope="row" className="py-3 pr-4 font-medium">
                      <Link
                        href={`/admin/questionnaires/${questionnaire.key}/versions/${version.id}`}
                        className="text-forest-700 underline underline-offset-4"
                      >
                        Version {version.version}
                      </Link>
                    </th>
                    <td className="py-3 pr-4">
                      {version.publishedAt ? (
                        <>
                          <Badge tone="forest">Published</Badge>
                          <span className="text-muted mt-1 block">
                            {version.publishedAt.toLocaleDateString("en-GB", dateFormat)}
                          </span>
                        </>
                      ) : (
                        <Badge>Draft</Badge>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {version.definition ? (
                        `${version.definition.items.length}`
                      ) : (
                        <span className="text-danger">Cannot be read</span>
                      )}
                    </td>
                    <td className="py-3">{version.responseCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </section>
        ))}
      </div>
    </Container>
  );
}
