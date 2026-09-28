import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const requireAdult = vi.fn(async (returnTo?: string) => ({ id: "u1", returnTo }));
vi.mock("@/lib/auth/guards", () => ({ requireAdult: (returnTo?: string) => requireAdult(returnTo) }));

import CoursePage from "@/app/(account)/listen/[course]/page";
import LessonPage from "@/app/(account)/listen/[course]/[lesson]/page";
import ListenPage from "@/app/(account)/listen/page";
import { interpretationProblem } from "@/lib/tracking/no-interpretation";

/**
 * The listening pages, rendered. Each one runs the adult guard itself (AGENTS.md rule 10), the
 * lesson page shows the script word for word with its sources, and nothing rendered interprets
 * anybody's health.
 */

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("listening pages", () => {
  it("the course list runs the guard and lists the course", async () => {
    const html = renderToStaticMarkup(await ListenPage());
    expect(requireAdult).toHaveBeenLastCalledWith("/listen");
    expect(html).toContain('href="/listen/hearing-and-balance"');
    expect(interpretationProblem(text(html))).toBeNull();
  });

  it("the course page shows the body map and the outline", async () => {
    const html = renderToStaticMarkup(
      await CoursePage({ params: Promise.resolve({ course: "hearing-and-balance" }) }),
    );
    expect(requireAdult).toHaveBeenLastCalledWith("/listen/hearing-and-balance");
    expect(html).toContain("Cochlea");
    expect(html).toContain("Part 5: Hearing at night");
    expect(html).toContain("Not written yet");
    expect(interpretationProblem(text(html))).toBeNull();
  });

  it("the lesson page shows the script, the pronunciation guide and the sources", async () => {
    const html = renderToStaticMarkup(
      await LessonPage({
        params: Promise.resolve({ course: "hearing-and-balance", lesson: "the-snail-shell-that-hears" }),
      }),
    );
    expect(requireAdult).toHaveBeenLastCalledWith("/listen/hearing-and-balance/the-snail-shell-that-hears");
    expect(html).toContain("Audio is not switched on yet");
    expect(html).toContain("the snail shell in your head that heard it first");
    expect(html).toContain("COCK-lee-uh");
    expect(html).toContain("https://www.nidcd.nih.gov/health/how-do-we-hear");
    expect(interpretationProblem(text(html))).toBeNull();
  });

  it("an unknown course or lesson is not found, after the guard", async () => {
    await expect(CoursePage({ params: Promise.resolve({ course: "nope" }) })).rejects.toThrow();
    await expect(
      LessonPage({ params: Promise.resolve({ course: "hearing-and-balance", lesson: "nope" }) }),
    ).rejects.toThrow();
    expect(requireAdult).toHaveBeenLastCalledWith("/listen/hearing-and-balance/nope");
  });
});
