import { describe, expect, it } from "vitest";

import {
  DONATION_COPY,
  DONATION_SURFACES,
  NEVER_PROMPT_SURFACES,
  PROMPTABLE_SURFACES,
  QUIET_HOURS_AFTER_HARD_CHECK_IN,
  donationPromptDecision,
  mayShowDonationPrompt,
  pressureLanguageProblem,
  type DonationSurface,
} from "@/lib/charities/prompt-policy";

/**
 * Giving without pressure — brief 6.4, AGENTS.md rule 5.
 *
 * The check-in and safety screens do not exist yet. These tests exist anyway: the rule is
 * what the later waves will call, and a rule without a test is a rule we do not have.
 */

const NOW = new Date("2026-09-16T12:00:00.000Z");
const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 60 * 60 * 1000);

describe("donation prompts: where they are never shown", () => {
  it("never on a safety or red-flag screen", () => {
    for (const surface of ["safety_signposting", "red_flag"] as DonationSurface[]) {
      const decision = donationPromptDecision({ surface, now: NOW });
      expect(decision.allowed, surface).toBe(false);
      expect(decision.reason).toBe("safety_surface");
    }
  });

  it("never during onboarding, on any surface", () => {
    expect(mayShowDonationPrompt({ surface: "onboarding", now: NOW })).toBe(false);

    for (const surface of PROMPTABLE_SURFACES) {
      const decision = donationPromptDecision({ surface, inOnboarding: true, now: NOW });
      expect(decision.allowed, surface).toBe(false);
      expect(decision.reason).toBe("onboarding");
    }
  });

  it("never directly after a check-in with high symptom scores", () => {
    const decision = donationPromptDecision({
      surface: "condition_page",
      lastCheckIn: { completedAt: hoursAgo(1), hadHighSymptomScores: true },
      now: NOW,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("recent_high_symptom_check_in");
  });

  it("stays quiet for the whole quiet period, then allows again", () => {
    const justInside = donationPromptDecision({
      surface: "condition_page",
      lastCheckIn: {
        completedAt: hoursAgo(QUIET_HOURS_AFTER_HARD_CHECK_IN - 0.5),
        hadHighSymptomScores: true,
      },
      now: NOW,
    });
    const afterwards = donationPromptDecision({
      surface: "condition_page",
      lastCheckIn: {
        completedAt: hoursAgo(QUIET_HOURS_AFTER_HARD_CHECK_IN + 1),
        hadHighSymptomScores: true,
      },
      now: NOW,
    });

    expect(justInside.allowed).toBe(false);
    expect(afterwards.allowed).toBe(true);
  });

  it("never while a safety concern is open, wherever the person is", () => {
    for (const surface of PROMPTABLE_SURFACES) {
      const decision = donationPromptDecision({ surface, hasOpenSafetyConcern: true, now: NOW });
      expect(decision.allowed, surface).toBe(false);
      expect(decision.reason).toBe("open_safety_concern");
    }
  });

  it("never on the check-in result screen, even after an ordinary check-in", () => {
    const decision = donationPromptDecision({
      surface: "check_in_result",
      lastCheckIn: { completedAt: hoursAgo(1), hadHighSymptomScores: false },
      now: NOW,
    });

    expect(decision.allowed).toBe(false);
  });

  it("denies by default on a surface nobody has approved", () => {
    const decision = donationPromptDecision({ surface: "daily_log", now: NOW });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("surface_not_approved");
  });

  it("leaves no surface unaccounted for", () => {
    // Every surface is either approved for prompts or not. Nothing falls through a gap.
    for (const surface of DONATION_SURFACES) {
      const decision = donationPromptDecision({ surface, now: NOW });
      const expected =
        PROMPTABLE_SURFACES.includes(surface) && !NEVER_PROMPT_SURFACES.includes(surface);
      expect(decision.allowed, surface).toBe(expected);
    }
  });
});

describe("donation prompts: where they are allowed", () => {
  it("allows a quiet prompt on the giving and editorial surfaces", () => {
    for (const surface of PROMPTABLE_SURFACES) {
      expect(mayShowDonationPrompt({ surface, now: NOW }), surface).toBe(true);
    }
  });

  it("allows a prompt after a check-in that did not record high scores", () => {
    expect(
      mayShowDonationPrompt({
        surface: "story_page",
        lastCheckIn: { completedAt: hoursAgo(1), hadHighSymptomScores: false },
        now: NOW,
      }),
    ).toBe(true);
  });
});

describe("donation copy carries no pressure", () => {
  it("catches countdowns, scarcity, guilt and rewards", () => {
    expect(pressureLanguageProblem("Only 2 hours left to give")).not.toBeNull();
    expect(pressureLanguageProblem("Hurry, this appeal ends tonight")).not.toBeNull();
    expect(pressureLanguageProblem("Don't let them down")).not.toBeNull();
    expect(pressureLanguageProblem("You should donate today")).not.toBeNull();
    expect(pressureLanguageProblem("Donate to unlock your dashboard")).not.toBeNull();
    expect(pressureLanguageProblem("Give before it's too late")).not.toBeNull();
  });

  it("passes plain, calm wording", () => {
    expect(pressureLanguageProblem("This opens the charity's own donation page.")).toBeNull();
  });

  it("holds every piece of donation copy we ship to the same standard", () => {
    for (const [key, copy] of Object.entries(DONATION_COPY)) {
      expect(pressureLanguageProblem(copy), `${key}: ${copy}`).toBeNull();
    }
  });

  it("says plainly that giving changes nothing about the account", () => {
    // Brief 6.4: donating never unlocks features and never changes how the app treats anyone.
    expect(DONATION_COPY.optional.toLowerCase()).toContain("optional");
    expect(DONATION_COPY.followPrivacy.toLowerCase()).toContain("never");
  });
});
