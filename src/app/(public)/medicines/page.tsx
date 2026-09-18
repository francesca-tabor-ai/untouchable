import type { Metadata } from "next";
import Link from "next/link";

import { MedicineCardGrid } from "@/components/medicines/medicine-card";
import { NotMedicalAdvice } from "@/components/medicines/medicine-safety";
import { Container } from "@/components/ui/container";
import { listPublicMedicines } from "@/lib/medicines/queries";
import { INDEPENDENT_SOURCE_NOTE } from "@/lib/medicines/safety";

/**
 * The medicines index.
 *
 * Server-rendered on every request, with no caching, for the same reason the stories hub is:
 * the story counts here are published-only, and a retracted story has to be out of them on
 * the next request rather than the next revalidation.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Medicines and treatments",
  description:
    "What these medicines and treatments are, in plain English, and the people who have talked about taking them.",
  alternates: { canonical: "/medicines" },
};

export default async function MedicinesPage() {
  const medicines = await listPublicMedicines();

  return (
    <>
      <section className="border-b border-line bg-cream-50">
        <Container className="py-12 sm:py-16">
          <div className="max-w-[38rem]">
            <h1 className="text-hero">Medicines and treatments</h1>
            <p className="mt-5 text-lead text-ink-soft">
              Being handed a prescription and a leaflet you cannot follow is its own kind of
              lonely. Here is what each of these is, in plain words, and the people who have
              talked publicly about taking it.
            </p>
          </div>
          <NotMedicalAdvice />
          <p className="mt-4 max-w-[38rem] text-small text-muted">{INDEPENDENT_SOURCE_NOTE}</p>
        </Container>
      </section>

      <Container className="py-12">
        <h2 className="sr-only">All medicines and treatments</h2>
        {medicines.length > 0 ? (
          <MedicineCardGrid medicines={medicines} />
        ) : (
          <p className="text-ink-soft">
            There is nothing here yet.{" "}
            <Link href="/stories" className="text-forest-600 underline underline-offset-4">
              Read the stories
            </Link>{" "}
            in the meantime.
          </p>
        )}
      </Container>
    </>
  );
}
