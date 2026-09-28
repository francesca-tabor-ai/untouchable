"use client";

import * as React from "react";

import { eligibility, trials as searchTrials } from "@/app/(account)/research/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { SelectInput } from "@/components/ui/select";
import { ELIGIBILITY_UNAVAILABLE, TRIALS_NOTICE } from "@/lib/scout/copy";
import { bePartOfResearchUrl, PLACE_LABEL, type TrialPlace } from "@/lib/scout/trial-links";
import type { Trial } from "@/lib/scout/types";

/**
 * Studies that are recruiting, by condition and place. London by default, because that is
 * where the person this was first built for lives; they can widen it.
 *
 * The registry's own eligibility text is always on the screen. The plain-English version,
 * when asked for, sits beside it and is labelled as Claude's — it helps somebody read the
 * original and it never says whether they could take part.
 */
export function TrialsPanel({ claudeOn }: { claudeOn: boolean }) {
  const [condition, setCondition] = React.useState("");
  const [terms, setTerms] = React.useState("");
  const [place, setPlace] = React.useState<TrialPlace>("london");
  const [results, setResults] = React.useState<Trial[] | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const headingRef = React.useRef<HTMLHeadingElement>(null);

  const search = (event: React.FormEvent) => {
    event.preventDefault();
    if (condition.trim().length < 2) {
      setError("Type a condition, like tinnitus.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await searchTrials({ condition, terms: terms.trim() || undefined, place });
      setFailed(!result.ok);
      setResults(result.trials);
      headingRef.current?.focus();
    });
  };

  return (
    <div className="space-y-8">
      <Callout tone="care">
        <p>{TRIALS_NOTICE}</p>
      </Callout>

      <form onSubmit={search} className="grid max-w-3xl gap-5 sm:grid-cols-2" noValidate>
        <Field label="Condition" required error={error ?? undefined}>
          {(props) => <Input {...props} value={condition} onChange={(event) => setCondition(event.target.value)} placeholder="tinnitus" />}
        </Field>
        <Field label="Narrow it with" hint="Words that must appear too, like jaw or sleep.">
          {(props) => <Input {...props} value={terms} onChange={(event) => setTerms(event.target.value)} />}
        </Field>
        <Field label="Where">
          {(props) => (
            <SelectInput {...props} value={place} onChange={(event) => setPlace(event.target.value as TrialPlace)}>
              {(Object.keys(PLACE_LABEL) as TrialPlace[]).map((key) => (
                <option key={key} value={key}>
                  {PLACE_LABEL[key]}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <div className="flex items-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Searching…" : "Find studies"}
          </Button>
        </div>
      </form>

      <section aria-labelledby="trials-heading" aria-busy={pending}>
        {results ? (
          <>
            <h2 id="trials-heading" ref={headingRef} tabIndex={-1} className="text-title focus-visible:outline-none">
              {failed ? "ClinicalTrials.gov did not answer" : results.length === 0 ? "No recruiting studies found" : `${results.length} studies recruiting`}
            </h2>
            <p className="mt-2 text-small text-ink-soft">
              UK studies are also listed on the NIHR&rsquo;s{" "}
              <a
                href={bePartOfResearchUrl(condition, place)}
                rel="noreferrer"
                target="_blank"
                className="text-forest-600 underline underline-offset-2"
              >
                Be Part of Research
              </a>{" "}
              site, which we cannot search from here. The link opens their search for &ldquo;{condition}&rdquo;.
            </p>
            <ol className="mt-6 space-y-6">
              {results.map((trial) => (
                <li key={trial.id}>
                  <TrialCard trial={trial} claudeOn={claudeOn} />
                </li>
              ))}
            </ol>
          </>
        ) : (
          <h2 id="trials-heading" ref={headingRef} tabIndex={-1} className="sr-only">
            Studies will appear here
          </h2>
        )}
      </section>
    </div>
  );
}

function CriteriaList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="text-small font-semibold text-ink">{title}</p>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-small text-ink-soft">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function TrialCard({ trial, claudeOn }: { trial: Trial; claudeOn: boolean }) {
  const [plain, setPlain] = React.useState<string | null>(null);
  const [note, setNote] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const facts = [trial.eligibility.ages, trial.eligibility.sex, trial.eligibility.healthy_volunteers ? "Healthy volunteers welcome" : null].filter(Boolean);

  const explain = () => {
    startTransition(async () => {
      const result = await eligibility(trial.registry_id);
      if (result.ok) setPlain(result.plain);
      else setNote(ELIGIBILITY_UNAVAILABLE[result.reason] ?? ELIGIBILITY_UNAVAILABLE.unavailable);
    });
  };

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="forest">{trial.status}</Badge>
        <Badge>{trial.registry_id}</Badge>
      </div>
      <h3 className="mt-3 text-title">
        <a href={trial.url} rel="noreferrer" target="_blank" className="underline-offset-4 hover:underline">
          {trial.title}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </h3>
      {trial.locations.length > 0 ? <p className="mt-2 text-small text-muted">{trial.locations.join(" · ")}</p> : null}

      <details className="mt-4">
        <summary className="cursor-pointer text-small font-medium text-forest-700">Who can take part, in the registry&rsquo;s words</summary>
        {facts.length > 0 ? <p className="mt-3 text-small text-ink-soft">{facts.join(" · ")}</p> : null}
        <CriteriaList title="Who can take part" items={trial.eligibility.inclusion} />
        <CriteriaList title="Who cannot take part" items={trial.eligibility.exclusion} />
        <CriteriaList title="Other conditions" items={trial.eligibility.other} />
        {claudeOn && !plain ? (
          <Button type="button" variant="secondary" size="sm" className="mt-4" onClick={explain} disabled={pending}>
            {pending ? "Rewording…" : "Put this in plain English"}
          </Button>
        ) : null}
        {note ? <p className="mt-3 text-small text-ink-soft">{note}</p> : null}
        {plain ? (
          <div className="mt-4 rounded-field border border-forest-200 bg-forest-50 p-4">
            <p className="text-small font-semibold text-ink">Reworded by Claude</p>
            <p className="mt-1 text-small text-muted">To help you read the registry&rsquo;s text above, not to replace it. It does not say whether you can take part.</p>
            <div className="mt-3 space-y-2 text-small text-ink-soft">
              {plain.split(/\n+/).map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
          </div>
        ) : null}
      </details>

      <div className="mt-4 text-small">
        <p className="font-semibold text-ink">Contact, as listed by the study</p>
        {trial.contact_public.length > 0 ? (
          <ul className="mt-1 space-y-1 text-ink-soft">
            {trial.contact_public.slice(0, 4).map((contact) => (
              <li key={`${contact.name}-${contact.email}`}>
                {contact.name}
                {contact.email ? (
                  <>
                    {" · "}
                    <a href={`mailto:${contact.email}`} className="text-forest-600 underline underline-offset-2">
                      {contact.email}
                    </a>
                  </>
                ) : null}
                {contact.phone ? ` · ${contact.phone}` : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-ink-soft">No contact is listed. The registry page may say more.</p>
        )}
      </div>
    </Card>
  );
}
