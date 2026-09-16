import { Textarea } from "@/components/ui/field";
import type { TextItem } from "@/lib/questionnaires/definition";
import { fieldName } from "@/lib/questionnaires/form";

import { describedBy, QuestionLabel, questionId } from "./question-shell";

/**
 * Something written in the person's own words.
 *
 * Free text is only ever shown back to the person who wrote it, and never leaves the system
 * in a research export (AGENTS.md rule 7). The screen says so, because somebody deciding
 * whether to write down something difficult deserves to know where it goes.
 */
export function TextQuestion({
  item,
  value,
  error,
}: {
  item: TextItem;
  value?: string;
  error?: string;
}) {
  const id = questionId(item.key);
  const help = item.help ?? "Only you will ever see this. It is never included in research.";

  return (
    <QuestionLabel id={id} label={item.label} help={help} required={item.required} error={error}>
      <Textarea
        id={id}
        name={fieldName(item)}
        defaultValue={value ?? ""}
        maxLength={item.max}
        rows={4}
        aria-describedby={describedBy(id, help, error)}
        aria-invalid={error ? true : undefined}
      />
    </QuestionLabel>
  );
}
