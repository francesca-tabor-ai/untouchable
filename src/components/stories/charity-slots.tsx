import { CharitiesForCondition } from "@/components/charities/charities-for-condition";
import { StoryCharities } from "@/components/charities/story-charities";

/**
 * Where the charity team's components meet the stories hub.
 *
 * `CharitiesForCondition` and `StoryCharities` are owned by the charity workstream. They are
 * wired in here, in one file, so that neither the story page nor the condition page has to
 * know anything about charities beyond "this is where they go" — and so that the one decision
 * the stories hub does make about them sits in a single place.
 *
 * **That decision is which variant, not whether.** On a surface that touches a sensitive
 * topic (`Condition.isSensitiveTopic`) the block renders as `variant="support"`: the charity
 * team drops the donate hand-off and the giving copy, and leads with helplines and support
 * services instead. A donation ask beside a content note about suicide is unacceptable —
 * but removing the charities altogether is worse, because on those pages the charities *are*
 * the signposting someone came for (brief 6.2). See DECISIONS.md D-015.
 *
 * The variant is not a substitute for the charity team's own `donationPromptAllowed` gate.
 * That still runs inside both components, before either of them renders anything.
 */

/** Sensitive surfaces show support, never an ask. */
function variantFor(sensitive: boolean): "support" | "default" {
  return sensitive ? "support" : "default";
}

export function StoryCharitiesSlot({
  storyId,
  sensitive,
}: {
  storyId: string;
  /** True when the story touches a sensitive topic — decided in `src/lib/stories/safety.ts`. */
  sensitive: boolean;
}) {
  return <StoryCharities storyId={storyId} variant={variantFor(sensitive)} />;
}

export function ConditionCharitiesSlot({
  conditionId,
  sensitive,
}: {
  conditionId: string;
  /** True for a condition marked `isSensitiveTopic`. */
  sensitive: boolean;
}) {
  return <CharitiesForCondition conditionId={conditionId} variant={variantFor(sensitive)} />;
}
