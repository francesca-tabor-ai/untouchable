import { db } from "@/lib/db";

import { readDefinition, type DefinitionProblems, type QuestionnaireDefinition } from "./definition";
import {
  createDraftVersion,
  createQuestionnaire,
  getQuestionnaireByKey,
  listQuestionnaires,
  loadVersion,
  publishVersion,
  updateDraftVersion,
  updateQuestionnaire,
  type VersionView,
} from "./versions";

/**
 * The admin side: creating and publishing a questionnaire version without a code change.
 *
 * The four definitions are edited as JSON. That is a deliberate choice rather than a missing
 * form builder — the definition *is* JSON, an admin who publishes a validated instrument will
 * be pasting one in, and every mistake is caught and explained here before anything is
 * published. See DECISIONS.md D-035.
 *
 * Everything an admin can do goes through this module, so the admin screens never touch the
 * database (eslint enforces that) and never re-implement a rule.
 */

export { listQuestionnaires, loadVersion };

export interface VersionFormValues {
  key: string;
  title: string;
  licenceNote: string;
  items: string;
  scoring: string;
  redFlags: string;
  schedule: string;
}

/** Problems keyed by form field name, so each one shows beside the box it belongs to. */
export type AdminProblems = Partial<Record<keyof VersionFormValues | "form", string>>;

const KEY_PATTERN = /^[a-z][a-z0-9-]*$/;

const FIELD_LABELS: Record<"items" | "scoring" | "redFlags" | "schedule", string> = {
  items: "Questions",
  scoring: "Scoring",
  redFlags: "Red flag rules",
  schedule: "Schedule",
};

/** A starting point for a brand new questionnaire, with one of every shape worth copying. */
export const STARTER_VALUES: Omit<VersionFormValues, "key" | "title" | "licenceNote"> = {
  items: JSON.stringify(
    [
      {
        key: "overall",
        type: "scale_0_10",
        label: "Overall, how have things been over the last two weeks?",
        help: "0 is the worst it has been, 10 is the best it has been.",
        required: true,
        min: 0,
        max: 10,
      },
      {
        key: "anything_else",
        type: "text",
        label: "Is there anything else you want to note down for yourself?",
        help: "Only you will ever see this. It is never included in research.",
        required: false,
      },
    ],
    null,
    2,
  ),
  scoring: JSON.stringify({ method: "mean", items: ["overall"], scale: { min: 0, max: 10 } }, null, 2),
  redFlags: JSON.stringify([], null, 2),
  schedule: JSON.stringify(
    { baseline: false, afterTreatmentDays: [14, 90, 180], thenEveryDays: 180, generalEveryDays: 28 },
    null,
    2,
  ),
};

/** Fill the form from an existing version, so a new one starts as a copy of the last. */
export function formValuesFrom(version: VersionView): VersionFormValues {
  return {
    key: version.questionnaireKey,
    title: version.title,
    licenceNote: version.licenceNote ?? "",
    items: JSON.stringify(version.row.itemsJson, null, 2),
    scoring: JSON.stringify(version.row.scoringJson, null, 2),
    redFlags: JSON.stringify(version.row.redFlagRulesJson, null, 2),
    schedule: JSON.stringify(version.row.scheduleJson, null, 2),
  };
}

interface ParsedDefinition {
  raw: { items: unknown; scoring: unknown; redFlags: unknown; schedule: unknown };
  definition: QuestionnaireDefinition;
}

/**
 * Read the four JSON boxes. A syntax error is reported against its own box, in English, so
 * nobody has to guess which one has the stray comma.
 */
export function parseDefinitionText(
  values: Pick<VersionFormValues, "items" | "scoring" | "redFlags" | "schedule">,
): { ok: true; parsed: ParsedDefinition } | { ok: false; problems: AdminProblems } {
  const problems: AdminProblems = {};
  const raw: Record<string, unknown> = {};

  for (const field of ["items", "scoring", "redFlags", "schedule"] as const) {
    const text = values[field].trim();
    if (text === "") {
      problems[field] = `${FIELD_LABELS[field]} cannot be empty.`;
      continue;
    }
    try {
      raw[field] = JSON.parse(text);
    } catch (error) {
      problems[field] = `${FIELD_LABELS[field]} is not valid JSON: ${
        error instanceof Error ? error.message : "it could not be read"
      }`;
    }
  }

  if (Object.keys(problems).length > 0) return { ok: false, problems };

  const read = readDefinition({
    itemsJson: raw.items,
    scoringJson: raw.scoring,
    redFlagRulesJson: raw.redFlags,
    scheduleJson: raw.schedule,
  });
  if (!read.ok) return { ok: false, problems: fromDefinitionProblems(read.problems) };

  return {
    ok: true,
    parsed: {
      raw: { items: raw.items, scoring: raw.scoring, redFlags: raw.redFlags, schedule: raw.schedule },
      definition: read.definition,
    },
  };
}

function fromDefinitionProblems(problems: DefinitionProblems): AdminProblems {
  const mapped: AdminProblems = {};
  for (const [field, message] of Object.entries(problems)) {
    mapped[field as keyof VersionFormValues] = message;
  }
  return mapped;
}

export type AdminResult =
  | { ok: true; questionnaireKey: string; versionId: string; version: number }
  | { ok: false; problems: AdminProblems };

function checkIdentity(values: VersionFormValues): AdminProblems {
  const problems: AdminProblems = {};
  if (!KEY_PATTERN.test(values.key.trim())) {
    problems.key = "Use lower case letters, numbers and hyphens, starting with a letter.";
  }
  if (values.title.trim() === "") problems.title = "Give the questionnaire a title.";
  if (values.licenceNote.trim() === "") {
    problems.licenceNote =
      "Write down the licence terms. If this is a validated instrument such as EQ-5D or PROMIS, it may not be loaded here without one.";
  }
  return problems;
}

/** A brand new questionnaire, with version 1 as a draft. */
export async function createQuestionnaireDraft(values: VersionFormValues): Promise<AdminResult> {
  const problems = checkIdentity(values);
  const parsed = parseDefinitionText(values);
  if (!parsed.ok) Object.assign(problems, parsed.problems);

  if (await getQuestionnaireByKey(values.key.trim())) {
    problems.key = "A questionnaire already uses that key. Add a version to it instead.";
  }

  if (Object.keys(problems).length > 0 || !parsed.ok) return { ok: false, problems };

  const questionnaire = await createQuestionnaire({
    key: values.key.trim(),
    title: values.title.trim(),
    licenceNote: values.licenceNote.trim(),
  });
  const version = await createDraftVersion(questionnaire.id, parsed.parsed.raw);

  return { ok: true, questionnaireKey: questionnaire.key, versionId: version.id, version: version.version };
}

/** A new draft version of a questionnaire that already exists. Never edits an old one. */
export async function createNextVersionDraft(
  questionnaireKey: string,
  values: VersionFormValues,
): Promise<AdminResult> {
  const questionnaire = await getQuestionnaireByKey(questionnaireKey);
  if (!questionnaire) return { ok: false, problems: { form: "That questionnaire no longer exists." } };

  const problems = checkIdentity({ ...values, key: questionnaire.key });
  const parsed = parseDefinitionText(values);
  if (!parsed.ok) Object.assign(problems, parsed.problems);
  if (Object.keys(problems).length > 0 || !parsed.ok) return { ok: false, problems };

  await updateQuestionnaire(questionnaire.id, {
    title: values.title.trim(),
    licenceNote: values.licenceNote.trim(),
  });
  const version = await createDraftVersion(questionnaire.id, parsed.parsed.raw);

  return { ok: true, questionnaireKey: questionnaire.key, versionId: version.id, version: version.version };
}

/** Save changes to a draft. A published version reaches the `PublishedVersionError` path. */
export async function saveVersionDraft(
  versionId: string,
  values: VersionFormValues,
): Promise<AdminResult> {
  const existing = await loadVersionRow(versionId);
  if (!existing) return { ok: false, problems: { form: "That version no longer exists." } };
  if (existing.publishedAt) {
    return {
      ok: false,
      problems: {
        form: "That version is published, so it cannot be changed. Create a new version instead.",
      },
    };
  }

  const problems = checkIdentity({ ...values, key: existing.questionnaire.key });
  const parsed = parseDefinitionText(values);
  if (!parsed.ok) Object.assign(problems, parsed.problems);
  if (Object.keys(problems).length > 0 || !parsed.ok) return { ok: false, problems };

  await updateQuestionnaire(existing.questionnaireId, {
    title: values.title.trim(),
    licenceNote: values.licenceNote.trim(),
  });
  const version = await updateDraftVersion(versionId, parsed.parsed.raw);

  return {
    ok: true,
    questionnaireKey: existing.questionnaire.key,
    versionId: version.id,
    version: version.version,
  };
}

/** Publish a draft. The licence note and the definition are both checked again first. */
export async function publishVersionDraft(versionId: string): Promise<AdminResult> {
  const existing = await loadVersionRow(versionId);
  if (!existing) return { ok: false, problems: { form: "That version no longer exists." } };

  const result = await publishVersion(versionId);
  if (!result.ok) {
    const problems: AdminProblems = fromDefinitionProblems(result.problems);
    if (result.problems.licence) problems.licenceNote = result.problems.licence;
    if (result.problems.version) problems.form = result.problems.version;
    return { ok: false, problems };
  }

  return {
    ok: true,
    questionnaireKey: existing.questionnaire.key,
    versionId: result.version.id,
    version: result.version.version,
  };
}

function loadVersionRow(versionId: string) {
  return db.questionnaireVersion.findUnique({
    where: { id: versionId },
    select: {
      id: true,
      publishedAt: true,
      questionnaireId: true,
      questionnaire: { select: { key: true } },
    },
  });
}

/**
 * More than one published questionnaire claiming the baseline is not an error, but it is
 * something an admin should be told about — only one of them is actually used.
 */
export async function questionnairesClaimingBaseline(): Promise<string[]> {
  const summaries = await listQuestionnaires();
  return summaries
    .filter((questionnaire) => {
      const newest = questionnaire.versions.find((version) => version.publishedAt !== null);
      return newest?.definition?.schedule.baseline === true;
    })
    .map((questionnaire) => questionnaire.key);
}
