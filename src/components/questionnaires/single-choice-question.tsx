import type { SingleChoiceItem } from "@/lib/questionnaires/definition";
import { fieldName } from "@/lib/questionnaires/form";

import { OptionRow, QuestionGroup, questionId } from "./question-shell";

/** One answer from a list. */
export function SingleChoiceQuestion({
  item,
  value,
  error,
}: {
  item: SingleChoiceItem;
  value?: string;
  error?: string;
}) {
  const id = questionId(item.key);
  const name = fieldName(item);

  return (
    <QuestionGroup id={id} label={item.label} help={item.help} required={item.required} error={error}>
      <div className="divide-y divide-line">
        {item.options.map((option) => (
          <OptionRow
            key={option.value}
            type="radio"
            name={name}
            value={option.value}
            label={option.label}
            defaultChecked={value === option.value}
          />
        ))}
      </div>
    </QuestionGroup>
  );
}
