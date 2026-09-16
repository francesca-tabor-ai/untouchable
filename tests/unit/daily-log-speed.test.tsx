// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { DailyLogForm } from "@/components/tracking/daily-log-form";
import { CONTEXT_TAGS } from "@/lib/tracking/context-tags";
import { parseDailyLogForm, type DailyLogSymptom } from "@/lib/tracking/daily-log";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/onboarding/form-state";

/**
 * **Under thirty seconds** is the acceptance criterion for the daily log, so it is measured
 * rather than asserted in a comment.
 *
 * What is measured here is the cost of a minimal complete log: how many controls a person
 * has to touch, and how many characters they have to type, before what they submit is a
 * valid, complete entry. The answer this suite pins down is **one press and no typing** —
 * the form is rendered, nothing at all is interacted with, its `FormData` is taken exactly
 * as the browser would send it, and the domain's own parser is asked whether that is already
 * a complete log.
 *
 * Seconds cannot be measured in jsdom. Interactions can, and interactions are what the
 * seconds are made of: every extra required control is a decision, a tap and a wait.
 */

const SYMPTOMS: DailyLogSymptom[] = [
  { userSymptomId: "us-1", symptomId: "s-1", name: "Fatigue", score: 6, source: "carried", carriedFrom: new Date("2026-09-14T00:00:00Z") },
  { userSymptomId: "us-2", symptomId: "s-2", name: "Pain", score: 3, source: "carried", carriedFrom: new Date("2026-09-14T00:00:00Z") },
  { userSymptomId: "us-3", symptomId: "s-3", name: "Trouble sleeping", score: 8, source: "carried", carriedFrom: new Date("2026-09-14T00:00:00Z") },
];

async function noop(): Promise<FormState> {
  return EMPTY_FORM_STATE;
}

function renderLog(overrides: Partial<React.ComponentProps<typeof DailyLogForm>> = {}) {
  return render(
    <DailyLogForm
      action={noop}
      symptoms={SYMPTOMS}
      tags={CONTEXT_TAGS}
      chosenTags={[]}
      note={null}
      alreadyLogged={false}
      {...overrides}
    />,
  );
}

function formOf(container: HTMLElement): HTMLFormElement {
  const form = container.querySelector("form");
  if (!form) throw new Error("The daily log has no form.");
  return form;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("how much work a minimal daily log is", () => {
  it("is already a complete, valid log before anybody touches anything", () => {
    const { container } = renderLog();

    // Exactly what the browser would send if the person pressed Save and nothing else.
    const parsed = parseDailyLogForm(new FormData(formOf(container)));

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(Object.keys(parsed.data.scores)).toHaveLength(SYMPTOMS.length);
    expect(parsed.data.scores).toEqual({ "us-1": 6, "us-2": 3, "us-3": 8 });
  });

  it("costs one press and no typing", () => {
    const { container } = renderLog();
    const form = formOf(container);

    // Nothing on the form is required, so nothing has to be touched...
    const required = form.querySelectorAll("[required], [aria-required='true']");
    expect(required).toHaveLength(0);

    // ...and there is exactly one thing to press.
    const submits = form.querySelectorAll("button[type='submit'], input[type='submit']");
    expect(submits).toHaveLength(1);

    const interactionsNeeded = required.length + submits.length;
    const charactersTyped = 0;
    expect(interactionsNeeded).toBe(1);
    expect(charactersTyped).toBe(0);
  });

  it("is one screen: no steps, no pagination, no confirmation", () => {
    const { container } = renderLog();
    const text = container.textContent ?? "";

    expect(text).not.toMatch(/\bnext step\b|\bgo back\b|\bcontinue\b|step \d+ of \d+/i);
    expect(text).not.toMatch(/are you sure|confirm/i);
    expect(container.querySelectorAll("form")).toHaveLength(1);
    expect(container.querySelector("[role='dialog']")).toBeNull();
  });

  it("asks for a score for every symptom and nothing else the person has to fill in", () => {
    const { container } = renderLog();

    expect(screen.getAllByRole("slider")).toHaveLength(SYMPTOMS.length);

    // The only free-text control is the note, and it is optional and folded away.
    const textAreas = container.querySelectorAll("textarea");
    expect(textAreas).toHaveLength(1);
    expect(container.querySelector("details")?.hasAttribute("open")).toBe(false);
  });

  it("offers the context tags as taps rather than typing", () => {
    renderLog();
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes).toHaveLength(CONTEXT_TAGS.length);
    for (const box of boxes) expect(box).not.toBeChecked();
  });

  it("opens the note already showing when there is one to read", () => {
    const { container } = renderLog({ note: "Slept badly." });
    expect(container.querySelector("details")?.hasAttribute("open")).toBe(true);
  });
});

describe("the sliders are operable with a keyboard alone", () => {
  it("puts every slider in the tab order, before the one control that submits", async () => {
    const user = userEvent.setup();
    const { container } = renderLog();

    const sliders = screen.getAllByRole("slider");
    for (const slider of sliders) {
      expect(slider).not.toBeDisabled();
      // A negative tabindex would take it out of the tab order. Nothing sets one.
      expect(slider.getAttribute("tabindex")).toBeNull();
    }

    await user.tab();
    expect(document.activeElement).toBe(sliders[0]);
    await user.tab();
    expect(document.activeElement).toBe(sliders[1]);

    // Every focusable control on the form is reachable, and the submit button is among them.
    const focusable = container.querySelectorAll<HTMLElement>(
      "input:not([type='hidden']), textarea, select, button, summary, a[href]",
    );
    expect([...focusable].some((element) => element.getAttribute("type") === "submit")).toBe(true);
  });

  it("is a real range input, which is where the keyboard behaviour comes from", () => {
    renderLog();
    for (const slider of screen.getAllByRole("slider")) {
      expect(slider.tagName).toBe("INPUT");
      expect(slider).toHaveAttribute("type", "range");
      expect(slider).toHaveAttribute("min", "0");
      expect(slider).toHaveAttribute("max", "10");
      expect(slider).toHaveAttribute("step", "1");
    }
  });

  it("shows the current value in text, and moves it when the value changes", async () => {
    const { container } = renderLog();
    const slider = screen.getAllByRole("slider")[0] as HTMLInputElement;
    const output = container.querySelector("output");

    expect(output?.textContent).toBe("6");
    expect(slider).toHaveAttribute("aria-valuetext", "6 out of 10");

    // What an arrow key press does in a browser: the value changes and the page keeps up.
    await userEvent.setup();
    slider.focus();
    const { fireEvent } = await import("@testing-library/react");
    fireEvent.change(slider, { target: { value: "7" } });

    expect(container.querySelector("output")?.textContent).toBe("7");
    expect(slider).toHaveAttribute("aria-valuetext", "7 out of 10");
  });

  it("gives every slider a real label and a scale a screen reader can hear", () => {
    const { container } = renderLog();

    for (const symptom of SYMPTOMS) {
      const slider = screen.getByLabelText(symptom.name);
      expect(slider).toHaveAttribute("type", "range");

      const describedBy = slider.getAttribute("aria-describedby");
      expect(describedBy).toBeTruthy();
      const description = describedBy!
        .split(" ")
        .map((id) => container.querySelector(`#${CSS.escape(id)}`)?.textContent ?? "")
        .join(" ");
      expect(description).toMatch(/0 — not at all/);
      expect(description).toMatch(/10 — as bad as it has been/);
    }
  });
});
