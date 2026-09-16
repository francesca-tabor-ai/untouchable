import Link from "next/link";

import { Container } from "@/components/ui/container";
import { requireEditor } from "@/lib/auth/guards";

/**
 * The internal admin shell.
 *
 * Deliberately generic: editorial lives under /admin/editorial, and other internal areas
 * (charities, questionnaires, research) are sibling routes owned by other teams. Add a link
 * to the array below when a new area lands.
 *
 * The guard here is the outer one, not the only one. Every page and every action inside
 * calls a guard of its own — a layout is not a permission check.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireEditor();

  return (
    <>
      <header className="border-b border-line bg-forest-800 text-white">
        <Container className="flex flex-wrap items-center justify-between gap-4 py-4">
          <p className="font-display text-title">
            <Link href="/admin/editorial" className="text-white">
              UnTouchable admin
            </Link>
          </p>
          <nav aria-label="Admin areas">
            <ul className="flex flex-wrap items-center gap-5">
              {AREAS.map((area) => (
                <li key={area.href}>
                  <Link href={area.href} className="text-small text-forest-100 hover:text-white">
                    {area.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/" className="text-small text-forest-100 hover:text-white">
                  Back to the public site
                </Link>
              </li>
            </ul>
          </nav>
        </Container>
      </header>

      <main id="main" className="pb-24">
        {children}
      </main>
    </>
  );
}

/** Internal areas. Other teams add theirs here. */
const AREAS = [
  { href: "/admin/editorial", label: "Editorial" },
  { href: "/admin/charities", label: "Charities" },
  { href: "/admin/questionnaires", label: "Questionnaires" },
];
