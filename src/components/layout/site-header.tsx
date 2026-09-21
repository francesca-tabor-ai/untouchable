import Image from "next/image";
import Link from "next/link";

import { SignOutForm } from "@/components/auth/sign-out-form";
import { NavMenu } from "@/components/layout/nav-menu";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { getCurrentUser } from "@/lib/auth/guards";
import { getProfile } from "@/lib/profile";

const EXPLORE = [
  { href: "/conditions", label: "Conditions" },
  { href: "/medicines", label: "Medicines" },
  { href: "/charities", label: "Charities" },
];

const YOUR_HEALTH = [
  { href: "/log", label: "Symptom tracker" },
  { href: "/timeline", label: "Your timeline" },
  { href: "/food", label: "Food Advisor" },
];

/**
 * Navigation is visible on every screen size.
 *
 * On a phone the links move to their own row underneath, flattened — the things under each
 * dropdown are listed outright rather than hidden behind a menu inside a menu. Most people
 * meet this platform on a phone, and every tap between them and a condition page is a tap
 * they might not take.
 *
 * About is deliberately not here. It lives in the footer, where someone goes when they have
 * already decided they want to know who we are. The header is for the four things people
 * arrive wanting.
 *
 * Your Health points into the account area. Signed out, those links land on sign in with a
 * `next` back to where they were going — the guard on each page does that, not this file.
 *
 * Signed in, the buttons on the right say so by name. Somebody who has just created an
 * account needs to see, on the page they land on, that it worked and that it is theirs —
 * a header that still says "Sign in" reads as if nothing happened. The name comes from the
 * profile, which is set at sign-up, and we fall back to the email address rather than to
 * nothing if an account somehow has no name.
 *
 * This is a display, not a permission check. Every protected page calls its own guard.
 */
export async function SiteHeader() {
  const user = await getCurrentUser();
  const profile = user ? await getProfile(user.id) : null;
  const signedInAs = user ? profile?.displayName?.trim() || user.email : null;

  return <SiteHeaderView signedInAs={signedInAs} />;
}

/**
 * The header itself, with no idea who is asking. Split out so the navigation can be tested
 * in both states without a database.
 */
export function SiteHeaderView({ signedInAs }: { signedInAs: string | null }) {
  return (
    <header className="border-b border-line bg-cream-100">
      <Container className="flex h-18 items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2.5 font-display text-title tracking-tight">
          {/* Decorative: the link is already named by the wordmark beside it, so announcing
              the mark as well would read the brand twice to a screen reader. */}
          <Image src="/logo.svg" alt="" width={32} height={32} priority />
          UnTouchable
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-7 md:flex">
          <HeaderLink href="/">Home</HeaderLink>
          <NavMenu label="Explore" links={EXPLORE} />
          <NavMenu label="Your Health" links={YOUR_HEALTH} />
        </nav>

        {signedInAs ? (
          <div className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/settings"
              className="max-w-36 truncate rounded-pill px-3 py-2 text-small font-medium text-ink-soft hover:text-forest-700 sm:max-w-none"
            >
              Signed in as {signedInAs}
            </Link>
            <SignOutForm />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/sign-up">Join</Link>
            </Button>
          </div>
        )}
      </Container>

      <nav aria-label="Main" className="border-t border-line md:hidden">
        <Container className="flex gap-6 overflow-x-auto py-3">
          {[{ href: "/", label: "Home" }, ...EXPLORE, ...YOUR_HEALTH].map((item) => (
            <HeaderLink key={item.href} href={item.href} className="whitespace-nowrap">
              {item.label}
            </HeaderLink>
          ))}
        </Container>
      </nav>
    </header>
  );
}

function HeaderLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`text-small font-medium text-ink-soft hover:text-forest-700 ${className ?? ""}`}
    >
      {children}
    </Link>
  );
}
