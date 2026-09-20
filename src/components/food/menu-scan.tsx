"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Field } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import {
  analyseMenu,
  inBucket,
  parseMenuText,
  VERDICT_EXPLANATION,
  VERDICT_LABEL,
  type MenuAnalysis,
  type Verdict,
} from "@/lib/food/menu";
import { type ConditionProfile } from "@/lib/food/profile";
import { plentyIsAvailableNote } from "@/lib/food/scope-creep";
import { PHOTO_UNAVAILABLE_NOTICE, photoReadingAvailable } from "@/lib/food/vision";

import { TierLabel } from "./tier";

/**
 * The menu screen.
 *
 * Read the order of this page from the top, because it is the argument the whole feature
 * makes. The anaphylaxis reminder comes before any analysis, since somebody scrolling a list
 * of dishes will not scroll back up for it. Then how many dishes are worth asking about,
 * because that is usually the true headline and a tool that leads with warnings makes eating
 * frightening. Then the questions, which are the actual output. The dish lists come last.
 *
 * There are three buckets and there is no fourth. Nothing on this screen tells anybody that
 * a dish is all right for them.
 */

const BUCKET_ORDER: Verdict[] = ["worth-asking-about", "not-enough-information", "likely-a-problem"];

export function MenuScan({ profile }: { profile: ConditionProfile }) {
  const [text, setText] = React.useState("");
  const [analysis, setAnalysis] = React.useState<MenuAnalysis | null>(null);

  const run = () => {
    const parsed = parseMenuText(text);
    setAnalysis(parsed.dishes.length === 0 ? null : analyseMenu(parsed, profile));
  };

  return (
    <div className="space-y-8">
      <Field
        label="The menu"
        hint="One dish per line. Include the description under each one if there is a description — that is the part that does the work."
      >
        {(fieldProps) => (
          <textarea
            {...fieldProps}
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={8}
            placeholder={"Puttanesca — olives, capers, chilli, tomato\nRisotto primavera\nSeabass — new potatoes, samphire, beurre blanc"}
            className="w-full rounded-field border border-line bg-white p-3 text-body text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600"
          />
        )}
      </Field>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={run} disabled={text.trim().length === 0}>
          Work out what to ask
        </Button>
        {!photoReadingAvailable() ? (
          <p className="text-small text-muted">{PHOTO_UNAVAILABLE_NOTICE}</p>
        ) : null}
      </div>

      {analysis ? <MenuResult analysis={analysis} /> : null}
    </div>
  );
}

function MenuResult({ analysis }: { analysis: MenuAnalysis }) {
  const candidates = inBucket(analysis, "worth-asking-about").length;

  return (
    <div className="space-y-8">
      {analysis.speakToStaffFirst ? (
        <div className="rounded-card border-2 border-forest-800 bg-white p-5">
          <h3 className="text-title text-forest-900">Say this before you order</h3>
          <p className="mt-2 text-body text-ink">{analysis.speakToStaffFirst}</p>
        </div>
      ) : null}

      <p className="text-lead text-ink">{plentyIsAvailableNote(candidates, analysis.findings.length)}</p>

      {analysis.questions.length > 0 ? (
        <section aria-labelledby="questions-heading">
          <h3 id="questions-heading" className="text-title">
            Ask the kitchen
          </h3>
          <p className="mt-1 text-small text-muted">
            Worded to get an answer. A yes-or-no question about a whole dish gets a guess from
            whoever is nearest; a question about one ingredient or one pan gets an answer.
          </p>
          <ol className="mt-4 space-y-3">
            {analysis.questions.map((question) => (
              <li key={question} className="rounded-card border border-line bg-cream-50 p-4 text-body text-ink">
                {question}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {analysis.structuralNotes.length > 0 ? (
        <section aria-labelledby="kitchen-heading">
          <h3 id="kitchen-heading" className="text-title">
            How this kind of kitchen works
          </h3>
          <p className="mt-1 text-small text-muted">
            These are habits of the cuisine, not claims about what is in your dish.
          </p>
          <ul className="mt-4 space-y-3">
            {analysis.structuralNotes.map((note) => (
              <li key={note.note} className="text-small text-ink-soft">
                <span className="font-medium text-ink">{note.cuisine}. </span>
                {note.note}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {analysis.ambiguities.length > 0 ? (
        <section aria-labelledby="ambiguous-heading">
          <h3 id="ambiguous-heading" className="text-title">
            Words that mean more than one thing
          </h3>
          <ul className="mt-4 space-y-3">
            {analysis.ambiguities.map((item) => (
              <li key={item.name} className="text-small text-ink-soft">
                <span className="font-medium text-ink">{item.name}. </span>
                {item.note}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="space-y-6">
        {BUCKET_ORDER.map((verdict) => {
          const findings = inBucket(analysis, verdict);
          if (findings.length === 0) return null;
          return (
            <section
              key={verdict}
              aria-labelledby={`bucket-${verdict}`}
              className={cn(
                "rounded-card p-5",
                verdict === "likely-a-problem" ? "border-2 border-forest-800 bg-white" : "border border-line bg-cream-50",
              )}
            >
              <h3 id={`bucket-${verdict}`} className="text-title">
                {VERDICT_LABEL[verdict]}
              </h3>
              <p className="mt-1 text-small text-muted">{VERDICT_EXPLANATION[verdict]}</p>
              <ul className="mt-4 space-y-3">
                {findings.map((finding) => (
                  <li key={finding.dish} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-body text-ink">{finding.dish}</span>
                    {finding.tier ? <TierLabel tier={finding.tier} /> : null}
                    {finding.because.length > 0 ? (
                      <span className="text-small text-ink-soft">{finding.because.join(" ")}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <Callout tone="neutral" title="You are allowed to ask">
        <p>{analysis.yourRightToAsk}</p>
      </Callout>
    </div>
  );
}
