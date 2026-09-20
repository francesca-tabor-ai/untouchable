import { formatDate } from "@/lib/tracking/dates";

import type { Timeline } from "./queries";
import {
  CONFIDENCE_LABELS,
  EVENT_TYPE_LABELS,
  SOURCE_LABELS,
  STANDING_FACT_LABELS,
  STANDING_FACT_ORDER,
  SYMPTOM_STATUS_LABELS,
  UNCONFIRMED,
} from "./records";

/**
 * The whole record, as a file the person keeps.
 *
 * Markdown rather than PDF because markdown opens in anything, survives being emailed to
 * yourself, and can be read in ten years by something nobody has written yet. The JSON is
 * the same data without the prose, for anyone who wants to move it somewhere else.
 *
 * Free text is included in full. This is somebody receiving their own words back, which is
 * the opposite case from a research export, where free text never leaves at all (AGENTS.md
 * rule 7). Superseded entries are included too, marked — a record of what you used to
 * believe about your own illness is part of the record.
 */
export function timelineMarkdown(timeline: Timeline, today: Date): string {
  const lines: string[] = [`# Your timeline`, ``, `Downloaded ${formatDate(today)}.`, ``];

  lines.push(`## What you are tracking`, ``);
  if (timeline.symptoms.length === 0) lines.push("Nothing recorded.", "");
  for (const symptom of timeline.symptoms) {
    const onset = symptom.firstOnset
      ? `${formatDate(symptom.firstOnset)}${
          symptom.firstOnsetConfidence === "unconfirmed" ? ` ${UNCONFIRMED}` : ""
        }`
      : UNCONFIRMED;
    lines.push(
      `- **${symptom.name}** — ${SYMPTOM_STATUS_LABELS[symptom.status]}. Started ${onset}.`,
    );
  }
  lines.push("");

  lines.push(`## Things that go at the top of every handover`, ``);
  for (const category of STANDING_FACT_ORDER) {
    const facts = timeline.standingFacts.filter(
      (fact) => fact.active && fact.category === category,
    );
    lines.push(
      `- **${STANDING_FACT_LABELS[category]}:** ${
        facts.length > 0 ? facts.map((fact) => fact.value).join("; ") : "Nothing recorded"
      }`,
    );
  }
  lines.push("");

  const names = new Map(timeline.symptoms.map((symptom) => [symptom.id, symptom.name]));

  lines.push(`## The record`, ``);
  const entries = [
    ...timeline.observations.map((row) => ({
      when: row.occurredAt,
      text: [
        `**${names.get(row.userSymptomId) ?? "A symptom"}**`,
        row.severity === null ? null : `${row.severity} out of 10`,
        row.character,
        row.duration,
        row.triggers ? `Set off by: ${row.triggers}` : null,
        row.relievingFactors ? `Eased by: ${row.relievingFactors}` : null,
      ]
        .filter(Boolean)
        .join(" — "),
      source: row.source,
      confidence: row.confidence,
      superseded: row.supersededAt,
      reason: row.supersededReason,
      recordedAt: row.recordedAt,
    })),
    ...timeline.events.map((row) => ({
      when: row.occurredAt,
      text: [
        `**${EVENT_TYPE_LABELS[row.type]}**`,
        row.description,
        row.provider,
        row.outcome,
        row.documentRef ? `Document: ${row.documentRef}` : null,
      ]
        .filter(Boolean)
        .join(" — "),
      source: row.source,
      confidence: row.confidence,
      superseded: row.supersededAt,
      reason: row.supersededReason,
      recordedAt: row.recordedAt,
    })),
  ].sort((a, b) => a.when.getTime() - b.when.getTime());

  if (entries.length === 0) lines.push("Nothing recorded.", "");
  for (const entry of entries) {
    const provenance = `${SOURCE_LABELS[entry.source]}, ${CONFIDENCE_LABELS[entry.confidence]}`;
    const wroteLater =
      entry.recordedAt.toDateString() !== entry.when.toDateString()
        ? `, written down on ${formatDate(entry.recordedAt)}`
        : "";
    lines.push(`- ${formatDate(entry.when)} — ${entry.text} _(${provenance}${wroteLater})_`);
    if (entry.superseded) {
      lines.push(`  - Replaced on ${formatDate(entry.superseded)}. ${entry.reason ?? ""}`.trimEnd());
    }
  }
  lines.push("");

  if (timeline.candidates.length > 0) {
    lines.push(`## Things you wanted to ask about`, ``);
    for (const candidate of timeline.candidates) {
      lines.push(
        `- **${candidate.name}** — would be told apart by: ${candidate.discriminatingFeatures}. Would be settled by: ${candidate.testsThatWouldSettleIt}.`,
      );
      if (candidate.excludedBy) lines.push(`  - Set aside: ${candidate.excludedBy}`);
    }
    lines.push("");
  }

  lines.push(
    `---`,
    ``,
    `This is a record of what you wrote down. It is not a medical record and nothing in it has been checked by a clinician.`,
  );

  return lines.join("\n");
}
