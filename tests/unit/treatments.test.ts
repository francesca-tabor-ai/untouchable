// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { ConsentPurpose } from "@/generated/prisma";
import { recordConsentDecisions } from "@/lib/profile/consent";
import { toDateInputValue, ukToday } from "@/lib/tracking/dates";
import { findOrCreateIntervention } from "@/lib/tracking/interventions";
import {
  confirmTreatments,
  hasConfirmedTreatments,
  treatmentsConfirmedAt,
} from "@/lib/tracking/onboarding-step";
import {
  addTreatmentCourse,
  getTreatmentCourse,
  listTreatmentCourses,
  restartTreatmentCourse,
  stopTreatmentCourse,
  stopTreatmentSchema,
  TrackingError,
  treatmentCourseSchema,
  updateTreatmentCourse,
} from "@/lib/tracking/treatments";

import { makeUser, resetDatabase, testDb } from "../helpers/db";

/** Brief 7.6. Every treatment and every person here is invented. */

async function trackedPerson() {
  const user = await makeUser();
  await recordConsentDecisions(user.id, { [ConsentPurpose.core_tracking]: true });
  return user;
}

function courseForm(overrides: Record<string, string> = {}) {
  return treatmentCourseSchema.parse({
    name: "Metformin",
    type: "rx",
    dose: "500mg",
    frequency: "Twice a day",
    route: "By mouth",
    startDate: "2026-03-02",
    adherenceRating: "8",
    ...overrides,
  });
}

describe("adding, changing and stopping a treatment", () => {
  beforeEach(resetDatabase);
  afterAll(async () => {
    await testDb.$disconnect();
  });

  it("records a course with everything the brief asks for", async () => {
    const user = await trackedPerson();
    const course = await addTreatmentCourse(user.id, courseForm());

    expect(course.intervention.name).toBe("Metformin");
    expect(course.dose).toBe("500mg");
    expect(course.frequency).toBe("Twice a day");
    expect(course.route).toBe("By mouth");
    expect(toDateInputValue(course.startDate)).toBe("2026-03-02");
    expect(course.adherenceRating).toBe(8);
    expect(course.endDate).toBeNull();
    expect(course.stopReason).toBeNull();
  });

  it("changes a course without losing it", async () => {
    const user = await trackedPerson();
    const course = await addTreatmentCourse(user.id, courseForm());

    const changed = await updateTreatmentCourse(
      user.id,
      course.id,
      courseForm({ dose: "1000mg", frequency: "Once a day" }),
    );

    expect(changed.id).toBe(course.id);
    expect(changed.dose).toBe("1000mg");
    expect(changed.frequency).toBe("Once a day");
  });

  it("stops a course with a reason, and keeps the private note private to its author", async () => {
    const user = await trackedPerson();
    const course = await addTreatmentCourse(user.id, courseForm());

    const stopped = await stopTreatmentCourse(
      user.id,
      course.id,
      stopTreatmentSchema.parse({
        endDate: "2026-06-01",
        stopReason: "side_effects",
        stopReasonNote: "It was the mornings that did it.",
        adherenceRating: "5",
      }),
    );

    expect(toDateInputValue(stopped.endDate!)).toBe("2026-06-01");
    expect(stopped.stopReason).toBe("side_effects");
    expect(stopped.stopReasonNote).toBe("It was the mornings that did it.");
    expect(stopped.adherenceRating).toBe(5);

    const { current, stopped: stoppedList } = await listTreatmentCourses(user.id);
    expect(current).toHaveLength(0);
    expect(stoppedList).toHaveLength(1);
  });

  it("refuses an end date before the start date", async () => {
    const user = await trackedPerson();
    const course = await addTreatmentCourse(user.id, courseForm());

    await expect(
      stopTreatmentCourse(
        user.id,
        course.id,
        stopTreatmentSchema.parse({
          endDate: "2026-01-01",
          stopReason: "cost",
          stopReasonNote: "",
          adherenceRating: "",
        }),
      ),
    ).rejects.toBeInstanceOf(TrackingError);
  });

  it("lets somebody undo a stop rather than re-typing the course", async () => {
    const user = await trackedPerson();
    const course = await addTreatmentCourse(user.id, courseForm());
    await stopTreatmentCourse(
      user.id,
      course.id,
      stopTreatmentSchema.parse({
        endDate: "2026-06-01",
        stopReason: "not_working",
        stopReasonNote: "",
        adherenceRating: "",
      }),
    );

    const restarted = await restartTreatmentCourse(user.id, course.id);
    expect(restarted.endDate).toBeNull();
    expect(restarted.stopReason).toBeNull();
    expect(restarted.stopReasonNote).toBeNull();
  });

  it("never shows one person another person's treatment", async () => {
    const owner = await trackedPerson();
    const stranger = await trackedPerson();
    const course = await addTreatmentCourse(owner.id, courseForm());

    expect(await getTreatmentCourse(stranger.id, course.id)).toBeNull();
    await expect(
      updateTreatmentCourse(stranger.id, course.id, courseForm({ dose: "1g" })),
    ).rejects.toBeInstanceOf(TrackingError);
  });
});

describe("a treatment that is not in the lookup list", () => {
  beforeEach(resetDatabase);

  it("is recorded anyway, with no code invented for it", async () => {
    const user = await trackedPerson();

    const course = await addTreatmentCourse(
      user.id,
      courseForm({ name: "Wintermoor Herbal Tonic", type: "supplement" }),
    );

    expect(course.intervention.name).toBe("Wintermoor Herbal Tonic");
    expect(course.intervention.type).toBe("supplement");
    // A full dm+d import needs an NHS TRUD account. Null is the honest value.
    expect(course.intervention.dmdCode).toBeNull();

    const stored = await testDb.intervention.findMany({
      where: { name: "Wintermoor Herbal Tonic" },
    });
    expect(stored).toHaveLength(1);
  });

  it("covers all five kinds, including the ones that are not drugs", async () => {
    const user = await trackedPerson();

    for (const [name, type] of [
      ["A prescription thing", "rx"],
      ["A pharmacy thing", "otc"],
      ["A vitamin", "supplement"],
      ["A gadget", "device"],
      ["Weekly swimming", "non_drug"],
    ] as const) {
      const course = await addTreatmentCourse(user.id, courseForm({ name, type }));
      expect(course.intervention.type).toBe(type);
    }

    const { current } = await listTreatmentCourses(user.id);
    expect(current).toHaveLength(5);
  });

  it("does not split a cohort in half over capital letters", async () => {
    const first = await findOrCreateIntervention("Metformin", "rx");
    const second = await findOrCreateIntervention("  metformin ", "rx");

    expect(second.id).toBe(first.id);
    expect(second.name).toBe("Metformin");
  });

  it("keeps the same name under two different kinds apart", async () => {
    const medicine = await findOrCreateIntervention("Vitamin D", "supplement");
    const prescribed = await findOrCreateIntervention("Vitamin D", "rx");
    expect(prescribed.id).not.toBe(medicine.id);
  });
});

describe("the treatments onboarding step", () => {
  beforeEach(resetDatabase);

  it("is not finished until the person has been asked and has answered", async () => {
    const user = await trackedPerson();

    expect(await hasConfirmedTreatments(user.id)).toBe(false);
    expect(await treatmentsConfirmedAt(user.id)).toBeNull();
  });

  it("is finished by somebody who is on nothing at all", async () => {
    const user = await trackedPerson();

    await confirmTreatments(user.id);

    expect(await hasConfirmedTreatments(user.id)).toBe(true);
    expect(await treatmentsConfirmedAt(user.id)).toBeInstanceOf(Date);
    // And they still have no treatments, which is the whole point.
    expect(await testDb.treatmentCourse.count({ where: { userId: user.id } })).toBe(0);
  });

  it("tells 'I take nothing' apart from 'nobody has asked me'", async () => {
    const neverAsked = await trackedPerson();
    const answeredNone = await trackedPerson();
    await confirmTreatments(answeredNone.id);

    const courses = await testDb.treatmentCourse.count();
    expect(courses).toBe(0);

    // Identical data, different answers. A count of treatment rows could not tell them apart.
    expect(await hasConfirmedTreatments(neverAsked.id)).toBe(false);
    expect(await hasConfirmedTreatments(answeredNone.id)).toBe(true);
  });

  it("works for somebody who never finished the welcome step and has no profile row", async () => {
    const user = await trackedPerson();
    expect(await testDb.profile.findUnique({ where: { userId: user.id } })).toBeNull();

    await confirmTreatments(user.id);
    expect(await hasConfirmedTreatments(user.id)).toBe(true);
  });

  it("is also finished by somebody who has recorded treatments and confirmed the list", async () => {
    const user = await trackedPerson();
    await addTreatmentCourse(user.id, courseForm());
    expect(await hasConfirmedTreatments(user.id)).toBe(false);

    await confirmTreatments(user.id);
    expect(await hasConfirmedTreatments(user.id)).toBe(true);
  });
});

describe("what the treatment form will accept", () => {
  it("needs a name, a kind and a start date, and nothing else", () => {
    const parsed = treatmentCourseSchema.safeParse({
      name: "Physiotherapy",
      type: "non_drug",
      dose: "",
      frequency: "",
      route: "",
      startDate: toDateInputValue(ukToday()),
      adherenceRating: "",
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.dose).toBeNull();
    expect(parsed.data.route).toBeNull();
    expect(parsed.data.adherenceRating).toBeNull();
  });

  it("says so when the name is missing", () => {
    const parsed = treatmentCourseSchema.safeParse({
      name: "  ",
      type: "rx",
      dose: "",
      frequency: "",
      route: "",
      startDate: "2026-01-01",
      adherenceRating: "",
    });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues[0].path).toEqual(["name"]);
  });

  it("refuses a start date that cannot be right", () => {
    const parsed = treatmentCourseSchema.safeParse({
      name: "Metformin",
      type: "rx",
      dose: "",
      frequency: "",
      route: "",
      startDate: "2099-01-01",
      adherenceRating: "",
    });
    expect(parsed.success).toBe(false);
  });

  it("refuses an adherence rating outside 0 to 10", () => {
    const parsed = treatmentCourseSchema.safeParse({
      name: "Metformin",
      type: "rx",
      dose: "",
      frequency: "",
      route: "",
      startDate: "2026-01-01",
      adherenceRating: "14",
    });
    expect(parsed.success).toBe(false);
  });
});
