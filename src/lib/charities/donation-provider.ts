/**
 * `DonationProvider` — the seam for confirmed-donation tracking.
 *
 * In the MVP, UnTouchable never takes or holds payment and never learns whether a donation
 * actually happened. We record an anonymous click through to the charity's own page, and
 * that is all we know. Brief 6.3.
 *
 * Later, a regulated donation platform may be able to tell us that a donation completed —
 * through its API or a webhook. This interface is the shape that work will take, so it can
 * be added without reopening the hand-off. **Nothing implements it yet, on purpose.**
 *
 * Two constraints any implementation must keep:
 *
 * 1. **No user data goes out.** `buildDonationUrl` receives the charity and the page kind.
 *    It is not given a user, a session, or a request, so it cannot append one to the URL.
 * 2. **No user data comes back in.** A confirmation is tied to our own opaque reference, not
 *    to a person. If a platform sends us a donor name or email, an implementation must drop
 *    it before it reaches this layer — we have nowhere to put it and no lawful basis to
 *    keep it.
 */

import type { ReferralOrigin } from "./referrals";

export interface DonationTarget {
  charityId: string;
  charityName: string;
  /** The charity's own donation page, or its page on a regulated donation platform. */
  donationUrl: string;
}

export interface DonationHandoff {
  /** Where to send the person. Must contain nothing that identifies them. */
  url: string;
  /**
   * An opaque reference for this hand-off, if the provider supports confirmations. It must
   * not be derived from a user id, a session, or anything else about the person.
   */
  reference?: string;
}

/** What a platform tells us later, if it tells us anything. Deliberately thin. */
export interface ConfirmedDonation {
  reference: string;
  charityId: string;
  /** Pounds. Optional: some platforms report only that something happened. */
  amount?: string;
  confirmedAt: Date;
  /** Whether Gift Aid was claimed by the charity or platform. Never handled by us. */
  giftAid?: boolean;
}

export interface DonationProvider {
  /** Stable identifier, e.g. "direct", "justgiving", "enthuse". */
  readonly key: string;
  /** Shown to editors in the admin, never to the public as an endorsement. */
  readonly label: string;

  /**
   * Build the URL the Donate button hands off to. Note the arguments: a charity and a page
   * kind. There is no parameter through which a person could be passed.
   */
  buildDonationUrl(target: DonationTarget, origin: ReferralOrigin): DonationHandoff;

  /**
   * Turn a webhook or API payload into a confirmed donation, or null if it is not one we
   * recognise. An implementation verifies the platform's signature here.
   */
  parseConfirmation?(payload: unknown, signature?: string): ConfirmedDonation | null;
}

/**
 * The MVP behaviour, written out so the interface is not abstract: hand off to the charity's
 * own URL, unchanged, and learn nothing back. This is not registered anywhere yet — the
 * hand-off route uses the stored `donationUrl` directly — but it documents what "no
 * provider" means.
 */
export const directHandoff: DonationProvider = {
  key: "direct",
  label: "The charity's own donation page",
  buildDonationUrl(target) {
    return { url: target.donationUrl };
  },
};
