import { SiteGuide } from "@/components/guide/site-guide";
import { SafetyFooter } from "@/components/layout/safety-footer";
import { SiteHeader } from "@/components/layout/site-header";

/**
 * The shell for every signed-in page: onboarding, the daily log, the timeline, the Food
 * Advisor, settings, and whatever else the account area grows.
 *
 * It uses the same `SiteHeader` as the public and auth areas. It used to have a header of
 * its own — logo, Settings, Sign out, no navigation — which meant the navigation someone
 * had just used to reach the symptom tracker vanished the moment they arrived on it. Three
 * of the links under "Your Health" led to pages with no way back into Your Health. The
 * header already says who is signed in and links to settings, so nothing was lost by
 * dropping the second one.
 *
 * No third-party scripts of any kind are loaded here, and none may be added. Brief section
 * 9, AGENTS.md rule 11.
 *
 * Guards are not applied at this layout. Each page calls `requireUser` or `requireAdult`
 * itself, because a layout is not a reliable place to enforce anything.
 */
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main">{children}</main>
      <SafetyFooter />
      <SiteGuide />
    </>
  );
}
