import type { Item } from "./definition";
import type { RawAnswers } from "./answers";

/**
 * Turning a submitted form back into answers.
 *
 * The form is built from `itemsJson`, so it is read back from `itemsJson` too: one loop over
 * the same list, in the same order. Nothing here knows the name of any question.
 *
 * Every control is a native input with a real name, so this works identically whether the
 * form was posted by the browser with no JavaScript at all or by a server action.
 */

/** The `name` attribute for an item's control. One place, used by the form and the reader. */
export function fieldName(item: Pick<Item, "key">): string {
  return `answer-${item.key}`;
}

export function answersFromFormData(items: Item[], formData: FormData): RawAnswers {
  const answers: RawAnswers = {};

  for (const item of items) {
    const name = fieldName(item);

    if (item.type === "multi_choice") {
      const chosen = formData.getAll(name).filter((entry): entry is string => typeof entry === "string");
      if (chosen.length > 0) answers[item.key] = chosen;
      continue;
    }

    const value = formData.get(name);
    if (typeof value !== "string" || value.trim() === "") continue;
    answers[item.key] = value;
  }

  return answers;
}
