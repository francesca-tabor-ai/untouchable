import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The row of people on the home page is a public surface like any other, which means a
 * retracted story has to vanish from it immediately.
 *
 * It gets that for free by reading through `listPublishedStories`, the query that filters to
 * published. The risk is a future change hand-rolling its own query here and forgetting the
 * filter — which would put a retracted person back on the front page, the single worst place
 * for one to reappear. This test makes that mistake fail the build.
 */
const source = readFileSync("src/components/home/figure-strip.tsx", "utf8");

describe("the home page figure strip", () => {
  it("reads through the published-stories query", () => {
    expect(source).toContain("listPublishedStories");
  });

  it("never queries the database directly", () => {
    expect(source).not.toContain("@/lib/db");
    expect(source).not.toMatch(/\bdb\.story\b/);
    expect(source).not.toContain("PrismaClient");
  });

  it("shows only people, not community stories", () => {
    // A community story has no public figure, and this row is about recognising a name.
    expect(source).toContain("story.figure !== null");
  });

  it("carries the content note through to the card", () => {
    // Someone should not meet a story about suicide on the front page with no warning.
    expect(source).toContain("needsContentNote");
  });

  it("renders no image, because we hold a licence for none of them", () => {
    expect(source).not.toMatch(/<img|next\/image|imageUrl/);
  });
});
