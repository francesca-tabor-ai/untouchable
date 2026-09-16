import { Input } from "@/components/ui/field";
import { fieldName } from "@/lib/questionnaires/form";

import { describedBy, QuestionLabel, questionId } from "./question-shell";

/**
 * A date. `type="date"` opens the phone's own date picker and falls back to a plain text box
 * with a visible format hint where it is not supported.
 */
export function DateQuestion({
  item,
  value,
  error,
}: {
  item: { key: string; label: string; help?: string; required: boolean };
  value?: string;
  error?: string;
}) {
  const id = questionId(item.key);
  const help = item.help ?? "Day, month and year, for example 21 06 2026.";

  return (
    <QuestionLabel id={id} label={item.label} help={help} required={item.required} error={error}>
      <Input
        id={id}
        name={fieldName(item)}
        type="date"
        defaultValue={value ?? ""}
        aria-describedby={describedBy(id, help, error)}
        aria-invalid={error ? true : undefined}
        className="max-w-60"
      />
    </QuestionLabel>
  );
}
