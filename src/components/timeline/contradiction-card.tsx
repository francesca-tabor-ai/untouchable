import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Contradiction } from "@/lib/timeline/contradictions";
import { CONFIDENCE_LABELS, SOURCE_LABELS } from "@/lib/timeline/records";
import { formatDate } from "@/lib/tracking/dates";

/**
 * Two versions of the same thing, side by side, with a suggestion and no decision.
 *
 * Both sides are always shown, with their dates and where each came from. The suggestion
 * sits underneath as a sentence, never as a pre-selected option, because a pre-selected
 * option is a decision made by the form.
 *
 * There is a third button, and it matters: neither. Somebody who genuinely does not know
 * which version is right needs to be able to say so and leave both standing, rather than
 * picking one to make the card go away.
 */
export function ContradictionCard({
  contradiction,
  resolveAction,
}: {
  contradiction: Contradiction;
  /** Passed in rather than imported, so this component stays a plain render. */
  resolveAction: (formData: FormData) => Promise<void>;
}) {
  const [first, second] = contradiction.sides;

  return (
    <Card className="space-y-5">
      <div>
        <Badge tone="clay">Two entries disagree</Badge>
        <p className="mt-3 text-body text-ink">{contradiction.summary}</p>
      </div>

      <ul className="space-y-3">
        {contradiction.sides.map((side, index) => (
          <li
            key={`${side.recordId ?? side.field}-${index}`}
            className="rounded-card border border-line bg-cream-50 p-4"
          >
            <p className="text-body text-ink">{side.what}</p>
            <p className="mt-1 text-small text-muted">
              {formatDate(side.when)} · {SOURCE_LABELS[side.source]} ·{" "}
              {CONFIDENCE_LABELS[side.confidence]}
            </p>
          </li>
        ))}
      </ul>

      {contradiction.proposal ? (
        <p className="text-small text-ink-soft">{contradiction.proposal.because}</p>
      ) : (
        <p className="text-small text-ink-soft">
          Neither one is stronger evidence than the other, so this is yours to decide.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <KeepButton
          contradiction={contradiction}
          keepIndex={0}
          label={`Keep: ${short(first.what)}`}
          resolveAction={resolveAction}
        />
        <KeepButton
          contradiction={contradiction}
          keepIndex={1}
          label={`Keep: ${short(second.what)}`}
          resolveAction={resolveAction}
        />
      </div>

      <p className="text-small text-muted">
        Whichever you keep, the other one stays on your timeline marked as replaced. Nothing
        is deleted.
      </p>
    </Card>
  );
}

function KeepButton({
  contradiction,
  keepIndex,
  label,
  resolveAction,
}: {
  contradiction: Contradiction;
  keepIndex: 0 | 1;
  label: string;
  resolveAction: (formData: FormData) => Promise<void>;
}) {
  const keep = contradiction.sides[keepIndex];
  const drop = contradiction.sides[keepIndex === 0 ? 1 : 0];

  // A side that is a field on the symptom rather than a record cannot be superseded as a
  // row. Those are edited on the symptom itself, so the button points there instead.
  if (drop.recordId === null) {
    return (
      <Button asChild variant="secondary" size="sm">
        <Link href="/timeline#symptoms">{label}</Link>
      </Button>
    );
  }

  return (
    <form action={resolveAction}>
      <input type="hidden" name="field" value={drop.field === "event" ? "event" : "observation"} />
      <input type="hidden" name="supersedeId" value={drop.recordId} />
      <input type="hidden" name="keepId" value={keep.recordId ?? ""} />
      <input
        type="hidden"
        name="reason"
        value={contradiction.proposal?.because ?? "You chose this version."}
      />
      <Button type="submit" variant="secondary" size="sm">
        {label}
      </Button>
    </form>
  );
}

function short(text: string, max = 44): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}
