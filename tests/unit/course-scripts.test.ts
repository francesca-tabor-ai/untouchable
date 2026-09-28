// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { BODY_SYSTEMS } from "@/lib/conditions/body-systems";
import { allLessons, COURSES, findLesson } from "@/lib/courses";
import { listeningMinutes, outlineProblems, scriptProblems } from "@/lib/courses/script-rules";
import { sourceProblem } from "@/lib/courses/sources";
import { interpretationProblem } from "@/lib/tracking/no-interpretation";

/**
 * Listening courses: every script is written for the ear, is about the body rather than the
 * listener, never frightens, never interprets (rule 9), never reads as a dose (rule 17), and
 * draws only on independent sources (rule 14). DECISIONS.md LC-01.
 */

const ROOT = join(__dirname, "..", "..");

describe("the script rules catch what they exist to catch", () => {
  it.each([
    ["e.g. the cochlea", "abbreviation"],
    ["about 15,000 hair cells", "digit"],
    ["- the cochlea\n- the stapes", "bullet"],
    ["# The inner ear", "heading"],
    ["sound → eardrum", "symbol"],
    ["hearing & balance", "symbol"],
    ["the stapes (the stirrup)", "brackets"],
    ["You probably have tinnitus", "tells the listener"],
    ["You might have labyrinthitis.", "tells the listener"],
    ["It is nothing to worry about.", "reassures"],
    ["There is no need to see a GP.", "not to get help"],
    ["It can be a deadly sign.", "frightening"],
    ["Your hearing is improving.", "one way or the other"],
    ["Take two before bed.", "rule 17"],
    ["It is best taken every night.", "rule 17"],
  ])("%s", (text, expected) => {
    const problems = scriptProblems(text);
    expect(problems.join(" | ")).toContain(expected);
  });

  it("leaves ordinary spoken sentences alone", () => {
    for (const text of [
      "There are three parts to this. The first is the eardrum.",
      "You say it cock-lee-uh.",
      "If you have ever shouted to a friend underwater, you will know.",
      "The NHS says sudden hearing loss is worth an urgent GP appointment.",
      "There are thousands of hair cells in each ear.",
    ]) {
      expect(scriptProblems(text), text).toEqual([]);
    }
  });
});

describe("every course", () => {
  for (const course of COURSES) {
    describe(course.title, () => {
      it("has four to six parts of three to five lessons", () => {
        expect(course.modules.length).toBeGreaterThanOrEqual(4);
        expect(course.modules.length).toBeLessThanOrEqual(6);
        for (const part of course.modules) {
          expect(part.lessons.length, part.title).toBeGreaterThanOrEqual(3);
          expect(part.lessons.length, part.title).toBeLessThanOrEqual(5);
        }
      });

      it("uses only real body systems, and every structure links to real lessons", () => {
        const keys = BODY_SYSTEMS.map((system) => system.key) as string[];
        const ids = new Set(allLessons(course).map((lesson) => lesson.id));
        for (const system of course.body_systems) expect(keys).toContain(system);
        for (const structure of course.structures) {
          expect(course.body_systems).toContain(structure.system);
          for (const id of structure.lesson_ids) expect(ids.has(id), `${structure.name} → ${id}`).toBe(true);
        }
      });

      it("has unique lesson slugs that resolve", () => {
        const lessons = allLessons(course);
        expect(new Set(lessons.map((lesson) => lesson.slug)).size).toBe(lessons.length);
        for (const lesson of lessons) expect(findLesson(course.slug, lesson.slug)?.lesson.id).toBe(lesson.id);
      });

      it("keeps titles and summaries to the language rules", () => {
        const copy = [
          course.title,
          course.summary,
          ...course.modules.flatMap((m) => [m.title, m.summary]),
          ...allLessons(course).flatMap((l) => [l.title, l.summary]),
          ...course.structures.flatMap((s) => [s.name, s.about]),
        ];
        for (const text of copy) expect(outlineProblems(text), text).toEqual([]);
      });

      for (const lesson of allLessons(course).filter((l) => l.script_text)) {
        describe(`lesson: ${lesson.title}`, () => {
          const script = lesson.script_text!;

          it("passes every script rule", () => {
            expect(scriptProblems(script)).toEqual([]);
          });

          it("is five to ten minutes of listening", () => {
            expect(listeningMinutes(script)).toBeGreaterThanOrEqual(5);
            expect(listeningMinutes(script)).toBeLessThanOrEqual(10);
          });

          it("opens with a question and closes by looking ahead", () => {
            const opening = script.split(/\n\s*\n/)[0]!;
            expect(opening).toContain("?");
            expect(script.split(/\n\s*\n/).at(-1)).toMatch(/\bnext time\b/i);
          });

          it("has at least one source, and every source is independent", () => {
            expect(lesson.sources.length).toBeGreaterThan(0);
            for (const source of lesson.sources) expect(sourceProblem(source), source.url).toBeNull();
          });

          it("guides the pronunciation of words it actually uses", () => {
            for (const entry of lesson.pronunciation_guide) {
              expect(script.toLowerCase()).toContain(entry.term.toLowerCase());
              expect(entry.spoken).toBe(entry.spoken.toLowerCase());
            }
          });
        });
      }
    });
  }
});

describe("independent sources only", () => {
  const source = (url: string) => ({ publisher: "x", title: "x", url, supports: "a claim" });

  it("accepts the NHS, NICE, the NIH and PubMed", () => {
    for (const url of [
      "https://www.nhs.uk/conditions/tinnitus/",
      "https://www.nice.org.uk/guidance/ng155",
      "https://www.nidcd.nih.gov/health/tinnitus",
      "https://pubmed.ncbi.nlm.nih.gov/12345678/",
      "https://doi.org/10.1000/example",
    ]) {
      expect(sourceProblem(source(url)), url).toBeNull();
    }
  });

  it("refuses a company, a lookalike host, and plain http", () => {
    expect(sourceProblem(source("https://www.example-hearing-clinic.co.uk/tinnitus"))).toMatch(/rule 14/);
    expect(sourceProblem(source("https://nhs.uk.example.com/page"))).toMatch(/rule 14/);
    expect(sourceProblem(source("http://www.nhs.uk/conditions/tinnitus/"))).toMatch(/https/);
  });
});

/** Source with comments removed, as the food and tracking sweeps do. */
function copyOnly(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
}

function filesUnder(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

describe("no screen in the feature interprets anybody's health", () => {
  const files = [
    ...filesUnder(join(ROOT, "src/app/(account)/listen")),
    ...filesUnder(join(ROOT, "src/components/listen")),
  ].filter((path) => /\.tsx?$/.test(path) && !path.split("/").pop()!.startsWith("._"));

  it.each(files.map((path) => [path.replace(ROOT, "")]))("%s", (relative) => {
    expect(interpretationProblem(copyOnly(readFileSync(join(ROOT, relative), "utf8")))).toBeNull();
  });
});
