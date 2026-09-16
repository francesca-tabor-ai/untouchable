import Link from "next/link";

import { SignOutForm } from "@/components/auth/sign-out-form";
import { SafetyFooter } from "@/components/layout/safety-footer";
import { Container } from "@/components/ui/container";

/**
 * The shell for every signed-in page: onboarding, settings, and whatever else the account
 * area grows. Deliberately plain — the account area is where somebody does something, not
 * somewhere to be sold to.
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
      <header className="border-b border-line bg-cream-100">
        <Container className="flex h-18 items-center justify-between gap-4">
          <Link href="/" className="font-display text-title tracking-tight">
            UnTouchable
          </Link>
          <nav aria-label="Your account" className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/settings"
              className="rounded-pill px-3 py-2 text-small font-medium text-ink-soft hover:text-forest-700"
            >
              Settings
            </Link>
            <SignOutForm />
          </nav>
        </Container>
      </header>

      <main id="main">{children}</main>

      <SafetyFooter />
    </>
  );
}
