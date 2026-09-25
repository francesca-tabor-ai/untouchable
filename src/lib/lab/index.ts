/**
 * The Habit Experiment Lab: n-of-1 self-experiments on sleep and everyday health.
 *
 * Spec: `docs/vibe-code-prompts/01-habit-experiment-lab.md`. Decisions: DECISIONS.md HL-01
 * onwards. Proposed tables: `docs/habit-lab/schema-proposal.prisma` (not yet applied).
 *
 * Everything here is a pure function over plain records, so each rule is tested without a
 * database. Routes load rows, map them to `types.ts`, and call in.
 */

export * from "./checkin";
export * from "./experiments";
export * from "./export";
export * from "./language";
export * from "./library";
export * from "./red-flags";
export * from "./results";
export * from "./scales";
export * from "./suggestions";
export * from "./types";
