import { cn } from "@/lib/cn";
import { type Tier, TIER_LABEL } from "@/lib/food/profile";

/**
 * Three tiers, rendered so they can never be mistaken for each other.
 *
 * An anaphylaxis risk and a dislike of coriander must not arrive in the same list with the
 * same styling, because a person scanning a screen reads the shape before the words. So the
 * tiers differ in border weight, ground, heading and wording — and every one of them also
 * carries its label as text, because meaning that lives only in a colour is not meaning
 * at all for a good number of the people reading this.
 *
 * The design system has no alarm red and that is deliberate — nothing here should frighten
 * somebody who is already frightened. Tier 1 gets its emphasis from weight and from being
 * first, not from shouting.
 */

const TIER_SURFACE: Record<Tier, string> = {
  1: "border-2 border-forest-800 bg-white",
  2: "border border-clay-200 bg-clay-100",
  3: "border border-line bg-cream-50",
};

const TIER_HEADING: Record<Tier, string> = {
  1: "text-forest-900",
  2: "text-clay-700",
  3: "text-ink-soft",
};

export function TierSection({
  tier,
  heading,
  children,
  className,
}: {
  tier: Tier;
  heading?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-card p-5", TIER_SURFACE[tier], className)}>
      <h3 className={cn("text-title", TIER_HEADING[tier])}>{heading ?? TIER_LABEL[tier]}</h3>
      <div className="mt-3 text-small text-ink-soft">{children}</div>
    </section>
  );
}

/** The tier as words, for a row inside a list where a whole section would be too much. */
export function TierLabel({ tier }: { tier: Tier }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill px-3 py-1 text-legal font-medium",
        tier === 1 && "bg-forest-800 text-white",
        tier === 2 && "bg-clay-100 text-clay-700",
        tier === 3 && "bg-cream-200 text-ink-soft",
      )}
    >
      {TIER_LABEL[tier]}
    </span>
  );
}
