import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ConsentChoices } from "@/components/consent/consent-choices";
import type { ConsentChoiceView } from "@/components/consent/consent-details";
import { ConsentSettings, type ConsentSettingRow } from "@/components/consent/consent-settings";
import { CONSENT_COPY } from "@/lib/consent/text";

/**
 * The consent screen is the most important surface in the product, so these tests are about
 * what a person actually meets: five separate controls, nothing pre-ticked that should not
 * be, no way to agree to everything in one go, and every control with a real label.
 */
const choices: ConsentChoiceView[] = CONSENT_COPY.map((copy) => ({ ...copy, granted: false }));

async function noopAction() {}

describe("the consent choices", () => {
  it("gives every purpose its own control", () => {
    render(<ConsentChoices choices={choices} />);

    const boxes = screen.getAllByRole("checkbox");
    expect(boxes).toHaveLength(5);
    for (const choice of choices) {
      expect(screen.getByLabelText(choice.label)).toBeInTheDocument();
    }
  });

  it("starts every optional consent off", () => {
    render(<ConsentChoices choices={choices} />);

    for (const choice of choices.filter((entry) => !entry.required)) {
      expect(screen.getByLabelText(choice.label)).not.toBeChecked();
    }
  });

  it("does not offer a way to agree to everything at once", () => {
    render(<ConsentChoices choices={choices} />);

    // No bundling, no "select all", no single blanket agreement. Five questions, five answers.
    for (const box of screen.getAllByRole("checkbox")) {
      const label = box.getAttribute("aria-label") ?? box.closest("div")?.textContent ?? "";
      expect(label).not.toMatch(/all of the above|select all|agree to everything/i);
    }
    expect(screen.queryByLabelText(/select all/i)).toBeNull();
  });

  it("shows each choice back exactly as the person left it", () => {
    const withOneOn = choices.map((choice) =>
      choice.purpose === "research_anonymised" ? { ...choice, granted: true } : choice,
    );
    render(<ConsentChoices choices={withOneOn} />);

    const research = choices.find((choice) => choice.purpose === "research_anonymised")!;
    expect(screen.getByLabelText(research.label)).toBeChecked();
    expect(screen.getAllByRole("checkbox").filter((box) => (box as HTMLInputElement).checked)).toHaveLength(1);
  });

  it("explains what we collect, who sees it and what it is for, next to each choice", () => {
    render(<ConsentChoices choices={choices} />);

    expect(screen.getAllByText("What we collect")).toHaveLength(5);
    expect(screen.getAllByText("Who sees it")).toHaveLength(5);
    expect(screen.getAllByText("What it is for")).toHaveLength(5);
  });
});

describe("the consent settings screen", () => {
  const rows: ConsentSettingRow[] = CONSENT_COPY.map((copy) => ({
    ...copy,
    granted: copy.purpose === "core_tracking",
    decidedOn: "12 September 2026",
    textVersion: "2026-09-16",
    underOldWording: false,
  }));

  it("shows where every consent stands and when it was decided", () => {
    render(
      <ConsentSettings
        rows={rows}
        setConsentAction={noopAction}
        stopTrackingHref="/settings/consent/stop-tracking"
      />,
    );

    expect(screen.getAllByText(/You decided this on 12 September 2026/)).toHaveLength(5);
    expect(screen.getAllByText("On")).toHaveLength(1);
    expect(screen.getAllByText("Off")).toHaveLength(4);
  });

  it("gives every consent its own control to change it", () => {
    render(
      <ConsentSettings
        rows={rows}
        setConsentAction={noopAction}
        stopTrackingHref="/settings/consent/stop-tracking"
      />,
    );

    // Four buttons to turn things on, and one link to the screen that explains what turning
    // core tracking off actually does.
    expect(screen.getAllByRole("button", { name: /turn on/i })).toHaveLength(4);
    const stop = screen.getByRole("link", { name: /turn off/i });
    expect(stop).toHaveAttribute("href", "/settings/consent/stop-tracking");
  });

  it("tells someone when we have changed the wording since they answered", () => {
    const stale = rows.map((row) =>
      row.purpose === "marketing_email"
        ? { ...row, underOldWording: true, textVersion: "2026-01-01" }
        : row,
    );
    render(
      <ConsentSettings
        rows={stale}
        setConsentAction={noopAction}
        stopTrackingHref="/settings/consent/stop-tracking"
      />,
    );

    expect(screen.getByText(/changed this wording since you answered/i)).toBeInTheDocument();
  });

  it("does not bundle the five decisions into one form", () => {
    const { container } = render(
      <ConsentSettings
        rows={rows}
        setConsentAction={noopAction}
        stopTrackingHref="/settings/consent/stop-tracking"
      />,
    );

    const forms = container.querySelectorAll("form");
    expect(forms).toHaveLength(4);
    for (const form of forms) {
      expect(within(form as HTMLElement).getAllByRole("button")).toHaveLength(1);
    }
  });
});
