/**
 * The questionnaire engine.
 *
 * Questionnaires are data. Nothing in here names a questionnaire, a question or an answer:
 * everything is read from a `QuestionnaireVersion` row at the moment it is needed, which is
 * what lets an admin publish a new version without a deployment (brief 7.3).
 *
 * The parts, and where each rule lives:
 *
 * - `definition.ts` — what a version may contain, and the checks that make publishing safe.
 * - `answers.ts`    — an answer set either matches its version's items or it is rejected.
 * - `scoring.ts`    — sum, mean and a custom map. Arithmetic, never interpretation.
 * - `red-flags.ts`  — `evaluateRedFlags(version, answers)`, consumed by the safety milestone.
 * - `versions.ts`   — a published version is immutable; a change makes a new version.
 * - `responses.ts`  — every response is tied to the exact version answered.
 * - `baseline.ts`   — the onboarding baseline, and what makes a response the baseline.
 * - `drafts.ts`     — save and resume, for a phone put down in a waiting room.
 * - `admin.ts`      — creating and publishing a version with no code change.
 */

export * from "./definition";
export * from "./answers";
export * from "./scoring";
export * from "./red-flags";
export * from "./form";
export {
  createDraftVersion,
  createQuestionnaire,
  getQuestionnaireByKey,
  listQuestionnaires,
  loadVersion,
  publishedVersionOf,
  publishVersion,
  PublishedVersionError,
  updateDraftVersion,
  updateQuestionnaire,
  type QuestionnaireSummary,
  type VersionView,
} from "./versions";
export * from "./responses";
export * from "./baseline";
