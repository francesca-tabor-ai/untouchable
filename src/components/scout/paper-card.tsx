"use client";

import * as React from "react";

import { summarise } from "@/app/(account)/research/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { contactRoute } from "@/lib/scout/contact";
import { SUMMARY_CAVEAT, SUMMARY_LABEL, SUMMARY_UNAVAILABLE } from "@/lib/scout/copy";
import { isSaved, refreshSavedPaper, savePaper, toggleCourse, unsavePaper, type ScoutStore } from "@/lib/scout/storage";
import { sampleSizeApplies, STUDY_TYPE_INFO } from "@/lib/scout/study-type";
import type { Author, Paper } from "@/lib/scout/types";

import { EmailDraftPanel } from "./email-draft";
import { ResearcherPanel } from "./researcher-panel";

/**
 * One paper. What it is, what kind of evidence it is, who wrote it and how to reach them.
 *
 * The order on the card is deliberate: the kind of study comes before the summary, so that a
 * case report is read as a case report before anybody reads what it found.
 */

const SOURCE_NOTE: Record<Paper["study_type_source"], string> = {
  index: "From the medical index's own tags.",
  record: "From the wording of the record, not the index's tags.",
  claude: "Worked out by Claude from the abstract, because the record did not say.",
  none: "",
};

function formatDate(date: string | null): string | null {
  if (!date) return null;
  const [year, month, day] = date.split("-");
  if (!month) return year;
  const monthName = new Date(Date.UTC(Number(year), Number(month) - 1, 1)).toLocaleString("en-GB", { month: "long", timeZone: "UTC" });
  return day ? `${Number(day)} ${monthName} ${year}` : `${monthName} ${year}`;
}

/** Early, small or not in people: said on the card in words, not left to the reader to notice. */
export function cautionFor(paper: Pick<Paper, "study_type" | "sample_size">): string | null {
  if (paper.study_type === "animal_or_lab") return "Not a study in people";
  if (paper.study_type === "case_report") return "A single patient";
  if (paper.study_type === "case_series") return "A small group with no comparison";
  if (paper.sample_size !== null && paper.sample_size < 30) return "A small study";
  return null;
}

const VISIBLE_AUTHORS = 6;

export function PaperCard({
  paper,
  store,
  claudeOn,
  onChange,
  topicTerms,
  isNew = false,
}: {
  paper: Paper;
  store: ScoutStore;
  claudeOn: boolean;
  onChange?: (paper: Paper) => void;
  topicTerms: string[];
  isNew?: boolean;
}) {
  const [summaryState, setSummaryState] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const [openAuthor, setOpenAuthor] = React.useState<string | null>(null);
  const [emailTo, setEmailTo] = React.useState<Author | null>(null);
  const [showAllAuthors, setShowAllAuthors] = React.useState(false);

  const saved = isSaved(store, paper.id);
  const inCourse = store.course.includes(paper.id);
  const info = STUDY_TYPE_INFO[paper.study_type];
  const caution = cautionFor(paper);
  const published = formatDate(paper.published_date);
  const headingId = `paper-${paper.id.replace(/[^a-z0-9]/gi, "-")}`;

  const corresponding = new Set(paper.paper_authors.filter((link) => link.is_corresponding).map((link) => link.author_id));
  const contactable = paper.authors.filter((author) => corresponding.has(author.id));
  const authors = showAllAuthors
    ? paper.authors
    : paper.authors.filter((author, index) => index < VISIBLE_AUTHORS || corresponding.has(author.id) || index === paper.authors.length - 1);
  const hidden = paper.authors.length - authors.length;

  const update = (next: Paper) => {
    onChange?.(next);
    if (saved) refreshSavedPaper(next);
  };

  const explain = () => {
    startTransition(async () => {
      const result = await summarise(paper.id);
      if (!result.ok) {
        setSummaryState(SUMMARY_UNAVAILABLE[result.reason] ?? SUMMARY_UNAVAILABLE.unavailable);
        return;
      }
      setSummaryState(null);
      const claudeType = paper.study_type_source === "none" && result.study_type && result.study_type !== "unclassified" ? result.study_type : null;
      const type = claudeType ?? paper.study_type;
      update({
        ...paper,
        plain_summary: result.summary,
        ...(claudeType
          ? { study_type: claudeType, study_type_source: "claude" as const, strength_level: STUDY_TYPE_INFO[claudeType].level }
          : {}),
        sample_size: paper.sample_size ?? (sampleSizeApplies(type) ? result.sample_size : null),
      });
    });
  };

  return (
    <Card aria-labelledby={headingId} className={isNew ? "border-forest-600" : undefined}>
      <div className="flex flex-wrap items-center gap-2">
        {isNew ? <Badge tone="forest">New since your last visit</Badge> : null}
        {paper.open_access ? <Badge tone="clay">Free to read</Badge> : null}
        {caution ? <Badge>{caution}</Badge> : null}
      </div>

      <h3 id={headingId} className="mt-3 text-title">
        <a href={paper.url} rel="noreferrer" target="_blank" className="underline-offset-4 hover:underline">
          {paper.title}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </h3>
      <p className="mt-2 text-small text-muted">
        {[paper.journal, published].filter(Boolean).join(" · ")}
        {paper.doi ? (
          <>
            {" · "}
            <a href={`https://doi.org/${paper.doi}`} rel="noreferrer" target="_blank" className="text-forest-600 underline underline-offset-2">
              DOI {paper.doi}
            </a>
          </>
        ) : null}
      </p>

      <div className="mt-5 rounded-field bg-cream-50 p-4">
        <p className="text-small font-semibold text-ink">
          {info.label}
          {info.level !== null ? <span className="font-normal text-ink-soft"> · evidence level {info.level} of 6, where 1 carries the most weight</span> : null}
        </p>
        <p className="mt-1 text-small text-ink-soft">{info.note}</p>
        {SOURCE_NOTE[paper.study_type_source] ? <p className="mt-1 text-small text-muted">{SOURCE_NOTE[paper.study_type_source]}</p> : null}
        <p className="mt-2 text-small text-ink-soft">
          {paper.sample_size !== null ? `Number of people studied: ${paper.sample_size.toLocaleString("en-GB")}, as stated in the abstract.` : "Number of people studied: not stated in the abstract."}
        </p>
      </div>

      <div className="mt-5">
        {paper.plain_summary ? (
          <section aria-label={SUMMARY_LABEL} className="rounded-field border border-forest-200 bg-forest-50 p-4">
            <p className="text-small font-semibold text-ink">{SUMMARY_LABEL}</p>
            <p className="mt-1 text-small text-muted">{SUMMARY_CAVEAT}</p>
            <dl className="mt-3 space-y-2 text-body">
              {(
                [
                  ["What they asked", paper.plain_summary.asked],
                  ["What they did", paper.plain_summary.did],
                  ["What they found", paper.plain_summary.found],
                  ["Why it matters to the research", paper.plain_summary.why_it_matters],
                  ["What limits it", paper.plain_summary.limits],
                ] as const
              ).map(([term, detail]) => (
                <div key={term}>
                  <dt className="text-small font-semibold text-ink">{term}</dt>
                  <dd className="text-ink-soft">{detail}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : claudeOn && paper.abstract ? (
          <Button type="button" variant="secondary" size="sm" onClick={explain} disabled={pending}>
            {pending ? "Writing a summary…" : "Explain in plain English"}
          </Button>
        ) : (
          <p className="text-small text-muted">{paper.abstract ? SUMMARY_UNAVAILABLE["not-configured"] : SUMMARY_UNAVAILABLE["no-abstract"]}</p>
        )}
        {summaryState ? (
          <p role="status" className="mt-3 text-small text-ink-soft">
            {summaryState}
          </p>
        ) : null}
      </div>

      {paper.abstract ? (
        <details className="mt-4">
          <summary className="cursor-pointer text-small font-medium text-forest-700">The authors&rsquo; abstract, in their words</summary>
          <div className="mt-3 space-y-3 text-small text-ink-soft">
            {paper.abstract.split(/\n{2,}/).map((part, index) => (
              <p key={index}>{part}</p>
            ))}
          </div>
        </details>
      ) : null}

      <section className="mt-5" aria-label="Authors">
        <p className="text-small font-semibold text-ink">Authors</p>
        <ul className="mt-2 space-y-2">
          {authors.map((author) => {
            const isContact = corresponding.has(author.id);
            return (
              <li key={author.id} className="text-small">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className={isContact ? "font-semibold text-ink" : "text-ink-soft"}>{author.name}</span>
                  {isContact ? <Badge tone="forest">Contact for this paper</Badge> : null}
                  <button
                    type="button"
                    aria-expanded={openAuthor === author.id}
                    onClick={() => setOpenAuthor(openAuthor === author.id ? null : author.id)}
                    className="text-forest-600 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600"
                  >
                    {openAuthor === author.id ? "Hide" : "About this researcher"}
                  </button>
                </div>
                {author.institution ? <p className="text-muted">{author.institution}</p> : null}
                {openAuthor === author.id ? (
                  <ResearcherPanel author={author} paperDoi={paper.doi} topicTerms={topicTerms} onWrite={() => setEmailTo(author)} />
                ) : null}
              </li>
            );
          })}
        </ul>
        {hidden > 0 ? (
          <button type="button" onClick={() => setShowAllAuthors(true)} className="mt-2 text-small text-forest-600 underline underline-offset-2">
            Show {hidden} more {hidden === 1 ? "author" : "authors"}
          </button>
        ) : null}
      </section>

      <div className="mt-6 flex flex-wrap gap-3">
        {saved ? (
          <Button type="button" variant="secondary" size="sm" onClick={() => unsavePaper(paper.id)}>
            Remove from reading list
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={() => savePaper(paper)}>
            Save to reading list
          </Button>
        )}
        {saved ? (
          <Button type="button" variant="secondary" size="sm" aria-pressed={inCourse} onClick={() => toggleCourse(paper.id, !inCourse)}>
            {inCourse ? "✓ Chosen for a course" : "Choose for a course"}
          </Button>
        ) : null}
        {contactable[0] && contactRoute(contactable[0]).kind === "email" ? (
          <Button type="button" variant="secondary" size="sm" onClick={() => setEmailTo(contactable[0])}>
            Draft an email to {contactable[0].name}
          </Button>
        ) : null}
      </div>

      {emailTo ? <EmailDraftPanel author={emailTo} paper={paper} claudeOn={claudeOn} onClose={() => setEmailTo(null)} /> : null}
    </Card>
  );
}
