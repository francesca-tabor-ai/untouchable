import Link from "next/link";

import { MedicineSourceLine } from "@/components/medicines/medicine-stories";
import { Badge } from "@/components/ui/badge";
import { MEDICINE_TYPE_LABELS, type StoryMedicine } from "@/lib/medicines/queries";

/**
 * The medicines a story is about, on the story page.
 *
 * It sits below the conditions, in the same place and the same shape, because to a reader
 * they are the same kind of fact: this is what the story is about. To us they are not quite
 * the same — saying a named person took a named drug is a heavier claim than naming their
 * condition — which is why every row here carries its own source rather than leaning on the
 * story's source list at the foot of the page.
 *
 * A medicine links to its page only when it has one. A medicine an editor has not yet
 * written up is a name, not a link, because the page behind it would be blank.
 *
 * Nothing in this block says whether the medicine helped. A context line is how the person
 * came to it — "prescribed after a bereavement", "came off it in 2019" — and never a dose,
 * a strength or how often they took it. `src/lib/medicines/dose-language.ts` refuses those
 * at the form, in the domain layer, and again in the scan over the rendered page.
 */
export function StoryMedicines({ medicines }: { medicines: StoryMedicine[] }) {
  if (medicines.length === 0) return null;

  return (
    <section aria-labelledby="story-medicines-heading" className="mt-12">
      <h2 id="story-medicines-heading" className="text-display">
        Medicines and treatments in this story
      </h2>
      <p className="mt-2 max-w-[38rem] text-muted">
        What the person said they were given or took, and where each of those came from. It is
        not a record of their treatment, and it is not advice about yours.
      </p>

      <ul className="mt-8 list-none space-y-5 p-0" data-testid="story-medicines">
        {medicines.map((medicine) => (
          <li key={medicine.id} className="rounded-card border border-line bg-white p-6">
            <h3 className="text-title">
              {medicine.slug ? (
                <Link
                  href={`/medicines/${medicine.slug}`}
                  className="text-ink underline-offset-4 hover:text-forest-700 hover:underline"
                >
                  {medicine.name}
                </Link>
              ) : (
                medicine.name
              )}
            </h3>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-small text-muted">
              <span>{MEDICINE_TYPE_LABELS[medicine.type]}</span>
              {medicine.isSensitiveTopic ? (
                <Badge tone="clay">People can become dependent on this</Badge>
              ) : null}
            </p>
            {medicine.context ? <p className="mt-3 text-ink-soft">{medicine.context}</p> : null}
            <MedicineSourceLine source={medicine.source} />
          </li>
        ))}
      </ul>
    </section>
  );
}
