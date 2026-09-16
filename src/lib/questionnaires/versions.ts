import type { Prisma, QuestionnaireVersion } from "@/generated/prisma";
import { db } from "@/lib/db";

import {
  parseDefinition,
  readDefinition,
  type DefinitionProblems,
  type QuestionnaireDefinition,
} from "./definition";

/**
 * Questionnaires and their versions, read and written.
 *
 * Two rules live here and nowhere else:
 *
 *   1. **A published version is immutable.** Changing a question changes what a score means,
 *      so a change makes a new version. Editing a published one would silently rewrite what
 *      people were asked, months after they answered it.
 *   2. **Only a version that parses can be published.** Everything downstream — the renderer,
 *      the scorer, the red flag rules — then has a definition it can rely on, and an admin
 *      finds out about a mistake at the moment they make it rather than when somebody
 *      answers.
 *
 * There is no database constraint behind rule 1 — the schema is owned by the platform lead —
 * so it is enforced here and tested. See DECISIONS.md D-033.
 */

export class PublishedVersionError extends Error {
  constructor(readonly versionId: string) {
    super("A published questionnaire version cannot be changed. Create a new version instead.");
    this.name = "PublishedVersionError";
  }
}

/** A version, with its four JSON columns already understood. */
export interface VersionView {
  id: string;
  questionnaireId: string;
  questionnaireKey: string;
  title: string;
  licenceNote: string | null;
  version: number;
  publishedAt: Date | null;
  definition: QuestionnaireDefinition;
  /** The raw row, so `evaluateRedFlags(version, answers)` can be called with it directly. */
  row: QuestionnaireVersion;
}

const withQuestionnaire = {
  questionnaire: { select: { key: true, title: true, licenceNote: true } },
} as const;

type RowWithQuestionnaire = QuestionnaireVersion & {
  questionnaire: { key: string; title: string; licenceNote: string | null };
};

function toView(row: RowWithQuestionnaire): VersionView {
  const { questionnaire, ...version } = row;
  return {
    id: row.id,
    questionnaireId: row.questionnaireId,
    questionnaireKey: questionnaire.key,
    title: questionnaire.title,
    licenceNote: questionnaire.licenceNote,
    version: row.version,
    publishedAt: row.publishedAt,
    definition: parseDefinition(row),
    row: version as QuestionnaireVersion,
  };
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

export async function loadVersion(versionId: string): Promise<VersionView | null> {
  const row = await db.questionnaireVersion.findUnique({
    where: { id: versionId },
    include: withQuestionnaire,
  });
  return row ? toView(row) : null;
}

/** The newest published version of one questionnaire, by key. */
export async function publishedVersionOf(key: string): Promise<VersionView | null> {
  const row = await db.questionnaireVersion.findFirst({
    where: { publishedAt: { not: null }, questionnaire: { key } },
    orderBy: { version: "desc" },
    include: withQuestionnaire,
  });
  return row ? toView(row) : null;
}

/**
 * The version used for the baseline assessment: the newest published version of whichever
 * questionnaire declares `schedule.baseline`.
 *
 * Which questionnaire that is, is data. Nothing in the code names one. Swapping the
 * placeholder for a licensed instrument is publishing a version with `baseline: true`, and
 * that is the whole of the change.
 *
 * If more than one questionnaire claims the baseline, the one whose key sorts first wins, so
 * the answer is at least stable. The admin screen says when that has happened.
 */
export async function baselineVersion(): Promise<VersionView | null> {
  const rows = await db.questionnaireVersion.findMany({
    where: { publishedAt: { not: null } },
    orderBy: [{ questionnaire: { key: "asc" } }, { version: "desc" }],
    include: withQuestionnaire,
  });

  const seen = new Set<string>();
  for (const row of rows) {
    // Newest published version of each questionnaire, in key order.
    if (seen.has(row.questionnaireId)) continue;
    seen.add(row.questionnaireId);
    const view = toView(row);
    if (view.definition.schedule.baseline) return view;
  }
  return null;
}

export interface QuestionnaireSummary {
  id: string;
  key: string;
  title: string;
  licenceNote: string | null;
  versions: {
    id: string;
    version: number;
    publishedAt: Date | null;
    /** Null when the version's JSON cannot be read — a draft mid-edit, usually. */
    definition: QuestionnaireDefinition | null;
    problems: DefinitionProblems | null;
    responseCount: number;
  }[];
}

/** Every questionnaire and every version, for the admin list. */
export async function listQuestionnaires(): Promise<QuestionnaireSummary[]> {
  const rows = await db.questionnaire.findMany({
    orderBy: { key: "asc" },
    include: {
      versions: {
        orderBy: { version: "desc" },
        include: { _count: { select: { responses: true } } },
      },
    },
  });

  return rows.map((questionnaire) => ({
    id: questionnaire.id,
    key: questionnaire.key,
    title: questionnaire.title,
    licenceNote: questionnaire.licenceNote,
    versions: questionnaire.versions.map((version) => {
      const read = readDefinition(version);
      return {
        id: version.id,
        version: version.version,
        publishedAt: version.publishedAt,
        definition: read.ok ? read.definition : null,
        problems: read.ok ? null : read.problems,
        responseCount: version._count.responses,
      };
    }),
  }));
}

export async function getQuestionnaireByKey(key: string) {
  return db.questionnaire.findUnique({ where: { key } });
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

export interface DefinitionInput {
  items: unknown;
  scoring: unknown;
  redFlags: unknown;
  schedule: unknown;
}

function asJson(input: DefinitionInput) {
  return {
    itemsJson: input.items as Prisma.InputJsonValue,
    scoringJson: input.scoring as Prisma.InputJsonValue,
    redFlagRulesJson: input.redFlags as Prisma.InputJsonValue,
    scheduleJson: input.schedule as Prisma.InputJsonValue,
  };
}

export async function createQuestionnaire(input: {
  key: string;
  title: string;
  licenceNote: string;
}) {
  return db.questionnaire.create({
    data: { key: input.key, title: input.title, licenceNote: input.licenceNote },
  });
}

export async function updateQuestionnaire(
  questionnaireId: string,
  input: { title: string; licenceNote: string },
) {
  return db.questionnaire.update({
    where: { id: questionnaireId },
    data: { title: input.title, licenceNote: input.licenceNote },
  });
}

/**
 * A new draft version, numbered one above the highest that exists.
 *
 * Always a new row. There is no path in this module that turns an existing published version
 * into a different set of questions.
 */
export async function createDraftVersion(
  questionnaireId: string,
  input: DefinitionInput,
): Promise<QuestionnaireVersion> {
  const highest = await db.questionnaireVersion.findFirst({
    where: { questionnaireId },
    orderBy: { version: "desc" },
    select: { version: true },
  });

  return db.questionnaireVersion.create({
    data: {
      questionnaireId,
      version: (highest?.version ?? 0) + 1,
      publishedAt: null,
      ...asJson(input),
    },
  });
}

/** Change a draft. Refuses, loudly, if the version has been published. */
export async function updateDraftVersion(
  versionId: string,
  input: DefinitionInput,
): Promise<QuestionnaireVersion> {
  const existing = await db.questionnaireVersion.findUniqueOrThrow({
    where: { id: versionId },
    select: { publishedAt: true },
  });
  if (existing.publishedAt) throw new PublishedVersionError(versionId);

  return db.questionnaireVersion.update({ where: { id: versionId }, data: asJson(input) });
}

export type PublishResult =
  | { ok: true; version: QuestionnaireVersion }
  | { ok: false; problems: DefinitionProblems & { licence?: string; version?: string } };

/**
 * Publish a draft.
 *
 * Three things have to be true, and all three are checked here rather than in the screen:
 * the definition has to parse, the questionnaire has to carry a licence note, and the
 * version must not already be published.
 *
 * The licence note is the one that matters most. Validated instruments — EQ-5D, PROMIS —
 * carry licence terms, and loading one without a licence is not allowed. We cannot check a
 * licence automatically, so we require somebody to have written down what the terms are
 * before anybody can be asked the questions.
 */
export async function publishVersion(versionId: string): Promise<PublishResult> {
  const row = await db.questionnaireVersion.findUnique({
    where: { id: versionId },
    include: withQuestionnaire,
  });
  if (!row) return { ok: false, problems: { version: "That version no longer exists." } };

  if (row.publishedAt) {
    return {
      ok: false,
      problems: { version: "That version is already published, and a published version never changes." },
    };
  }

  const licence = row.questionnaire.licenceNote?.trim();
  if (!licence) {
    return {
      ok: false,
      problems: {
        licence:
          "Record the licence terms for this questionnaire before publishing it. A validated instrument may not be loaded here without one.",
      },
    };
  }

  const read = readDefinition(row);
  if (!read.ok) return { ok: false, problems: read.problems };

  const version = await db.questionnaireVersion.update({
    where: { id: versionId },
    data: { publishedAt: new Date() },
  });
  return { ok: true, version };
}
