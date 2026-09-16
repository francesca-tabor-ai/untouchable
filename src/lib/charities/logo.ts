/**
 * When a charity's logo may be shown.
 *
 * Two rules, both of which must hold:
 *
 * 1. **Permission.** A charity's logo is its trade mark. Without written permission recorded
 *    on the listing we show the name as text and nothing else. Brief 6.1.
 * 2. **We host it.** A logo loaded from the charity's own server tells that server the IP
 *    address of everyone who looks at the page — including someone reading a page about a
 *    single condition. That is a third-party request disclosing something close to a
 *    diagnosis, so we only render logos served from our own origin. A remote URL is stored
 *    (it is where the file came from) but never rendered. See DECISIONS.md D-014.
 */

export interface LogoBearing {
  logoUrl: string | null;
  logoPermission: boolean;
}

export function isSelfHostedLogo(logoUrl: string | null | undefined): boolean {
  if (!logoUrl) return false;
  const value = logoUrl.trim();
  return value.startsWith("/") && !value.startsWith("//");
}

/** True only when we may render the logo as an image. Otherwise: the name, as text. */
export function canShowLogo(charity: LogoBearing): boolean {
  return charity.logoPermission && isSelfHostedLogo(charity.logoUrl);
}

/** Why a logo is not being shown. For editors, never for the public. */
export function logoSuppressionReason(charity: LogoBearing): string | null {
  if (!charity.logoPermission) {
    return charity.logoUrl
      ? "We hold a logo file but no permission to use it, so the name shows as text."
      : "No permission to use the logo, so the name shows as text.";
  }
  if (!charity.logoUrl) return "No logo file on this listing.";
  if (!isSelfHostedLogo(charity.logoUrl)) {
    return "The logo is hosted on the charity's own site. We only serve logos ourselves, so the name shows as text.";
  }
  return null;
}
