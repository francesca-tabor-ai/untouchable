import { Callout } from "@/components/ui/callout";
import type { QuestionnaireDefinition } from "@/lib/questionnaires/definition";

import { Question } from "./question";

/**
 * What a version will look like to the person answering it, drawn with the same components
 * the real form uses. Nothing here submits anywhere: it is deliberately not a `<form>`.
 *
 * An admin sees exactly what they are about to publish before they publish it.
 */
export function QuestionnairePreview({ definition }: { definition: QuestionnaireDefinition }) {
  return (
    <div>
      <Callout title="This is a preview">
        <p>Nothing you do here is saved, and nobody has been shown these questions yet.</p>
      </Callout>
      <div className="mt-5 space-y-5">
        {definition.items.map((item) => (
          <Question key={item.key} item={item} />
        ))}
      </div>
    </div>
  );
}

/** The parts of a version that are not questions: how it is scored, watched and scheduled. */
export function DefinitionSummary({ definition }: { definition: QuestionnaireDefinition }) {
  const { scoring, redFlags, schedule } = definition;

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-body font-semibold text-ink">Scoring</h3>
        {scoring.method === "none" ? (
          <p className="mt-1 text-small text-ink-soft">No score is worked out for this version.</p>
        ) : (
          <p className="mt-1 text-small text-ink-soft">
            {scoring.method === "map"
              ? `Each answer is given a number, then ${scoring.aggregate === "mean" ? "averaged" : "added up"}`
              : scoring.method === "mean"
                ? "The average of"
                : "The total of"}
            : {scoring.items.join(", ")}.
            {scoring.scale ? ` Out of ${scoring.scale.min} to ${scoring.scale.max}.` : ""}
          </p>
        )}
      </section>

      <section>
        <h3 className="text-body font-semibold text-ink">Red flag rules</h3>
        {redFlags.length === 0 ? (
          <p className="mt-1 text-small text-ink-soft">None.</p>
        ) : (
          <ul className="mt-2 space-y-2 text-small text-ink-soft">
            {redFlags.map((rule) => (
              <li key={rule.key}>
                <span className="font-mono">
                  {rule.itemKey} {rule.operator}
                  {rule.value === undefined ? "" : ` ${String(rule.value)}`}
                </span>
                <span className="block">&ldquo;{rule.message}&rdquo;</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-legal text-muted">
          A rule offers somebody support. It is never a diagnosis, nobody is alerted, and nobody is
          contacted.
        </p>
      </section>

      <section>
        <h3 className="text-body font-semibold text-ink">Schedule</h3>
        <ul className="mt-1 space-y-1 text-small text-ink-soft">
          <li>{schedule.baseline ? "Asked at onboarding as the baseline." : "Not the baseline."}</li>
          <li>
            {schedule.afterTreatmentDays.length > 0
              ? `After a treatment starts: day ${schedule.afterTreatmentDays.join(", day ")}.`
              : "Not anchored to a treatment start date."}
          </li>
          <li>
            {schedule.thenEveryDays
              ? `Then every ${schedule.thenEveryDays} days.`
              : "Nothing repeating after that."}
          </li>
          <li>
            {schedule.generalEveryDays
              ? `General check-in every ${schedule.generalEveryDays} days.`
              : "No general check-in cycle."}
          </li>
        </ul>
      </section>
    </div>
  );
}
