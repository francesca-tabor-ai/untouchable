// @vitest-environment jsdom
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Question } from "@/components/questionnaires/question";
import { ResponseRecorded } from "@/components/questionnaires/response-recorded";
import { parseDefinition } from "@/lib/questionnaires";

import { EVERY_ITEM_TYPE, SEEDED_WELLBEING } from "./questionnaire-fixtures";

/**
 * The questionnaire surfaces, rendered.
 *
 * Two promises are checked here that a domain test cannot reach: every question is a real,
 * labelled, native control with its error wired to it, and nothing anywhere says what a
 * score means.
 */

const everyType = parseDefinition(EVERY_ITEM_TYPE);
const wellbeing = parseDefinition(SEEDED_WELLBEING);

function itemNamed(key: string) {
  const item = everyType.items.find((entry) => entry.key === key);
  if (!item) throw new Error(`no fixture item ${key}`);
  return item;
}

describe("the renderer", () => {
  it("draws a 0–10 scale as eleven real radio buttons, each with its own label", () => {
    render(<Question item={itemNamed("overall")} />);

    const group = screen.getByRole("group", { name: /How have things been overall/ });
    expect(within(group).getAllByRole("radio")).toHaveLength(11);
    expect(within(group).getByRole("radio", { name: "0" })).toBeInTheDocument();
    expect(within(group).getByRole("radio", { name: "10" })).toBeInTheDocument();
  });

  it("draws a Likert scale with the words, not the numbers", () => {
    render(<Question item={itemNamed("effort")} value={3} />);

    const group = screen.getByRole("group", { name: /How much effort/ });
    expect(within(group).getByRole("radio", { name: "A fair amount" })).toBeChecked();
    expect(within(group).getByRole("radio", { name: "Hardly any" })).not.toBeChecked();
  });

  it("draws a yes/no question as two radios, so 'no' is not the same as 'not answered'", () => {
    render(<Question item={itemNamed("seen_gp")} />);

    const group = screen.getByRole("group", { name: /Have you seen your GP/ });
    expect(within(group).getByRole("radio", { name: "Yes" })).not.toBeChecked();
    expect(within(group).getByRole("radio", { name: "No" })).not.toBeChecked();
  });

  it("draws multiple choice as tick boxes, and keeps what was already ticked", () => {
    render(<Question item={itemNamed("changes")} value={["sleep", "work"]} />);

    expect(screen.getByRole("checkbox", { name: "Sleep" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Appetite" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Work" })).toBeChecked();
  });

  it("draws a date as a real date control with its own label", () => {
    render(<Question item={itemNamed("last_seen")} value="2026-02-28" />);

    const input = screen.getByLabelText(/When did you last see them/);
    expect(input).toHaveValue("2026-02-28");
  });

  it("says plainly where free text goes, because somebody deciding whether to write it deserves to know", () => {
    const notes = wellbeing.items.find((item) => item.key === "anything_else")!;
    render(<Question item={notes} />);

    expect(screen.getByText(/Only you will ever see this/)).toBeInTheDocument();
    expect(screen.getByText(/never included in research/)).toBeInTheDocument();
  });

  it("marks an optional question as optional, and does not mark a required one", () => {
    const { unmount } = render(<Question item={itemNamed("who_helps")} />);
    expect(screen.getByRole("group", { name: /\(optional\)/ })).toBeInTheDocument();
    unmount();

    render(<Question item={itemNamed("overall")} />);
    expect(screen.queryByText("(optional)")).not.toBeInTheDocument();
  });

  it("wires an error to the question it belongs to, and announces it", () => {
    render(<Question item={itemNamed("overall")} error="Please answer this one." />);

    const group = screen.getByRole("group", { name: /How have things been overall/ });
    expect(group).toHaveAttribute("aria-invalid", "true");

    const error = screen.getByRole("alert");
    expect(error).toHaveTextContent("Please answer this one.");
    expect(group.getAttribute("aria-describedby")).toContain(error.id);
  });

  it("wires an error on a single-control question to that control", () => {
    render(<Question item={itemNamed("last_seen")} error="That is not a date that exists." />);

    const input = screen.getByLabelText(/When did you last see them/);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.getAttribute("aria-describedby")).toContain(screen.getByRole("alert").id);
  });
});

describe("showing somebody their score", () => {
  const summary = {
    id: "r1",
    completedAt: new Date("2026-03-04T10:00:00Z"),
    score: 5.5,
    questionnaireKey: "general-wellbeing",
    title: "How you have been getting on",
    version: 1,
  };

  it("shows a number and a date, and says nothing about either", () => {
    render(<ResponseRecorded summary={summary} redFlags={[]} />);

    expect(screen.getByText("5.5")).toBeInTheDocument();
    expect(screen.getByText("4 March 2026")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("is honest when there is no score rather than showing a zero", () => {
    render(<ResponseRecorded summary={{ ...summary, score: null }} redFlags={[]} />);
    expect(screen.getByText("Not scored")).toBeInTheDocument();
  });

  it("offers support when a rule matched, with no diagnosis and nobody contacted", () => {
    render(
      <ResponseRecorded
        summary={summary}
        redFlags={[
          {
            key: "not_coping",
            itemKey: "coping",
            operator: "equals",
            value: "not_coping",
            answer: "not_coping",
            message: "You have said you are not coping at all.",
          },
        ]}
      />,
    );

    expect(screen.getByText("You have said you are not coping at all.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Samaritans/ })).toHaveAttribute("href", "tel:116123");
    expect(screen.getByText(/You do not have to do anything with that/)).toBeInTheDocument();
  });
});

describe("nothing interprets a score", () => {
  const ROOT = join(__dirname, "..", "..");

  function filesUnder(directory: string): string[] {
    return readdirSync(directory).flatMap((entry) => {
      const path = join(directory, entry);
      return statSync(path).isDirectory() ? filesUnder(path) : [path];
    });
  }

  const SURFACES = [
    join(ROOT, "src/lib/questionnaires"),
    join(ROOT, "src/components/questionnaires"),
    join(ROOT, "src/app/(account)/check-ins"),
    join(ROOT, "src/app/(account)/onboarding/baseline"),
    join(ROOT, "src/app/(admin)/admin/questionnaires"),
  ].flatMap(filesUnder);

  /**
   * Brief principle 7 and AGENTS.md rule 9. A score is a number. The moment a surface says
   * it went up, went down, is good, or means anything, this stops being a record and starts
   * being a medical device.
   */
  const interpretation =
    /\bimprov|\bdeteriorat|getting better|getting worse|\bwell done\b|keep it up|good score|bad score|normal range|healthy range|you are doing|better than last/i;

  it("says nothing about what a score means, anywhere on these surfaces", () => {
    for (const path of SURFACES) {
      expect(readFileSync(path, "utf8"), `${path} interprets a score`).not.toMatch(interpretation);
    }
  });

  /** Brief 6.4 and AGENTS.md rule 5: nothing on a health surface asks anybody for money. */
  const money = /donate|donation|give now|chip in|support us|fundraise/i;

  it("asks nobody for money on any questionnaire surface", () => {
    for (const path of SURFACES) {
      expect(readFileSync(path, "utf8"), `${path} mentions donating`).not.toMatch(money);
    }
  });
});
