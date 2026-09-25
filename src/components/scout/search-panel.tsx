"use client";

import * as React from "react";

import { disagreements as findDisagreements, runSearch, suggestSearch } from "@/app/(account)/research/actions";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Field, Textarea } from "@/components/ui/field";
import { SelectInput } from "@/components/ui/select";
import { CheckboxRow } from "@/components/ui/checkbox";
import { CONFLICT_NOTE, EXAMPLE_QUESTION } from "@/lib/scout/copy";
import { buildQueries, conceptsIn, relatedTo } from "@/lib/scout/query";
import type { SearchOutcome } from "@/lib/scout/search";
import { setWatches, type ScoutStore } from "@/lib/scout/storage";
import type { Disagreement } from "@/lib/scout/summarise";
import { DEFAULT_FILTERS, type Paper, type SearchFilters, type SearchQueries } from "@/lib/scout/types";

import { PaperCard } from "./paper-card";

/**
 * Ask a question, see the search it becomes, change it if you like, run it.
 *
 * The query is built in the browser by `query.ts` (rules, no network) and shown in full.
 * Claude's suggested search, when asked for, replaces the text in the same boxes — it is a
 * draft the person reads before anything runs.
 */

export function SearchPanel({ store, claudeOn }: { store: ScoutStore; claudeOn: boolean }) {
  const [question, setQuestion] = React.useState("");
  const [extra, setExtra] = React.useState<string[]>([]);
  const [queries, setQueries] = React.useState<SearchQueries | null>(null);
  const [queryNote, setQueryNote] = React.useState<string | null>(null);
  const [filters, setFilters] = React.useState<SearchFilters>(DEFAULT_FILTERS);
  const [outcome, setOutcome] = React.useState<SearchOutcome | null>(null);
  const [papers, setPapers] = React.useState<Paper[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [conflicts, setConflicts] = React.useState<{ state: "idle" | "done" | "failed"; items: Disagreement[]; message?: string }>({
    state: "idle",
    items: [],
  });
  const [searching, startSearch] = React.useTransition();
  const [suggesting, startSuggest] = React.useTransition();
  const [comparing, startCompare] = React.useTransition();
  const resultsHeading = React.useRef<HTMLHeadingElement>(null);

  const named = conceptsIn(question);
  const related = relatedTo(named);

  const build = (nextExtra = extra) => {
    if (question.trim().length < 3) return;
    setQueries(buildQueries(question, nextExtra));
    setQueryNote(null);
  };

  const toggleConcept = (key: string) => {
    const next = extra.includes(key) ? extra.filter((item) => item !== key) : [...extra, key];
    setExtra(next);
    if (queries) build(next);
  };

  const search = (event?: React.FormEvent) => {
    event?.preventDefault();
    if (question.trim().length < 3 && !queries) {
      setError("Type a question first, in your own words.");
      return;
    }
    const toRun = queries ?? buildQueries(question, extra);
    setQueries(toRun);
    setError(null);
    setConflicts({ state: "idle", items: [] });
    startSearch(async () => {
      try {
        const result = await runSearch({ queries: toRun, filters });
        setOutcome(result);
        setPapers(result.papers);
        resultsHeading.current?.focus();
      } catch {
        setError("The search did not work. Check the search text for a stray bracket or quote mark, then try again.");
      }
    });
  };

  const suggest = () => {
    startSuggest(async () => {
      const result = await suggestSearch(question);
      if (result.ok) {
        setQueries({ pubmed: result.pubmed, europepmc: result.europepmc });
        setQueryNote(`Suggested by Claude: ${result.explanation} Check it before you search.`);
      } else {
        setQueryNote("A suggestion could not be made just now. The search below is built from the words in your question.");
      }
    });
  };

  const compare = () => {
    startCompare(async () => {
      const result = await findDisagreements(papers.slice(0, 15).map((paper) => paper.id));
      if (result.ok) setConflicts({ state: "done", items: result.disagreements });
      else setConflicts({ state: "failed", items: [], message: "This could not be checked just now." });
    });
  };

  const watch = () => {
    if (!queries) return;
    const id = `watch-${Date.now().toString(36)}`;
    setWatches((watches) => [
      ...watches,
      {
        id,
        query: question.trim() || queries.pubmed,
        queries,
        filters,
        last_run: new Date().toISOString(),
        new_count: 0,
        seen_ids: papers.map((paper) => paper.id),
        new_ids: [],
      },
    ]);
  };

  const replace = (next: Paper) => setPapers((current) => current.map((paper) => (paper.id === next.id ? next : paper)));
  const titleOf = (id: string) => papers.find((paper) => paper.id === id)?.title ?? id;
  const alreadyWatched = queries ? store.watches.some((topic) => topic.queries.pubmed === queries.pubmed) : false;

  return (
    <div className="space-y-10">
      <form onSubmit={search} className="max-w-3xl space-y-6" noValidate>
        <Field label="Your question" hint="In your own words. Name the condition first, then what you wonder about." required error={error ?? undefined}>
          {(props) => (
            <Textarea
              {...props}
              value={question}
              onChange={(event) => {
                setQuestion(event.target.value);
                setQueries(null);
              }}
              placeholder={EXAMPLE_QUESTION}
              className="min-h-24"
            />
          )}
        </Field>
        {question === "" ? (
          <Button type="button" variant="link" size="sm" className="h-auto px-0" onClick={() => setQuestion(EXAMPLE_QUESTION)}>
            Try the example question
          </Button>
        ) : null}

        {related.length > 0 ? (
          <fieldset>
            <legend className="text-small font-medium text-ink">Also search for</legend>
            <p className="mt-1 text-small text-muted">Related areas researchers look at. Add any that interest you.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {related.map((concept) => {
                const on = extra.includes(concept.key);
                return (
                  <button
                    key={concept.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleConcept(concept.key)}
                    className={`rounded-pill border px-4 py-2 text-small font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600 ${
                      on ? "border-forest-800 bg-forest-800 text-white" : "border-line bg-white text-forest-700 hover:bg-forest-50"
                    }`}
                  >
                    {on ? "✓ " : "+ "}
                    {concept.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        <fieldset className="grid gap-5 sm:grid-cols-3">
          <legend className="sr-only">Filters</legend>
          <Field label="Published in the last">
            {(props) => (
              <SelectInput
                {...props}
                value={filters.years}
                onChange={(event) => setFilters({ ...filters, years: Number(event.target.value) })}
              >
                <option value={2}>2 years</option>
                <option value={5}>5 years</option>
                <option value={10}>10 years</option>
                <option value={20}>20 years</option>
              </SelectInput>
            )}
          </Field>
          <Field label="Type of study">
            {(props) => (
              <SelectInput
                {...props}
                value={filters.studyType}
                onChange={(event) => setFilters({ ...filters, studyType: event.target.value as SearchFilters["studyType"] })}
              >
                <option value="any">Any</option>
                <option value="systematic_review">Reviews of many studies</option>
                <option value="randomised_trial">Randomised trials</option>
                <option value="observational">Observational studies</option>
                <option value="case_report">Case reports</option>
              </SelectInput>
            )}
          </Field>
          <Field label="Order">
            {(props) => (
              <SelectInput
                {...props}
                value={filters.sort}
                onChange={(event) => setFilters({ ...filters, sort: event.target.value as SearchFilters["sort"] })}
              >
                <option value="relevance">Closest match first</option>
                <option value="newest">Newest first</option>
              </SelectInput>
            )}
          </Field>
        </fieldset>

        <div className="space-y-2">
          <CheckboxRow
            name="openAccessOnly"
            label="Only papers free to read"
            checked={filters.openAccessOnly}
            onCheckedChange={(checked) => setFilters({ ...filters, openAccessOnly: checked })}
          />
          <CheckboxRow
            name="humansOnly"
            label="Only studies in people"
            description="Leaves out studies done only in animals or in cells."
            checked={filters.humansOnly}
            onCheckedChange={(checked) => setFilters({ ...filters, humansOnly: checked })}
          />
        </div>

        <details
          className="rounded-card border border-line bg-white p-5"
          onToggle={(event) => {
            if (event.currentTarget.open && !queries) build();
          }}
        >
          <summary className="cursor-pointer text-small font-medium text-forest-700">
            See and change the search
          </summary>
          <div className="mt-4 space-y-5">
            {named.length > 0 ? (
              <p className="text-small text-muted">
                We found these in your question: {named.map((concept) => concept.label).join(", ")}. The first is the main subject; the
                rest are searched as &ldquo;any of these&rdquo;.
              </p>
            ) : (
              <p className="text-small text-muted">We did not recognise a condition in your question, so the search uses your words as they are.</p>
            )}
            {queryNote ? <p className="text-small text-ink-soft">{queryNote}</p> : null}
            <Field label="PubMed search" hint="Uses MeSH, the medical index's own headings, and words in titles and abstracts.">
              {(props) => (
                <Textarea
                  {...props}
                  value={queries?.pubmed ?? ""}
                  onFocus={() => (queries ? null : build())}
                  onChange={(event) => setQueries({ pubmed: event.target.value, europepmc: queries?.europepmc ?? "" })}
                  className="min-h-28 font-mono text-small"
                />
              )}
            </Field>
            <Field label="Europe PMC search" hint="Words in titles and abstracts.">
              {(props) => (
                <Textarea
                  {...props}
                  value={queries?.europepmc ?? ""}
                  onFocus={() => (queries ? null : build())}
                  onChange={(event) => setQueries({ pubmed: queries?.pubmed ?? "", europepmc: event.target.value })}
                  className="min-h-20 font-mono text-small"
                />
              )}
            </Field>
            {claudeOn ? (
              <Button type="button" variant="secondary" size="sm" onClick={suggest} disabled={suggesting || question.trim().length < 3}>
                {suggesting ? "Asking Claude…" : "Ask Claude to suggest a search"}
              </Button>
            ) : null}
          </div>
        </details>

        <Button type="submit" disabled={searching}>
          {searching ? "Searching…" : "Search"}
        </Button>
      </form>

      <section aria-labelledby="results-heading" aria-busy={searching}>
        {outcome ? (
          <>
            <h2 id="results-heading" ref={resultsHeading} tabIndex={-1} className="text-title focus-visible:outline-none">
              {papers.length === 0 ? "No papers found" : `${papers.length} papers`}
            </h2>
            <p className="mt-2 text-small text-muted">
              {outcome.totals.pubmed !== null ? `PubMed has ${outcome.totals.pubmed} matching records. ` : ""}
              {outcome.totals.europepmc !== null ? `Europe PMC has ${outcome.totals.europepmc}. ` : ""}
              We show the closest matches from each, with duplicates taken out.
            </p>

            {outcome.unavailable.length > 0 ? (
              <Callout tone="warm" className="mt-4" title="Part of the search is missing">
                <p>
                  {outcome.unavailable.join(" and ")} did not answer, so these results come from the other source only. Try again in a few
                  minutes.
                </p>
              </Callout>
            ) : null}

            {papers.length === 0 ? (
              <p className="mt-4 text-body text-ink-soft">
                Try fewer words, a longer time span, or taking off a filter. You can also change the search text directly.
              </p>
            ) : (
              <div className="mt-6 flex flex-wrap gap-3">
                <Button type="button" variant="secondary" size="sm" onClick={watch} disabled={alreadyWatched || !queries}>
                  {alreadyWatched ? "You are watching this search" : "Watch this search for new papers"}
                </Button>
                {claudeOn && papers.length >= 2 ? (
                  <Button type="button" variant="secondary" size="sm" onClick={compare} disabled={comparing}>
                    {comparing ? "Reading the abstracts…" : "Where do these papers disagree?"}
                  </Button>
                ) : null}
              </div>
            )}

            {conflicts.state !== "idle" ? (
              <section aria-labelledby="conflicts-heading" className="mt-6 rounded-card border border-line bg-white p-6">
                <h3 id="conflicts-heading" className="text-title">
                  Where these papers disagree
                </h3>
                <p className="mt-2 text-small text-muted">{CONFLICT_NOTE} Written by Claude from the abstracts.</p>
                {conflicts.state === "failed" ? <p className="mt-4 text-body">{conflicts.message}</p> : null}
                {conflicts.state === "done" && conflicts.items.length === 0 ? (
                  <p className="mt-4 text-body">Claude found no clear disagreement between these abstracts.</p>
                ) : null}
                <ul className="mt-4 space-y-6">
                  {conflicts.items.map((item) => (
                    <li key={item.topic}>
                      <h4 className="font-semibold text-ink">{item.topic}</h4>
                      <div className="mt-2 grid gap-4 sm:grid-cols-2">
                        {[item.one_side, item.other_side].map((sideOf, index) => (
                          <div key={index} className="rounded-field bg-cream-50 p-4">
                            <p className="text-small text-ink">{sideOf.finding}</p>
                            <ul className="mt-2 space-y-1 text-small text-muted">
                              {sideOf.paper_ids.map((id) => (
                                <li key={id}>{titleOf(id)}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <ol className="mt-8 space-y-6">
              {papers.map((paper) => (
                <li key={paper.id}>
                  <PaperCard paper={paper} store={store} claudeOn={claudeOn} onChange={replace} topicTerms={named.map((concept) => concept.keywords[0])} />
                </li>
              ))}
            </ol>
          </>
        ) : (
          <h2 id="results-heading" ref={resultsHeading} tabIndex={-1} className="sr-only">
            Results will appear here
          </h2>
        )}
      </section>
    </div>
  );
}
