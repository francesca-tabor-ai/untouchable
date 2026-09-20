import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Matrix } from "@/lib/timeline/matrix";

/**
 * The grid.
 *
 * Read `src/lib/timeline/matrix.ts` and DECISIONS.md PL-49 before changing anything here.
 * This sits against AGENTS.md rule 9 on an explicit decision by the product owner, and the
 * boundary is held by the details:
 *
 *   - **The framing paragraph is rendered above the table and is not collapsible.** It is
 *     not a footnote, not a tooltip and not behind a "learn more".
 *   - **The tally never appears as a bare number.** `tallyLabel` puts what it counts in the
 *     same string, so there is no way to render the figure without the sentence.
 *   - **No colour carries meaning.** Cells say what they say in words. A grid where "fits"
 *     is red and "does not fit" is green reads as a risk score from across the room, which
 *     is precisely the reading this must not invite. It is also the accessibility rule —
 *     no colour-only meaning.
 *   - **The untested cells are listed underneath, as the output.** They are what turns into
 *     questions; the rest of the grid is working out.
 *
 * On a phone the table scrolls sideways inside its own region, labelled and focusable, so
 * somebody using a keyboard can reach the scroll.
 */
export function MatrixTable({ matrix }: { matrix: Matrix }) {
  if (matrix.columns.length === 0) {
    return (
      <p className="text-body text-muted">
        Nothing on the list yet. Add something you have been wondering about, or something
        somebody has mentioned to you.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <p className="rounded-card border border-line bg-cream-50 p-5 text-small text-ink-soft">
        {matrix.framing}
      </p>

      <div
        role="region"
        aria-label="How each symptom fits each possibility"
        tabIndex={0}
        className="overflow-x-auto rounded-card border border-line"
      >
        <table className="w-full border-collapse text-small">
          <caption className="sr-only">
            Symptoms in the first column, possibilities across the top. Each cell says how
            well that symptom fits that possibility. This is not a ranking.
          </caption>
          <thead>
            <tr className="bg-cream-100">
              <th scope="col" className="p-4 text-left font-semibold text-ink">
                Symptom
              </th>
              {matrix.columns.map((column) => (
                <th
                  key={column.candidate.id}
                  scope="col"
                  className="min-w-40 p-4 text-left font-semibold text-ink"
                >
                  {column.candidate.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row) => (
              <tr key={row.userSymptomId} className="border-t border-line">
                <th scope="row" className="p-4 text-left font-medium text-ink">
                  {row.name}
                </th>
                {row.cells.map((cell) => (
                  <td key={cell.candidateId} className="p-4 text-ink-soft">
                    {cell.label}
                    {cell.note ? (
                      <span className="mt-1 block text-legal text-muted">{cell.note}</span>
                    ) : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-line bg-cream-50">
              <th scope="row" className="p-4 text-left font-medium text-ink">
                Count
              </th>
              {matrix.columns.map((column) => (
                <td key={column.candidate.id} className="p-4 text-muted">
                  {column.tallyLabel}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      {matrix.columns.some((column) => column.problem) ? (
        <Card className="bg-cream-50">
          <h3 className="text-title">These ones cannot do anything for you yet</h3>
          <ul className="mt-4 space-y-3">
            {matrix.columns
              .filter((column) => column.problem)
              .map((column) => (
                <li key={column.candidate.id} className="text-small text-ink-soft">
                  <span className="font-medium text-ink">{column.candidate.name}</span> —{" "}
                  {column.problem}
                </li>
              ))}
          </ul>
        </Card>
      ) : null}

      {matrix.untested.length > 0 ? (
        <Card>
          <h3 className="text-title">Nobody has looked at these</h3>
          <p className="mt-2 text-small text-ink-soft">
            This is the part worth taking with you. Each one is a question.
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {matrix.untested.map((pair) => (
              <li key={`${pair.symptomName}-${pair.candidateName}`}>
                <Badge tone="quiet">
                  {pair.symptomName} and {pair.candidateName}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
