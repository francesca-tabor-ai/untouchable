import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import type { FlagResponse } from "@/lib/timeline/flag-response";

/**
 * What somebody sees when a red flag fires.
 *
 * This is the **entire** response. No timeline underneath it, no "entry saved", no
 * navigation back into the rest of the feature above the fold, no donation prompt anywhere
 * near it (AGENTS.md rule 5). A person who has just typed something frightening should not
 * have to read past a confirmation message to find the number.
 *
 * The design is quiet on purpose. No red, no siren, no capitals. Someone reading this is
 * already frightened, and shouting at them makes a person less able to act, not more. The
 * emphasis is structural — this is the only thing on the page.
 */
export function FlagScreen({
  response,
  entrySaved = true,
}: {
  response: FlagResponse;
  entrySaved?: boolean;
}) {
  return (
    <Container reading className="py-12 sm:py-16">
      <h1 className="text-display">{response.heading}</h1>

      <p className="mt-5 text-lead text-ink-soft">{response.noticed}</p>
      <p className="mt-4 text-lead text-ink">{response.action}</p>

      <div className="mt-8">
        <Button asChild size="lg" variant="dark">
          <a href={response.contact.href}>Call {response.contact.label}</a>
        </Button>
      </div>

      <p className="mt-8 text-small text-muted">{response.caveat}</p>

      {entrySaved ? (
        <p className="mt-4 text-small text-muted">
          What you wrote is saved. You do not need to do anything else with it now.
        </p>
      ) : null}

      <p className="mt-10 text-small">
        <Link href="/timeline" className="text-forest-600 underline underline-offset-4">
          Back to your timeline
        </Link>
      </p>
    </Container>
  );
}
