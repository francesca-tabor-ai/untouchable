import type { SupportTopic } from "@/lib/safety/support-topics";

/**
 * Specialist support for what the page is about, shown alongside the crisis contacts rather
 * than instead of them. See `src/lib/safety/support-topics.ts` for why both are needed.
 */
export function TopicSupport({ topics }: { topics: readonly SupportTopic[] }) {
  if (topics.length === 0) return null;

  return (
    <>
      {topics.map((topic) => (
        <section
          key={topic.key}
          aria-labelledby={`support-${topic.key}`}
          className="rounded-card border border-forest-200 bg-forest-50 p-6"
        >
          <h2 id={`support-${topic.key}`} className="text-title">
            {topic.heading}
          </h2>
          <p className="mt-2 text-ink-soft">{topic.intro}</p>

          <ul className="mt-5 space-y-4">
            {topic.contacts.map((contact) => (
              <li key={contact.key}>
                <p className="font-semibold text-ink">
                  {contact.name} —{" "}
                  <a
                    href={contact.href}
                    className="underline underline-offset-2"
                    {...(contact.external
                      ? { rel: "noopener noreferrer", target: "_blank" }
                      : {})}
                  >
                    {contact.contact}
                  </a>
                  {contact.external ? <span className="sr-only"> (opens in a new tab)</span> : null}
                </p>
                <p className="text-small text-muted">{contact.detail}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
