import type { Metadata } from "next";

import { FoodAdvisor } from "@/components/food/food-advisor";
import { Container } from "@/components/ui/container";
import { requireAdult } from "@/lib/auth/guards";
import { WHAT_THIS_IS } from "@/lib/food/sources";

export const metadata: Metadata = { title: "Food Advisor" };

/**
 * The Food Advisor.
 *
 * This feature exists by an explicit platform-lead decision to carve it out of AGENTS.md
 * rule 9, which otherwise forbids the platform interpreting anything about a person's
 * health. The carve-out is recorded in DECISIONS.md FA-01 and it is narrow: this screen may
 * translate a condition into food rules and turn a menu into questions. It may not tell
 * anybody that a dish is all right for them, count a calorie, or read a reaction log back
 * as a cause. Those three are held by detectors in `src/lib/food/language.ts` and scanned
 * across every file in the feature by `tests/unit/food-language.test.ts`.
 *
 * The profile is held in the browser and never reaches the server, so there is no schema
 * change behind this and no special category data added to the account. The guard still runs
 * here, every time: a client component holding the data is not a permission check.
 */
export default async function FoodPage() {
  await requireAdult("/food");

  return (
    <Container reading className="py-12 sm:py-16">
      <h1 className="text-display">Food Advisor</h1>
      <p className="mt-4 text-lead text-ink-soft">{WHAT_THIS_IS}</p>

      <div className="mt-10">
        <FoodAdvisor />
      </div>
    </Container>
  );
}
