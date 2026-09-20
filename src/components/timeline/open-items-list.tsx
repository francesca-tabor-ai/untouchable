import { Card } from "@/components/ui/card";
import type { OpenItem } from "@/lib/timeline/open-items";

/**
 * The things this record does not actually know, worst first.
 *
 * Ordered by how much each one would change a clinical conversation, not by date and not by
 * when it was entered. Sorted by consequence, a list of unknowns stops being a list and
 * becomes a short set of errands: ring the surgery for the letter, find the packet in the
 * drawer. Each one done removes an [UNCONFIRMED] from the page somebody will read.
 */
export function OpenItemsList({ items }: { items: OpenItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-body text-muted">
        Nothing outstanding. Everything on your timeline has a date and a source.
      </p>
    );
  }

  return (
    <ol className="space-y-4">
      {items.map((item) => (
        <li key={item.key}>
          <Card className="bg-cream-50">
            <p className="text-body font-medium text-ink">{item.what}</p>
            <p className="mt-2 text-small text-ink-soft">{item.whyItMatters}</p>
            <p className="mt-2 text-small text-muted">
              <span className="font-medium">What would settle it:</span> {item.whatWouldSettleIt}
            </p>
          </Card>
        </li>
      ))}
    </ol>
  );
}
