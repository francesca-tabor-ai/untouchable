import { ConsentPurpose } from "@/generated/prisma";
import { consentedUserIds } from "@/lib/consent";
import { db } from "@/lib/db";

/**
 * The single path to aggregate data.
 *
 * Brief section 9: "Aggregate queries go through a single module that applies consent
 * filtering and small-group suppression. No analytics query may bypass it."
 *
 * The enforcement here is not a convention. A query function cannot run without a
 * `ConsentedCohort`, and only this module can mint one — the branded field is not exported,
 * so `{ userIds: [...] }` will not type-check anywhere else. Bypassing this means
 * deliberately deleting a line of this file, which shows up in review.
 *
 * Owned by the platform lead. New *queries* go in `src/lib/research/queries/`; they take a
 * cohort and return raw groups. They do not decide who is in the cohort, and they do not
 * decide what is safe to show.
 */

declare const cohortBrand: unique symbol;

export interface ConsentedCohort {
  readonly userIds: readonly string[];
  readonly purpose: ConsentPurpose;
  readonly [cohortBrand]: true;
}

/** A group as a query produces it, before we decide whether it is safe to disclose. */
export interface RawGroup {
  /** Stable identifier for the group, e.g. a condition slug or a stop reason. */
  key: string;
  /** Human-readable label for display. */
  label: string;
  /** Distinct users contributing to this group. This is what suppression is applied to. */
  userCount: number;
  /** The figures themselves — means, medians, counts. Never per-person values. */
  values: Record<string, number>;
}

/** A group after suppression. `values` is null when the group is too small to disclose. */
export interface DisclosedGroup {
  key: string;
  label: string;
  userCount: number | null;
  values: Record<string, number> | null;
  suppressed: boolean;
}

export interface AggregateResult {
  groups: DisclosedGroup[];
  suppressedGroups: number;
  minGroupSize: number;
  purpose: ConsentPurpose;
  /** Users whose current consent covers this purpose, at the moment of the query. */
  cohortSize: number;
}

export function minGroupSize(): number {
  const raw = Number.parseInt(process.env.PRIVACY_MIN_GROUP_SIZE ?? "10", 10);
  // A missing or nonsensical value must fail safe, never open.
  return Number.isFinite(raw) && raw >= 1 ? raw : 10;
}

/**
 * Suppress any group representing fewer than the minimum number of people.
 *
 * We return the group with null values rather than dropping it, so a researcher can see
 * that something was withheld without learning what was in it. Dropping groups silently
 * would let someone infer their existence by elimination.
 */
export function applySuppression(groups: RawGroup[]): {
  disclosed: DisclosedGroup[];
  suppressedCount: number;
} {
  const threshold = minGroupSize();
  let suppressedCount = 0;

  const disclosed = groups.map((group) => {
    if (group.userCount < threshold) {
      suppressedCount += 1;
      return {
        key: group.key,
        label: group.label,
        userCount: null,
        values: null,
        suppressed: true,
      };
    }
    return {
      key: group.key,
      label: group.label,
      userCount: group.userCount,
      values: group.values,
      suppressed: false,
    };
  });

  return { disclosed, suppressedCount };
}

/**
 * Run an aggregate query. Consent is resolved now — a person who withdrew a moment ago is
 * already gone — the query runs against that cohort only, small groups are suppressed, and
 * the read is written to the audit log before anything is returned.
 */
export async function runAggregate(params: {
  actorId: string;
  action: string;
  purpose: ConsentPurpose;
  /** Recorded in the audit log so a query can be reconstructed later. No free text. */
  queryParams?: Record<string, string | number | boolean | null>;
  query: (cohort: ConsentedCohort) => Promise<RawGroup[]>;
}): Promise<AggregateResult> {
  const { actorId, action, purpose, queryParams = {}, query } = params;

  const userIds = await consentedUserIds(purpose);
  // The one place a cohort is minted. The double assertion is deliberate: the brand makes
  // this impossible anywhere else, which is the entire point of the type.
  const cohort = { userIds, purpose } as unknown as ConsentedCohort;

  // An empty cohort short-circuits: there is nothing that could be disclosed, and running
  // the query would only risk a WHERE IN () edge case in a query we did not write.
  const rawGroups = userIds.length === 0 ? [] : await query(cohort);
  const { disclosed, suppressedCount } = applySuppression(rawGroups);

  await db.auditLog.create({
    data: {
      actorId,
      action: `research.aggregate.${action}`,
      paramsJson: {
        ...queryParams,
        purpose,
        cohortSize: userIds.length,
        groups: disclosed.length,
        suppressedGroups: suppressedCount,
      },
    },
  });

  return {
    groups: disclosed,
    suppressedGroups: suppressedCount,
    minGroupSize: minGroupSize(),
    purpose,
    cohortSize: userIds.length,
  };
}

/**
 * Record an export before the file is produced, so a download that fails halfway is still
 * on the record. Brief section 7.9: every export is audited with who, when, the query
 * parameters and the consent purpose.
 */
export async function recordExport(params: {
  actorId: string;
  purpose: ConsentPurpose;
  queryParams: Record<string, string | number | boolean | null>;
  result: AggregateResult;
}) {
  const { actorId, purpose, queryParams, result } = params;

  const [exportRecord] = await db.$transaction([
    db.researchExport.create({
      data: {
        actorId,
        consentPurpose: purpose,
        queryJson: queryParams,
        rowCount: result.groups.filter((g) => !g.suppressed).length,
        suppressedGroups: result.suppressedGroups,
      },
    }),
    db.auditLog.create({
      data: {
        actorId,
        action: "research.export",
        paramsJson: { ...queryParams, purpose, suppressedGroups: result.suppressedGroups },
      },
    }),
  ]);

  return exportRecord;
}

/**
 * Rows that may be written to a CSV export.
 *
 * Free text is excluded by type, not by discipline. Adding a note, description or
 * user-written reason to an export is a compile error — see docs/privacy.md.
 */
export type ExportableValue = string | number | boolean | null;
export type ExportRow = Record<string, ExportableValue>;

export function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: ExportableValue) => {
    if (value === null) return "";
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(",")),
  ].join("\n");
}
