import { Callout } from "@/components/ui/callout";
import { SUPPORT_CONTACTS } from "@/lib/safety/constants";

/**
 * Content note and support signposting, following the Samaritans media guidelines: the note
 * comes before the story so nobody is taken by surprise, the support comes after it, and
 * neither is behind a disclosure.
 *
 * There are no donation prompts on these surfaces and there never will be.
 */

export function ContentNote({ note }: { note: string }) {
  return (
    <Callout tone="warm" title="Before you read this" className="mt-8" data-testid="content-note">
      <p>{note}</p>
    </Callout>
  );
}

export function SupportSignposting({
  heading = "If this brings something up for you",
}: {
  heading?: string;
}) {
  return (
    <section
      aria-labelledby="support-heading"
      data-testid="support-signposting"
      className="mt-12 rounded-panel border border-forest-200 bg-forest-50 p-6"
    >
      <h2 id="support-heading" className="text-title">
        {heading}
      </h2>
      <p className="mt-2 text-ink-soft">
        You do not have to be in crisis to talk to someone. These are free, and they are there
        day and night.
      </p>
      <ul className="mt-5 space-y-4">
        {SUPPORT_CONTACTS.map((contact) => (
          <li key={contact.key}>
            <p className="font-semibold text-ink">
              {contact.name} —{" "}
              <a href={contact.href} className="text-forest-600 underline underline-offset-4">
                {contact.contact}
              </a>
            </p>
            <p className="text-small text-muted">{contact.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Brief 5.2: "Show a clear disclaimer on every public figure page." The exact sentence is
 * fixed, so it lives in one component and is used everywhere a named person appears.
 */
export function NoEndorsement({ name }: { name: string }) {
  return (
    <p data-testid="no-endorsement" className="mt-6 text-legal text-muted">
      {name} is not affiliated with and has not endorsed UnTouchable.
    </p>
  );
}
