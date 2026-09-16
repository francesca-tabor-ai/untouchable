import type { ScaleItem } from "@/lib/questionnaires/definition";
import { fieldName } from "@/lib/questionnaires/form";

import { QuestionGroup, questionId } from "./question-shell";

/**
 * A 0–10 numeric scale (brief 7.3).
 *
 * Eleven real radio buttons rather than a slider. A slider needs JavaScript to be readable,
 * is miserable to land on exactly with a thumb, and gives a screen reader a number with no
 * meaning. Radios work before the script arrives, announce the question then the number, and
 * wrap onto two rows on a narrow phone instead of becoming unhittable.
 */
export function ScaleQuestion({
  item,
  value,
  error,
}: {
  item: ScaleItem;
  value?: number;
  error?: string;
}) {
  const id = questionId(item.key);
  const name = fieldName(item);
  const points = Array.from({ length: item.max - item.min + 1 }, (_, index) => item.min + index);

  return (
    <QuestionGroup id={id} label={item.label} help={item.help} required={item.required} error={error}>
      <div className="flex flex-wrap gap-x-1 gap-y-3">
        {points.map((point) => (
          <div key={point} className="flex w-11 flex-col items-center gap-1">
            <input
              id={`${id}-${point}`}
              type="radio"
              name={name}
              value={point}
              defaultChecked={value === point}
              className="h-5 w-5 accent-[var(--color-forest-800)]"
            />
            <label
              htmlFor={`${id}-${point}`}
              className="w-full cursor-pointer pb-1 text-center text-small text-ink"
            >
              {point}
            </label>
          </div>
        ))}
      </div>
    </QuestionGroup>
  );
}
