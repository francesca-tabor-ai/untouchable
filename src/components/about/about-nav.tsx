import Link from "next/link";

/**
 * The three About pages, linked to each other.
 *
 * Somebody who reads one of these usually has a question the next one answers — "who writes
 * this?" leads to "and what do you do with my data?" — so each page ends by offering the
 * other two rather than leaving them to find the footer.
 */
export const ABOUT_PAGES = [
  { href: "/about", label: "Why we exist" },
  { href: "/about/editorial", label: "How we write stories" },
  { href: "/about/evidence", label: "How the data is used" },
] as const;

export function AboutNav({ current }: { current: (typeof ABOUT_PAGES)[number]["href"] }) {
  return (
    <nav aria-label="About UnTouchable" className="mt-16 border-t border-line pt-8">
      <h2 className="text-title">More about UnTouchable</h2>
      <ul className="mt-4 space-y-3">
        {ABOUT_PAGES.filter((page) => page.href !== current).map((page) => (
          <li key={page.href}>
            <Link
              href={page.href}
              className="font-medium text-forest-600 underline underline-offset-2"
            >
              {page.label}
            </Link>
          </li>
        ))}
        <li>
          <Link
            href="/corrections"
            className="font-medium text-forest-600 underline underline-offset-2"
          >
            Request a correction or removal
          </Link>
        </li>
      </ul>
    </nav>
  );
}
