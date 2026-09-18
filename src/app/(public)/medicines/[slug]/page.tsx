import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  MedicineContentNote,
  NotMedicalAdvice,
  SubstanceSupport,
} from "@/components/medicines/medicine-safety";
import { MedicineStories } from "@/components/medicines/medicine-stories";
import { SupportSignposting } from "@/components/stories/safety-blocks";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { getPublicMedicine, MEDICINE_TYPE_LABELS } from "@/lib/medicines/queries";
import { INDEPENDENT_SOURCE_NOTE, medicinePageContentNote } from "@/lib/medicines/safety";

/**
 * One medicine.
 *
 * What it is, in our own words from an independent source, and the published stories of
 * people who have talked about it. Nothing here says a medicine helped or harmed anybody:
 * it shows what people said and what the NHS, the BNF or the electronic Medicines
 * Compendium says the medicine is. AGENTS.md rules 9, 14 and 15.
 *
 * Rendered on every request with no caching, so a retracted story disappears from this page
 * on the next request — the same promise the stories hub makes, tested in
 * tests/unit/medicine-visibility.test.ts.
 *
 * There is no donation prompt on this page. `/medicines` is not one of the charity team's
 * approved `DONATION_SURFACES`, and their policy defaults to no prompt on a surface nobody
 * has decided about. See DECISIONS.md D-047.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const medicine = await getPublicMedicine(slug);
  if (!medicine) return { title: "Medicine not found" };

  return {
    title: medicine.name,
    description: medicine.summary.slice(0, 180),
    alternates: { canonical: `/medicines/${medicine.slug}` },
  };
}

export default async function MedicinePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const medicine = await getPublicMedicine(slug);
  if (!medicine) notFound();

  const note = medicinePageContentNote(medicine);

  return (
    <>
      <section className="border-b border-line bg-cream-50">
        <Container reading className="py-12 sm:py-16">
          <p className="text-small text-muted">
            <Link href="/medicines" className="text-forest-600 underline underline-offset-4">
              Medicines and treatments
            </Link>
          </p>

          <h1 className="mt-4 text-hero">{medicine.name}</h1>
          <p className="mt-3 flex flex-wrap items-center gap-2 text-small text-muted">
            <span>{MEDICINE_TYPE_LABELS[medicine.type]}</span>
            {medicine.isSensitiveTopic ? (
              <Badge tone="clay">People can become dependent on this</Badge>
            ) : null}
          </p>

          {note ? <MedicineContentNote note={note} /> : null}

          <h2 className="mt-10 text-display">What it is</h2>
          <p className="mt-4 text-lead text-ink-soft">{medicine.summary}</p>
          <p className="mt-4 text-small text-muted">{INDEPENDENT_SOURCE_NOTE}</p>

          <NotMedicalAdvice />
        </Container>
      </section>

      <Container className="py-12">
        {medicine.conditions.length > 0 ? (
          <section aria-labelledby="medicine-conditions-heading">
            <h2 id="medicine-conditions-heading" className="text-display">
              What people were dealing with
            </h2>
            <p className="mt-2 max-w-[38rem] text-muted">
              The conditions the stories below are about. This is a count of what people here have
              talked about, not a list of what {medicine.name} is prescribed for.
            </p>
            <ul className="mt-5 flex list-none flex-wrap gap-2 p-0">
              {medicine.conditions.map((condition) => (
                <li key={condition.slug}>
                  <Link href={`/conditions/${condition.slug}`} className="rounded-pill">
                    <Badge tone="forest">
                      {condition.name} ({condition.storyCount})
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section
          aria-labelledby="medicine-stories-heading"
          className={medicine.conditions.length > 0 ? "mt-14" : undefined}
        >
          <h2 id="medicine-stories-heading" className="text-display">
            {medicine.stories.length > 0
              ? "People who have talked about it"
              : "Stories are on their way"}
          </h2>
          {medicine.stories.length > 0 ? (
            <p className="mt-2 max-w-[38rem] text-muted">
              {medicine.stories.length} {medicine.stories.length === 1 ? "story" : "stories"}, each
              one written in our own words from what the person said publicly themselves.
            </p>
          ) : null}
          <MedicineStories stories={medicine.stories} medicineName={medicine.name} />
        </section>

        {medicine.isSensitiveTopic ? (
          <>
            <SubstanceSupport />
            <SupportSignposting heading="If you need someone to talk to now" />
          </>
        ) : null}
      </Container>
    </>
  );
}
