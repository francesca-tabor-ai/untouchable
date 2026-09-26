import Link from "next/link";

import { Container } from "@/components/ui/container";

/**
 * Present on every page, signed in or not. This is a safety commitment, not a
 * design element — do not hide it behind a disclosure, move it into a modal, or
 * shorten it. Brief section 7.8.
 */
export function SafetyFooter() {
  return (
    <footer className="mt-20 border-t border-line bg-cream-50">
      {/* The extra room at the bottom is for the "Ask us where" button, fixed over the
          bottom-right corner — without it the last line of this footer sits under it. */}
      <Container className="pt-12 pb-28">
        <div className="rounded-card border border-forest-200 bg-forest-50 p-6">
          <h2 className="text-title">If you need help now</h2>
          <p className="mt-2 text-ink-soft">
            UnTouchable does not give medical advice. If you are worried about your health, contact
            your GP or call <strong>NHS 111</strong>. In an emergency, call <strong>999</strong>.
          </p>
          <p className="mt-2 text-ink-soft">
            If you are struggling to cope, Samaritans are there day and night on{" "}
            <strong>116 123</strong>, free to call.
          </p>
        </div>

        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-display text-title">UnTouchable</p>
            <p className="mt-2 text-small text-muted">Nobody is untouchable. Nobody is alone.</p>
          </div>
          <FooterLinks
            heading="Explore"
            links={[
              { href: "/stories", label: "Stories" },
              { href: "/conditions", label: "Conditions" },
              { href: "/medicines", label: "Medicines" },
              { href: "/personalised-medicine", label: "Personalised medicine" },
              { href: "/charities", label: "Charities" },
            ]}
          />
          <FooterLinks
            heading="About"
            links={[
              { href: "/about", label: "Why we exist" },
              { href: "/about/editorial", label: "How we write stories" },
              { href: "/about/evidence", label: "How the data is used" },
            ]}
          />
          <FooterLinks
            heading="Your rights"
            links={[
              { href: "/privacy", label: "Privacy" },
              { href: "/terms", label: "Terms" },
              { href: "/corrections", label: "Request a correction or removal" },
            ]}
          />
        </div>

        <p className="mt-10 text-legal text-muted">
          UnTouchable is not a medical device and does not diagnose conditions or recommend
          treatments. It records and shows you information. Always keep working with your GP and
          clinical team.
        </p>
      </Container>
    </footer>
  );
}

function FooterLinks({
  heading,
  links,
}: {
  heading: string;
  links: { href: string; label: string }[];
}) {
  return (
    <nav aria-label={heading}>
      <h2 className="text-small font-semibold text-ink">{heading}</h2>
      <ul className="mt-3 space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-small text-muted hover:text-forest-700">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
