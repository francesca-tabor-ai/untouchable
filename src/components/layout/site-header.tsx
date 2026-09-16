import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-cream-100">
      <Container className="flex h-18 items-center justify-between gap-6">
        <Link href="/" className="font-display text-title tracking-tight">
          UnTouchable
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-7 md:flex">
          <HeaderLink href="/stories">Stories</HeaderLink>
          <HeaderLink href="/conditions">Conditions</HeaderLink>
          <HeaderLink href="/charities">Charities</HeaderLink>
          <HeaderLink href="/about">About</HeaderLink>
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/sign-up">Join</Link>
          </Button>
        </div>
      </Container>
    </header>
  );
}

function HeaderLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-small font-medium text-ink-soft hover:text-forest-700">
      {children}
    </Link>
  );
}
