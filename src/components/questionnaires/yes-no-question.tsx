import { fieldName } from "@/lib/questionnaires/form";

import { OptionRow, QuestionGroup, questionId } from "./question-shell";

/**
 * Yes or no.
 *
 * Two radios rather than one tick box: an unticked box cannot tell "no" apart from "I have
 * not answered this", and those are different things in somebody's health record.
 */
export function YesNoQuestion({
  item,
  value,
  error,
}: {
  item: { key: string; label: string; help?: string; required: boolean };
  value?: boolean;
  error?: string;
}) {
  const id = questionId(item.key);
  const name = fieldName(item);

  return (
    <QuestionGroup id={id} label={item.label} help={item.help} required={item.required} error={error}>
      <div className="divide-y divide-line">
        <OptionRow type="radio" name={name} value="true" label="Yes" defaultChecked={value === true} />
        <OptionRow type="radio" name={name} value="false" label="No" defaultChecked={value === false} />
      </div>
    </QuestionGroup>
  );
}
