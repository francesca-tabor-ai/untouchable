import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { MenuScan } from "@/components/food/menu-scan";
import { ProfileForm } from "@/components/food/profile-form";
import { foodLanguageProblem } from "@/lib/food/language";
import { EMPTY_PROFILE, type ConditionProfile } from "@/lib/food/profile";

/**
 * The rules checked against what a person actually sees.
 *
 * `food-language.test.ts` reads the source. This renders it, with a profile that puts every
 * branch on the screen, and reads the markup — because a sentence assembled at runtime out
 * of two clean halves is exactly how a rule like this gets broken.
 */

const coeliacAndPeanut: ConditionProfile = {
  ...EMPTY_PROFILE,
  conditions: [{ name: "Coeliac disease", diagnosedBy: "clinician" }],
  allergies: [
    { allergenKey: "gluten", severity: "moderate", confirmedBy: "clinician" },
    { allergenKey: "peanuts", severity: "anaphylaxis", confirmedBy: "clinician" },
  ],
  neverList: ["oyster sauce"],
};

const MENU = [
  "Puttanesca — olives, capers, semolina crust",
  "Pad thai — rice noodles, tamarind, beansprouts",
  "Seabass — new potatoes and samphire",
  "Today's special",
].join("\n");

async function scanTheMenu(profile: ConditionProfile) {
  const user = userEvent.setup();
  const { container } = render(<MenuScan profile={profile} />);
  await user.type(screen.getByLabelText(/the menu/i), MENU);
  await user.click(screen.getByRole("button", { name: /work out what to ask/i }));
  return container;
}

describe("the rendered menu screen", () => {
  it("never declares anything safe, counts anything, or moralises", async () => {
    const container = await scanTheMenu(coeliacAndPeanut);
    const problem = foodLanguageProblem(container.textContent ?? "");
    expect(problem, problem ?? "").toBeNull();
  });

  it("puts the anaphylaxis reminder above the analysis, not below it", async () => {
    const container = await scanTheMenu(coeliacAndPeanut);
    const text = container.textContent ?? "";
    expect(text).toMatch(/anaphylaxis/i);
    expect(text.indexOf("anaphylaxis")).toBeLessThan(text.indexOf("Ask the kitchen"));
  });

  it("shows the three groups apart from each other and offers no fourth", async () => {
    await scanTheMenu(coeliacAndPeanut);
    expect(screen.getByRole("heading", { name: /worth asking about/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /likely a problem/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /not enough information/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /safe|fine|all right/i })).toBeNull();
  });

  it("leads with what is available rather than with the warnings", async () => {
    const container = await scanTheMenu(coeliacAndPeanut);
    const text = container.textContent ?? "";
    expect(text.indexOf("worth asking about")).toBeLessThan(text.indexOf("Likely a problem"));
  });

  it("puts the semolina dish in 'likely a problem' and names why", async () => {
    await scanTheMenu(coeliacAndPeanut);
    const heading = screen.getByRole("heading", { name: /likely a problem/i });
    const section = heading.closest("section");
    expect(within(section as HTMLElement).getByText(/Puttanesca/)).toBeInTheDocument();
    expect(section?.textContent).toMatch(/semolina/i);
  });

  it("puts a bare dish name in 'not enough information' rather than guessing from the name", async () => {
    await scanTheMenu(coeliacAndPeanut);
    const heading = screen.getByRole("heading", { name: /not enough information/i });
    const section = heading.closest("section");
    expect(within(section as HTMLElement).getByText(/Today's special/)).toBeInTheDocument();
  });

  it("tells the person they are entitled to ask", async () => {
    const container = await scanTheMenu(coeliacAndPeanut);
    expect(container.textContent).toMatch(/not being awkward/i);
  });

  it("offers no more than three questions", async () => {
    await scanTheMenu(coeliacAndPeanut);
    const list = screen.getByRole("heading", { name: /ask the kitchen/i }).parentElement;
    expect(within(list as HTMLElement).getAllByRole("listitem").length).toBeLessThanOrEqual(3);
  });
});

describe("the profile form", () => {
  it("asks how bad a reaction is rather than flattening it to a checkbox", () => {
    render(<ProfileForm profile={EMPTY_PROFILE} onChange={() => {}} />);
    const severity = screen.getByLabelText(/how bad is a reaction/i);
    expect(within(severity).getByRole("option", { name: /anaphylaxis/i })).toBeInTheDocument();
    expect(within(severity).getByRole("option", { name: /intolerance/i })).toBeInTheDocument();
  });

  it("renders an anaphylactic allergy and an intolerance with different tier labels", () => {
    const mixed: ConditionProfile = {
      ...EMPTY_PROFILE,
      allergies: [
        { allergenKey: "peanuts", severity: "anaphylaxis", confirmedBy: "clinician" },
        { allergenKey: "milk", severity: "intolerance", confirmedBy: "self" },
      ],
    };
    render(<ProfileForm profile={mixed} onChange={() => {}} />);
    expect(screen.getByText("Avoid completely")).toBeInTheDocument();
    expect(screen.getByText("Depends on how much")).toBeInTheDocument();
  });

  it("says plainly that doses are not wanted", () => {
    const { container } = render(<ProfileForm profile={EMPTY_PROFILE} onChange={() => {}} />);
    expect(container.textContent).toMatch(/do not put doses here/i);
  });

  it("does not invite anybody to justify what they do not eat", () => {
    const { container } = render(<ProfileForm profile={EMPTY_PROFILE} onChange={() => {}} />);
    expect(container.textContent).toMatch(/does not ask you to justify/i);
    expect(foodLanguageProblem(container.textContent ?? "")).toBeNull();
  });

  it("surfaces a temporary state that is past its review date", () => {
    const expired: ConditionProfile = {
      ...EMPTY_PROFILE,
      temporaryStates: [
        {
          state: "recovery after an operation",
          started: "2026-01-01",
          reviewOn: "2026-02-01",
          rulesDifferHow: "Soft food only.",
        },
      ],
    };
    render(<ProfileForm profile={expired} onChange={() => {}} />);
    expect(screen.getByText(/only meant to last a while/i)).toBeInTheDocument();
    expect(screen.getByText(/ordinary food again/i)).toBeInTheDocument();
  });
});
