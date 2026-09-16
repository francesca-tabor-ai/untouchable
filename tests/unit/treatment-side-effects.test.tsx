// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { YellowCardNote } from "@/components/tracking/yellow-card-note";
import { ConsentPurpose } from "@/generated/prisma";
import { recordConsentDecisions } from "@/lib/profile/consent";
import { YELLOW_CARD_URL } from "@/lib/safety/constants";
import {
  reportSideEffect,
  sideEffectSchema,
  sideEffectsForCourse,
} from "@/lib/tracking/side-effects";
import { addTreatmentCourse, TrackingError, treatmentCourseSchema } from "@/lib/tracking/treatments";

import { makeUser, resetDatabase, testDb } from "../helpers/db";

/**
 * Brief 7.8: "After any logged side effect, show a link to the MHRA Yellow Card scheme."
 *
 * **The guarantee is the pairing**, so it is tested as one thing. The stamp on its own would
 * be a lie if the screen stopped rendering the link; the link on its own would leave no
 * record that we showed it. Asserting only one half would let a refactor break the other and
 * stay green — the same reasoning as DECISIONS.md D-015a.
 */

async function personWithCourse() {
  const user = await makeUser();
  await recordConsentDecisions(user.id, { [ConsentPurpose.core_tracking]: true });

  const course = await addTreatmentCourse(
    user.id,
    treatmentCourseSchema.parse({
      name: "Metformin",
      type: "rx",
      dose: "500mg",
      frequency: "Twice a day",
      route: "By mouth",
      startDate: "2026-03-02",
      adherenceRating: "",
    }),
  );

  return { user, course };
}

const REPORT = sideEffectSchema.parse({
  description: "Stomach upset for most of the first fortnight.",
  severity: "3",
});

describe("recording a side effect", () => {
  beforeEach(resetDatabase);
  afterAll(async () => {
    await testDb.$disconnect();
  });

  it("saves what happened and how bad it was", async () => {
    const { user, course } = await personWithCourse();
    await reportSideEffect(user.id, course.id, REPORT);

    const reports = await sideEffectsForCourse(user.id, course.id);
    expect(reports).toHaveLength(1);
    expect(reports[0].description).toBe("Stomach upset for most of the first fortnight.");
    expect(reports[0].severity).toBe(3);
  });

  it("records that the Yellow Card scheme was shown, in the same write", async () => {
    const { user, course } = await personWithCourse();
    const report = await reportSideEffect(user.id, course.id, REPORT);

    expect(report.yellowCardShownAt).toBeInstanceOf(Date);

    // There is no path that leaves this null: it is set by the create itself.
    const unstamped = await testDb.sideEffectReport.count({
      where: { yellowCardShownAt: null },
    });
    expect(unstamped).toBe(0);
  });

  it("shows the real MHRA link on the screen that receives the report", () => {
    const markup = renderToStaticMarkup(<YellowCardNote />);

    expect(YELLOW_CARD_URL).toBe("https://yellowcard.mhra.gov.uk");
    expect(markup).toContain(YELLOW_CARD_URL);
    expect(markup).toContain("Yellow Card");
    // Opened in a new tab, with no referrer handed to the MHRA and no window access back.
    expect(markup).toContain('rel="noopener noreferrer"');
  });

  it("says plainly that recording it here is not reporting it to the MHRA", () => {
    const markup = renderToStaticMarkup(<YellowCardNote />);
    expect(markup).toMatch(/does not go to anybody else/i);
  });

  it("asks nobody for money on a screen about a side effect", () => {
    const markup = renderToStaticMarkup(<YellowCardNote />);
    expect(markup).not.toMatch(/donate|donation|fundrais|gift aid|support us/i);
  });

  it("refuses a report against somebody else's treatment", async () => {
    const owner = await personWithCourse();
    const stranger = await makeUser();
    await recordConsentDecisions(stranger.id, { [ConsentPurpose.core_tracking]: true });

    await expect(
      reportSideEffect(stranger.id, owner.course.id, REPORT),
    ).rejects.toBeInstanceOf(TrackingError);

    expect(await testDb.sideEffectReport.count()).toBe(0);
  });

  it("needs a description and a severity from 1 to 5", () => {
    expect(sideEffectSchema.safeParse({ description: "  ", severity: "3" }).success).toBe(false);
    expect(sideEffectSchema.safeParse({ description: "A thing", severity: "" }).success).toBe(false);
    expect(sideEffectSchema.safeParse({ description: "A thing", severity: "6" }).success).toBe(false);
    expect(sideEffectSchema.safeParse({ description: "A thing", severity: "1" }).success).toBe(true);
  });
});
