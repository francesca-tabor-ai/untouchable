import type { LikertItem } from "@/lib/questionnaires/definition";
import { fieldName } from "@/lib/questionnaires/form";

import { OptionRow, QuestionGroup, questionId } from "./question-shell";

/**
 * A Likert scale: a short ordered list of worded answers, each carrying a number so the
 * questionnaire can score it. The person sees the words; only the scoring sees the number.
 */
export function LikertQuestion({
  item,
  value,
  error,
}: {
  item: LikertItem;
  value?: number;
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
            value={String(option.value)}
            label={option.label}
            defaultChecked={value === option.value}
          />
        ))}
      </div>
    </QuestionGroup>
  );
}
