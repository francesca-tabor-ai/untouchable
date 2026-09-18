import { Callout } from "@/components/ui/callout";
import { NOT_MEDICAL_ADVICE } from "@/lib/medicines/safety";
import {
  SUBSTANCE_SUPPORT_CONTACTS,
  SUBSTANCE_SUPPORT_COPY,
} from "@/lib/safety/substance-support";

/**
 * Content note and dependence signposting for medicine surfaces.
 *
 * Shaped after `src/components/stories/safety-blocks.tsx` on purpose: the note comes before
 * the reading, the support comes after it, and neither is behind a disclosure or a click.
 *
 * There are no donation prompts on these surfaces and there never will be.
 */

export function MedicineContentNote({ note }: { note: string }) {
  return (
    <Callout
      tone="warm"
      title="Before you read this"
      className="mt-8"
      data-testid="medicine-content-note"
    >
      <p>{note}</p>
    </Callout>
  );
}

/**
 * Where to get help with dependence.
 *
 * Separate from `SupportSignposting`, which carries the crisis numbers, because they answer
 * different questions. A page about a benzodiazepine can show both, and on a sensitive-topic
 * story it does.
 */
export function SubstanceSupport() {
  return (
    <section
      aria-labelledby="substance-support-heading"
      data-testid="substance-support"
      className="mt-12 rounded-panel border border-forest-200 bg-forest-50 p-6"
    >
      <h2 id="substance-support-heading" className="text-title">
        {SUBSTANCE_SUPPORT_COPY.heading}
      </h2>
      <p className="mt-2 text-ink-soft">{SUBSTANCE_SUPPORT_COPY.intro}</p>
      <ul className="mt-5 list-none space-y-4 p-0">
        {SUBSTANCE_SUPPORT_CONTACTS.map((contact) => (
          <li key={contact.key}>
            <p className="font-semibold text-ink">
              {contact.name} —{" "}
              <a
                href={contact.href}
                className="text-forest-600 underline underline-offset-4"
                {...(contact.external
                  ? { rel: "noopener noreferrer", target: "_blank" }
                  : {})}
              >
                {contact.contact}
                {contact.external ? (
                  <span className="text-muted"> (opens in a new tab)</span>
                ) : null}
              </a>
            </p>
            <p className="text-small text-muted">{contact.detail}</p>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-small text-muted">{SUBSTANCE_SUPPORT_COPY.clinical}</p>
    </section>
  );
}

/** The fixed "this is not medical advice" line. Same words on every medicine surface. */
export function NotMedicalAdvice() {
  return (
    <Callout tone="neutral" className="mt-8" data-testid="not-medical-advice">
      <p>{NOT_MEDICAL_ADVICE}</p>
    </Callout>
  );
}
