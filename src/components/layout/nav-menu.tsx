"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import * as React from "react";

/**
 * A header dropdown — Explore, Your Health, and whatever else the header grows.
 *
 * Built on `<details>`/`<summary>` so it opens and closes with no JavaScript at all — a
 * navigation menu that needs a script to reveal the site's own sections is a navigation menu
 * that sometimes hides the site. The script only adds the two behaviours people expect once
 * it has loaded: Escape closes it, and so does clicking elsewhere.
 */
export function NavMenu({
  label,
  links,
}: {
  label: string;
  links: { href: string; label: string }[];
}) {
  const ref = React.useRef<HTMLDetailsElement>(null);

  React.useEffect(() => {
    const close = () => {
      if (ref.current) ref.current.open = false;
    };
    const onPointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <details ref={ref} className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-1 text-small font-medium text-ink-soft hover:text-forest-700 [&::-webkit-details-marker]:hidden">
        {label}
        <ChevronDown
          aria-hidden
          className="h-4 w-4 transition-transform duration-[--duration-quick] group-open:rotate-180"
        />
      </summary>

      <div className="absolute left-0 top-full z-50 mt-3 min-w-52 rounded-card border border-line bg-white p-2 shadow-soft">
        <ul>
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="block rounded-field px-3 py-2 text-small font-medium text-ink-soft hover:bg-cream-50 hover:text-forest-700"
                onClick={() => {
                  if (ref.current) ref.current.open = false;
                }}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
