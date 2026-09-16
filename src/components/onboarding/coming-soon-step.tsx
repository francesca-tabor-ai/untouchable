import Link from "next/link";

import { StepHeader } from "@/components/onboarding/step-header";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";

/**
 * A step that exists in the flow but is not built yet.
 *
 * It says so plainly rather than hiding the step or pretending it is finished. Somebody who
 * gets here has not done anything wrong, and skipping costs them nothing: the step stays on
 * the onboarding page as "coming soon" and they can do it when it arrives.
 */
export function ComingSoonStep({
  position,
  total,
  title,
  lead,
  whatItWillDo,
  skipHref,
}: {
  position: number;
  total: number;
  title: string;
  lead: string;
  whatItWillDo: string[];
  skipHref: string;
}) {
  return (
    <div className="space-y-8">
      <StepHeader position={position} total={total} title={title} lead={lead} />

      <Callout tone="care" title="This part is not ready yet">
        <p>
          We are still building it. Skip it for now — nothing is lost, and it will be waiting on
          your account page when it is ready.
        </p>
      </Callout>

      <section>
        <h2 className="text-title">What this step will ask you</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-ink-soft">
          {whatItWillDo.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href={skipHref}>Skip for now</Link>
        </Button>
        <Button asChild variant="secondary" size="lg">
          <Link href="/onboarding">Back to setting up</Link>
        </Button>
      </div>
    </div>
  );
}
