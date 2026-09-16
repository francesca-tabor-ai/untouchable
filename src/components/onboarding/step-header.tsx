import Link from "next/link";

/**
 * The top of every onboarding step. Says where you are in the flow, because a person who
 * cannot see how much is left assumes the worst, and says plainly that stopping is allowed.
 */
export function StepHeader({
  position,
  total,
  title,
  lead,
}: {
  position: number;
  total: number;
  title: string;
  lead?: string;
}) {
  return (
    <header>
      <p className="text-small font-medium text-clay-700">
        Step {position} of {total}
      </p>
      <h1 className="mt-2 text-display">{title}</h1>
      {lead ? <p className="mt-4 text-lead text-ink-soft">{lead}</p> : null}
      <p className="mt-4 text-small text-muted">
        Each step saves as you finish it. You can stop here and{" "}
        <Link href="/onboarding" className="text-forest-600 underline underline-offset-2">
          pick up where you left off
        </Link>{" "}
        another day.
      </p>
    </header>
  );
}
