// @vitest-environment jsdom
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SiteHeaderView } from "@/components/layout/site-header";
import { SafetyFooter } from "@/components/layout/safety-footer";

/**
 * `SiteHeaderView` is pure, but the module it lives in also holds the server component that
 * reads the session — so importing it drags next-auth's server runtime and Prisma into
 * jsdom. Neither is what this file is about: who is signed in arrives as a prop, and what
 * the sign-out button does is covered by the auth suite.
 */
vi.mock("@/lib/auth/guards", () => ({ getCurrentUser: async () => null }));
vi.mock("@/lib/profile", () => ({ getProfile: async () => null }));
vi.mock("@/components/auth/sign-out-form", () => ({
  SignOutForm: () => <button type="submit">Sign out</button>,
}));

/**
 * The header's shape, as a test rather than as a habit.
 *
 * Three promises here. About is in the footer and not in the header — someone reads About once,
 * and the header row is worth more to the person who arrived frightened and wants a condition
 * page. Every header link resolves to a route that exists, because a dead link in the
 * navigation of a health site is a person who gives up rather than a person who retries. And
 * the header says whether you are signed in, which is the only place somebody who has just
 * created an account can see that it worked.
 *
 * `SiteHeaderView` is the header with the session already worked out, so both states can be
 * rendered without a database.
 */

function headerLinks() {
  render(<SiteHeaderView signedInAs={null} />);
  return screen
    .getAllByRole("link")
    .map((link) => ({ href: link.getAttribute("href") ?? "", text: link.textContent ?? "" }));
}

describe("the site header", () => {
  it("offers My health after Explore, with the dashboard, the tracker and education", () => {
    render(<SiteHeaderView signedInAs={null} />);

    const desktop = screen.getAllByRole("navigation", { name: "Main" })[0];
    const menus = within(desktop).getAllByText(/^(Explore|My health)$/);
    expect(menus.map((node) => node.textContent)).toEqual(["Explore", "My health"]);

    expect(within(desktop).getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(within(desktop).getByRole("link", { name: "Health tracker" })).toHaveAttribute(
      "href",
      "/tracker",
    );
    expect(within(desktop).getByRole("link", { name: "Education" })).toHaveAttribute(
      "href",
      "/learn",
    );
  });

  it("lists My health outright on a phone, where there is no dropdown to open", () => {
    render(<SiteHeaderView signedInAs={null} />);

    const phone = screen.getAllByRole("navigation", { name: "Main" })[1];
    const labels = within(phone)
      .getAllByRole("link")
      .map((link) => link.textContent);
    expect(labels).toEqual([
      "Home",
      "Conditions",
      "Medicines",
      "Charities",
      "Dashboard",
      "Health tracker",
      "Education",
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

  it("offers sign in and join to somebody who is signed out", () => {
    render(<SiteHeaderView signedInAs={null} />);

    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");
    expect(screen.getByRole("link", { name: "Join" })).toHaveAttribute("href", "/sign-up");
    expect(screen.queryByText(/signed in as/i)).toBeNull();
  });

  it("says who is signed in, and offers the way out", () => {
    // Somebody who has just created an account lands on the home page. A header still
    // offering "Join" would read as if the sign-up had not worked.
    render(<SiteHeaderView signedInAs="Sam" />);

    expect(screen.getByRole("link", { name: "Signed in as Sam" })).toHaveAttribute(
      "href",
      "/settings",
    );
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Join" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
  });

  it("keeps About in the footer", () => {
    render(<SafetyFooter />);
    expect(screen.getByRole("link", { name: "Why we exist" })).toHaveAttribute("href", "/about");
  });
});

/**
 * The same header on every page somebody can reach by following it.
 *
 * The account area used to have a header of its own with no navigation on it, so "Your
 * Health → Food Advisor" took you to a page where Your Health no longer existed. Somebody
 * tracking a symptom at 2am should not have to use the back button to find the rest of the
 * site. Read from the source rather than rendered, because these layouts pull in the
 * session and the database.
 */
describe("the header on every area of the site", () => {
  const AREAS = ["(public)", "(auth)", "(account)"];

  it.each(AREAS)("is the shared SiteHeader in %s", (area) => {
    const source = readFileSync(join(process.cwd(), "src/app", area, "layout.tsx"), "utf8");
    expect(source).toContain("SiteHeader");
  });

  it("reaches My health, and every tracker behind it, without losing it", () => {
    // All of these live in the account area. If one ever moves, this says so rather than the
    // navigation quietly disappearing on that page alone.
    for (const route of ["dashboard", "tracker", "learn", "food", "timeline", "log"]) {
      expect(existsSync(join(process.cwd(), "src/app/(account)", route, "page.tsx"))).toBe(true);
    }
  });
});
