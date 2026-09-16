import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/tracking/dates";
import { interventionTypeLabel } from "@/lib/tracking/interventions";
import { stopReasonLabel } from "@/lib/tracking/treatments";
import type { InterventionType, StopReason } from "@/generated/prisma";

export interface TreatmentSummaryItem {
  id: string;
  dose: string | null;
  frequency: string | null;
  route: string | null;
  startDate: Date;
  endDate: Date | null;
  stopReason: StopReason | null;
  adherenceRating: number | null;
  intervention: { name: string; type: InterventionType; dmdCode: string | null };
}

/**
 * One treatment course, shown back as it was recorded.
 *
 * Read the labels carefully before changing them. A course that has ended says "Stopped" and
 * the date, and repeats the reason the person picked from the list. It does not say the
 * treatment failed, did not suit them, or was not right — none of which we know. A course
 * that is running says "Current", which is a fact about the record and not a view about the
 * treatment.
 *
 * There are no arrows, no colours standing in for good or bad, and no comparison between one
 * course and another.
 */
export function TreatmentSummary({
  course,
  headingLevel = "h3",
}: {
  course: TreatmentSummaryItem;
  headingLevel?: "h2" | "h3" | "h4";
}) {
  const Heading = headingLevel;
  const details: { term: string; value: string }[] = [
    { term: "Kind", value: interventionTypeLabel(course.intervention.type) },
    { term: "Started", value: formatDate(course.startDate) },
  ];

  if (course.dose) details.push({ term: "Dose", value: course.dose });
  if (course.frequency) details.push({ term: "How often", value: course.frequency });
  if (course.route) details.push({ term: "How you take it", value: course.route });
  if (course.endDate) details.push({ term: "Stopped", value: formatDate(course.endDate) });
  if (course.stopReason) {
    details.push({ term: "What led to stopping", value: stopReasonLabel(course.stopReason) });
  }
  if (course.adherenceRating !== null) {
    details.push({ term: "How consistently you took it", value: `${course.adherenceRating} out of 10` });
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Heading className="min-w-0 text-body font-semibold text-ink">
          {course.intervention.name}
        </Heading>
        {course.endDate ? <Badge>Stopped</Badge> : <Badge tone="forest">Current</Badge>}
      </div>

      <dl className="mt-3 grid gap-x-6 gap-y-1 text-small sm:grid-cols-[auto_1fr]">
        {details.map((detail) => (
          <div key={detail.term} className="sm:contents">
            <dt className="text-muted sm:text-right">{detail.term}</dt>
            <dd className="text-ink-soft">{detail.value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-4">
        <Link
          href={`/treatments/${course.id}`}
          className="text-small font-medium text-forest-600 underline underline-offset-2"
        >
          Open {course.intervention.name}
        </Link>
      </p>
    </Card>
  );
}
