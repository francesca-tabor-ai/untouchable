import type { MultiChoiceItem } from "@/lib/questionnaires/definition";
import { fieldName } from "@/lib/questionnaires/form";

import { OptionRow, QuestionGroup, questionId } from "./question-shell";

/** Tick as many as apply, within whatever bounds the version sets. */
export function MultiChoiceQuestion({
  item,
  value,
  error,
}: {
  item: MultiChoiceItem;
  value?: string[];
  error?: string;
}) {
  const id = questionId(item.key);
  const name = fieldName(item);
  const chosen = new Set(value ?? []);

  const bounds =
    item.max !== undefined
      ? `Tick up to ${item.max}.`
      : item.min !== undefined && item.min > 0
        ? `Tick at least ${item.min}.`
        : "Tick as many as apply.";

  return (
    <QuestionGroup
      id={id}
      label={item.label}
      help={item.help ? `${item.help} ${bounds}` : bounds}
      required={item.required}
      error={error}
    >
      <div className="divide-y divide-line">
        {item.options.map((option) => (
          <OptionRow
            key={option.value}
            type="checkbox"
            name={name}
            value={option.value}
            label={option.label}
            defaultChecked={chosen.has(option.value)}
          />
        ))}
      </div>
    </QuestionGroup>
  );
}
