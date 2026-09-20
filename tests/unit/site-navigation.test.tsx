// @vitest-environment jsdom
import { existsSync } from "node:fs";
import { join } from "node:path";

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SiteHeader } from "@/components/layout/site-header";
import { SafetyFooter } from "@/components/layout/safety-footer";

/**
 * The header's shape, as a test rather than as a habit.
 *
 * Two promises here. About is in the footer and not in the header — someone reads About once,
 * and the header row is worth more to the person who arrived frightened and wants a condition
 * page. And every header link resolves to a route that exists, because a dead link in the
 * navigation of a health site is a person who gives up rather than a person who retries.
 */

function headerLinks() {
  render(<SiteHeader />);
  return screen
    .getAllByRole("link")
    .map((link) => ({ href: link.getAttribute("href") ?? "", text: link.textContent ?? "" }));
}

describe("the site header", () => {
  it("offers Your Health after Explore, with the symptom tracker and the Food Advisor", () => {
    render(<SiteHeader />);

    const desktop = screen.getAllByRole("navigation", { name: "Main" })[0];
    const menus = within(desktop).getAllByText(/^(Explore|Your Health)$/);
    expect(menus.map((node) => node.textContent)).toEqual(["Explore", "Your Health"]);

    const tracker = within(desktop).getAllByRole("link", { name: "Symptom tracker" });
    const food = within(desktop).getAllByRole("link", { name: "Food Advisor" });
    expect(tracker[0]).toHaveAttribute("href", "/log");
    expect(food[0]).toHaveAttribute("href", "/food");
  });

  it("lists Your Health outright on a phone, where there is no dropdown to open", () => {
    render(<SiteHeader />);

    const phone = screen.getAllByRole("navigation", { name: "Main" })[1];
    const labels = within(phone)
      .getAllByRole("link")
      .map((link) => link.textContent);
    expect(labels).toEqual([
      "Home",
      "Conditions",
      "Medicines",
      "Charities",
      "Symptom tracker",
      "Food Advisor",
    ]);
  });

  it("does not put About in the header", () => {
    expect(headerLinks().some((link) => link.href.startsWith("/about"))).toBe(false);
  });

  it("points every link at a route that exists", () => {
    const groups = ["(public)", "(account)", "(auth)", "(admin)", ""];
    const missing = headerLinks()
      .map((link) => link.href)
      .filter((href) => href.startsWith("/"))
      .filter(
        (href) =>
          !groups.some((group) =>
            existsSync(join(process.cwd(), "src/app", group, href.slice(1), "page.tsx")),
          ),
      );
    expect(missing).toEqual([]);
  });

  it("keeps About in the footer", () => {
    render(<SafetyFooter />);
    expect(screen.getByRole("link", { name: "Why we exist" })).toHaveAttribute("href", "/about");
  });
});
