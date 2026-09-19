import Image from "next/image";
import Link from "next/link";

import { ExploreMenu } from "@/components/layout/explore-menu";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

const EXPLORE = [
  { href: "/conditions", label: "Conditions" },
  { href: "/medicines", label: "Medicines" },
  { href: "/charities", label: "Charities" },
];

const TOP_LEVEL = [
  { href: "/stories", label: "Stories" },
  { href: "/about", label: "About" },
];

/**
 * Navigation is visible on every screen size.
 *
 * On a phone the links move to their own row underneath, flattened — the three things under
 * Explore are listed outright rather than hidden behind a menu inside a menu. Most people
 * meet this platform on a phone, and every tap between them and a condition page is a tap
 * they might not take.
 */
export function SiteHeader() {
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
          <HeaderLink href="/stories">Stories</HeaderLink>
          <ExploreMenu label="Explore" links={EXPLORE} />
          <HeaderLink href="/about">About</HeaderLink>
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
          {[TOP_LEVEL[0], ...EXPLORE, TOP_LEVEL[1]].map((item) => (
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
