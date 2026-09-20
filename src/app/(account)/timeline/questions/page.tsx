import type { Metadata } from "next";
import Link from "next/link";

import { MatrixTable } from "@/components/timeline/matrix-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Field, Input, Textarea } from "@/components/ui/field";
import { SelectInput } from "@/components/ui/select";
import { requireAdult } from "@/lib/auth/guards";
import { requireTrackingConsent } from "@/lib/onboarding/require-consent";
import { CANDIDATE_STATUS_LABELS, MATRIX_FIT_LABELS } from "@/lib/timeline/records";
import { loadTimeline, reviewTimeline } from "@/lib/timeline/queries";

import {
  addCandidateAction,
  reopenCandidateAction,
  ruleDownCandidateAction,
  setAssessmentAction,
} from "../actions";
import { CandidateForm } from "./candidate-form";

export const metadata: Metadata = { title: "Questions to ask" };

/**
 * The candidate matrix, and the list it comes from.
 *
 * This page exists on a decision recorded in DECISIONS.md PL-49. It sits against AGENTS.md
 * rule 9, and the boundary that makes it defensible is enforced in code rather than promised
 * in copy:
 *
 *   - Every possibility on this page was typed in by the person. Nothing here suggests one,
 *     and there is no list of conditions anywhere in this feature.
 *   - Nothing on this page is in the handover document. `handover.ts` will not render it,
 *     and `tests/unit/timeline-handover.test.ts` fails if it ever does.
 *
 * The page is named for what it is for. Somebody arriving at "Questions to ask" is preparing
 * for an appointment; somebody arriving at "Possible diagnoses" is doing something else.
 */
export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await requireAdult("/timeline/questions");
  await requireTrackingConsent(user.id);

  const { saved } = await searchParams;
  const timeline = await loadTimeline(user.id);
  const { matrix } = reviewTimeline(timeline);
  const symptoms = timeline.symptoms.filter((symptom) => symptom.active);

  return (
    <Container reading className="py-12 sm:py-16">
      <h1 className="text-display">Questions to ask</h1>
      <p className="mt-4 text-lead text-ink-soft">
        Somewhere to put the things you have been wondering about, so that they go into an
        appointment as questions rather than sitting in your head at two in the morning.
      </p>

      {saved ? (
        <p className="mt-6 text-small text-forest-700" role="status">
          Saved.
        </p>
      ) : null}

      <Callout tone="care" className="mt-8" title="Before you read the grid">
        <p>{matrix.framing}</p>
      </Callout>

      <section className="mt-14" aria-labelledby="grid">
        <h2 id="grid" className="text-title">
          How each symptom sits against each possibility
        </h2>
        <div className="mt-6">
          <MatrixTable matrix={matrix} />
        </div>
      </section>

      {matrix.columns.length > 0 && symptoms.length > 0 ? (
        <section className="mt-14" aria-labelledby="fill-in">
          <h2 id="fill-in" className="text-title">
            Fill in a square
          </h2>
          <p className="mt-2 text-small text-ink-soft">
            Only you can fill these in. Nothing here works any of it out for you.
          </p>

          <Card className="mt-6">
            <form action={setAssessmentAction} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Which symptom?" required>
                  {(props) => (
                    <SelectInput name="userSymptomId" {...props}>
                      {symptoms.map((symptom) => (
                        <option key={symptom.id} value={symptom.id}>
                          {symptom.name}
                        </option>
                      ))}
                    </SelectInput>
                  )}
                </Field>

                <Field label="Which possibility?" required>
                  {(props) => (
                    <SelectInput name="candidateId" {...props}>
                      {matrix.columns.map((column) => (
                        <option key={column.candidate.id} value={column.candidate.id}>
                          {column.candidate.name}
                        </option>
                      ))}
                    </SelectInput>
                  )}
                </Field>
              </div>

              <Field label="How does it sit?" required>
                {(props) => (
                  <SelectInput name="fit" defaultValue="not_yet_tested" {...props}>
                    {Object.entries(MATRIX_FIT_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </SelectInput>
                )}
              </Field>

              <Field label="Why?" hint="A few words, for you to read back later.">
                {(props) => <Input name="note" {...props} />}
              </Field>

              <Button type="submit">Save this square</Button>
            </form>
          </Card>
        </section>
      ) : null}

      <section className="mt-14" aria-labelledby="add-candidate">
        <h2 id="add-candidate" className="text-title">
          Add something you are wondering about
        </h2>
        <p className="mt-2 text-small text-ink-soft">
          Two things are needed, and they are what make it a question rather than a worry:
          something that would tell it apart from the others, and something that would settle
          it.
        </p>
        <Card className="mt-6">
          <CandidateForm action={addCandidateAction} />
        </Card>
      </section>

      {matrix.ruledDown.length > 0 ? (
        <section className="mt-14" aria-labelledby="ruled-down">
          <h2 id="ruled-down" className="text-title">
            Set aside
          </h2>
          <p className="mt-2 text-small text-ink-soft">
            Kept visible on purpose. Things get set aside on partial evidence and sometimes
            need coming back to.
          </p>
          <ul className="mt-6 space-y-4">
            {matrix.ruledDown.map((column) => (
              <li key={column.candidate.id}>
                <Card className="bg-cream-50">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-body font-medium text-ink">{column.candidate.name}</p>
                    <Badge tone="quiet">
                      {CANDIDATE_STATUS_LABELS[column.candidate.status]}
                    </Badge>
                  </div>
                  {column.candidate.excludedBy ? (
                    <p className="mt-2 text-small text-ink-soft">{column.candidate.excludedBy}</p>
                  ) : null}
                  <form action={reopenCandidateAction} className="mt-4">
                    <input type="hidden" name="candidateId" value={column.candidate.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      Put it back on the list
                    </Button>
                  </form>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {matrix.columns.length > 0 ? (
        <section className="mt-14" aria-labelledby="set-aside">
          <h2 id="set-aside" className="text-title">
            Set one aside
          </h2>
          <Card className="mt-6">
            <form action={ruleDownCandidateAction} className="space-y-5">
              <Field label="Which one?" required>
                {(props) => (
                  <SelectInput name="candidateId" {...props}>
                    {matrix.columns.map((column) => (
                      <option key={column.candidate.id} value={column.candidate.id}>
                        {column.candidate.name}
                      </option>
                    ))}
                  </SelectInput>
                )}
              </Field>

              <Field label="How firmly?" required>
                {(props) => (
                  <SelectInput name="status" defaultValue="ruled_down" {...props}>
                    <option value="ruled_down">Made less likely, not closed</option>
                    <option value="excluded">Ruled out</option>
                  </SelectInput>
                )}
              </Field>

              <Field
                label="What made you set it aside, and what would bring it back?"
                required
              >
                {(props) => (
                  <Textarea
                    name="excludedBy"
                    placeholder="Blood test in June came back normal. I would come back to it if the dizziness returned."
                    {...props}
                  />
                )}
              </Field>

              <Button type="submit" variant="secondary">
                Set aside
              </Button>
            </form>
          </Card>
        </section>
      ) : null}

      <Callout tone="neutral" className="mt-14" title="None of this goes to your doctor">
        <p>
          Your handover does not contain this grid, and it never will. Handing a clinician a
          list of what you think it might be tends to turn the appointment into a conversation
          about the list. What goes across instead is the questions — &ldquo;could this be X,
          and what would rule it out?&rdquo; — which is what you actually want answered.
        </p>
        <p className="mt-3">
          <Link href="/timeline/handover" className="underline underline-offset-2">
            See what does go across
          </Link>
        </p>
      </Callout>
    </Container>
  );
}
