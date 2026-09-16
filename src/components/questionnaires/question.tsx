import type { Item } from "@/lib/questionnaires/definition";
import type { AnswerValue } from "@/lib/questionnaires/answers";

import { DateQuestion } from "./date-question";
import { LikertQuestion } from "./likert-question";
import { MultiChoiceQuestion } from "./multi-choice-question";
import { ScaleQuestion } from "./scale-question";
import { SingleChoiceQuestion } from "./single-choice-question";
import { TextQuestion } from "./text-question";
import { YesNoQuestion } from "./yes-no-question";

/**
 * One question, drawn from `itemsJson`.
 *
 * The only thing in the renderer that knows all seven item types. Adding a type means adding
 * a component and one line here — nothing else in the product changes, and no questionnaire
 * is named anywhere.
 */
export function Question({
  item,
  value,
  error,
}: {
  item: Item;
  value?: AnswerValue;
  error?: string;
}) {
  switch (item.type) {
    case "scale_0_10":
      return <ScaleQuestion item={item} value={asNumber(value)} error={error} />;
    case "likert":
      return <LikertQuestion item={item} value={asNumber(value)} error={error} />;
    case "single_choice":
      return <SingleChoiceQuestion item={item} value={asText(value)} error={error} />;
    case "multi_choice":
      return <MultiChoiceQuestion item={item} value={asList(value)} error={error} />;
    case "yes_no":
      return <YesNoQuestion item={item} value={typeof value === "boolean" ? value : undefined} error={error} />;
    case "date":
      return <DateQuestion item={item} value={asText(value)} error={error} />;
    case "text":
      return <TextQuestion item={item} value={asText(value)} error={error} />;
  }
}

const asNumber = (value?: AnswerValue) => (typeof value === "number" ? value : undefined);
const asText = (value?: AnswerValue) => (typeof value === "string" ? value : undefined);
const asList = (value?: AnswerValue) => (Array.isArray(value) ? value : undefined);
