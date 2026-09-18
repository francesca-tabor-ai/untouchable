import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

const NAV = [
  { href: "/stories", label: "Stories" },
  { href: "/conditions", label: "Conditions" },
  { href: "/medicines", label: "Medicines" },
  { href: "/charities", label: "Charities" },
  { href: "/about", label: "About" },
];

/**
 * Navigation is visible on every screen size.
 *
 * On a phone the links move to their own row underneath rather than collapsing into a menu
 * button. Most people meet this platform on a phone, and a hamburger hides the whole
 * product behind a tap and a script — this works before the JavaScript arrives, needs no
 * state, and puts the destinations in front of someone who does not yet know what is here.
 */
export function SiteHeader() {
  return (
    <header className="border-b border-line bg-cream-100">
      <Container className="flex h-18 items-center justify-between gap-6">
        <Link href="/" className="font-display text-title tracking-tight">
          UnTouchable
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-7 md:flex">
          {NAV.map((item) => (
            <HeaderLink key={item.href} href={item.href}>
              {item.label}
            </HeaderLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/sign-up">Join</Link>
          </Button>
        </div>
      </Container>

      <nav aria-label="Main" className="border-t border-line md:hidden">
        <Container className="flex gap-6 overflow-x-auto py-3">
          {NAV.map((item) => (
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
