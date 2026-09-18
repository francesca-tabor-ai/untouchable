import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { MEDICINE_TYPE_LABELS, type MedicineCard as MedicineCardData } from "@/lib/medicines/queries";

/**
 * One medicine on the index.
 *
 * It says what the medicine is and how many people here have talked about it. It does not
 * say whether it worked, and there is no ordering by anything but the alphabet — a ranked
 * list of medicines would be a recommendation, and we do not make those (AGENTS.md rule 9).
 */
export function MedicineCard({ medicine }: { medicine: MedicineCardData }) {
  return (
    <Card interactive className="h-full">
      <CardTitle>
        <Link
          href={`/medicines/${medicine.slug}`}
          className="text-ink underline-offset-4 hover:text-forest-700 hover:underline"
        >
          {medicine.name}
        </Link>
      </CardTitle>
      <p className="mt-1 text-small text-muted">{MEDICINE_TYPE_LABELS[medicine.type]}</p>
      <CardBody className="line-clamp-4">{medicine.summary}</CardBody>
      <p className="mt-5 flex flex-wrap gap-2">
        <Badge tone="forest">
          {medicine.storyCount} {medicine.storyCount === 1 ? "story" : "stories"}
        </Badge>
        {medicine.isSensitiveTopic ? (
          <Badge tone="clay">People can become dependent on this</Badge>
        ) : null}
      </p>
    </Card>
  );
}

export function MedicineCardGrid({ medicines }: { medicines: MedicineCardData[] }) {
  return (
    <ul className="grid list-none gap-5 p-0 sm:grid-cols-2">
      {medicines.map((medicine) => (
        <li key={medicine.id}>
          <MedicineCard medicine={medicine} />
        </li>
      ))}
    </ul>
  );
}
