import { describe, expect, it } from "vitest";

import { canShowLogo, isSelfHostedLogo, logoSuppressionReason } from "@/lib/charities/logo";

/**
 * Brief 6.1: without permission to use the name and logo, the name is shown as text only.
 */
describe("logo permission", () => {
  it("shows the logo only when permission is recorded", () => {
    expect(canShowLogo({ logoPermission: true, logoUrl: "/charity-logos/a.svg" })).toBe(true);
    expect(canShowLogo({ logoPermission: false, logoUrl: "/charity-logos/a.svg" })).toBe(false);
  });

  it("falls back to text when there is no logo at all", () => {
    expect(canShowLogo({ logoPermission: true, logoUrl: null })).toBe(false);
  });

  it("never hot-links a logo from the charity's own server", () => {
    // Loading it from their server would tell them the IP address of everyone reading a page
    // about a single condition. See src/lib/charities/logo.ts.
    expect(isSelfHostedLogo("https://charity.example.test/logo.png")).toBe(false);
    expect(isSelfHostedLogo("//charity.example.test/logo.png")).toBe(false);
    expect(isSelfHostedLogo("/charity-logos/a.svg")).toBe(true);
    expect(canShowLogo({ logoPermission: true, logoUrl: "https://c.example.test/logo.png" })).toBe(
      false,
    );
  });

  it("tells an editor why a logo is not showing", () => {
    expect(logoSuppressionReason({ logoPermission: false, logoUrl: "/a.svg" })).toContain(
      "no permission",
    );
    expect(logoSuppressionReason({ logoPermission: true, logoUrl: "/a.svg" })).toBeNull();
  });
});
