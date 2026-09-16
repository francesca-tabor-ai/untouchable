"use client";

import { ConsentDetails, type ConsentChoiceView } from "@/components/consent/consent-details";
import { CheckboxRow } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

/**
 * The five choices, each one on its own.
 *
 * Things this component must never grow: a "tick everything" control, a pre-ticked optional
 * box, wording that makes "no" sound like a mistake, or a visual weighting that makes yes
 * the easy answer and no the hard one. Each box starts where the person left it, and the
 * optional ones start off.
 *
 * The wording is passed in from the server rather than imported, so nothing from the
 * database layer reaches the browser bundle.
 */
export type { ConsentChoiceView };

export function ConsentChoices({
  choices,
  headingLevel = "h3",
}: {
  choices: ConsentChoiceView[];
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;

  return (
    <div className="space-y-5">
      {choices.map((choice) => (
        <Card key={choice.purpose} className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <Heading className="text-title">{choice.title}</Heading>
            {choice.required ? (
              <Badge tone="forest">Needed for tracking</Badge>
            ) : (
              <Badge>Optional</Badge>
            )}
          </div>

          <div className="mt-4">
            <ConsentDetails choice={choice} />
          </div>

          <div className="mt-5 border-t border-line pt-4">
            <CheckboxRow
              name={`consent-${choice.purpose}`}
              label={choice.label}
              defaultChecked={choice.granted}
            />
          </div>
        </Card>
      ))}
    </div>
  );
}
