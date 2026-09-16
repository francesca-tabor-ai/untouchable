/**
 * Key moments are the short timeline on a story: diagnosis, treatment, living with it.
 *
 * They are stored as JSON on the story (`keyMomentsJson`) rather than as their own table,
 * because they are only ever read and written as a whole ordered list and never queried
 * across stories. This module is the only place that shape is understood.
 */

export interface KeyMoment {
  /** Short heading, e.g. "Diagnosis". */
  label: string;
  /** When it happened, in the person's own framing: "March 2019", "the following winter". */
  when: string;
  /** One or two sentences, in our own words. */
  body: string;
}

/** Read whatever is on the record and return only the moments that are usable. */
export function parseKeyMoments(value: unknown): KeyMoment[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const record = entry as Record<string, unknown>;
    const label = typeof record.label === "string" ? record.label.trim() : "";
    const when = typeof record.when === "string" ? record.when.trim() : "";
    const body = typeof record.body === "string" ? record.body.trim() : "";
    if (!label && !body) return [];
    return [{ label, when, body }];
  });
}

/**
 * Parse the admin textarea format. One moment per line:
 *
 *     Diagnosis | March 2019 | Found during a routine appointment.
 *
 * A plain textarea is used rather than a repeating field set because editors write these
 * in one pass, and a form that works without JavaScript is one fewer thing to break.
 */
export function parseKeyMomentsInput(input: string): KeyMoment[] {
  return input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label = "", when = "", ...rest] = line.split("|").map((part) => part.trim());
      return { label, when, body: rest.join(" | ").trim() };
    })
    .filter((moment) => moment.label.length > 0 || moment.body.length > 0);
}

/** Render key moments back into the textarea format, so an edit round-trips. */
export function formatKeyMomentsInput(moments: KeyMoment[]): string {
  return moments.map((moment) => [moment.label, moment.when, moment.body].join(" | ")).join("\n");
}
