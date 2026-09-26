// @vitest-environment jsdom
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { SiteGuide } from "@/components/guide/site-guide";
import { answerGuide, GUIDE_STARTERS, GUIDE_TOPICS } from "@/lib/guide/answer";
import { SUPPORT_CONTACTS } from "@/lib/safety/constants";

/**
 * The site guide looks like a chat, which is exactly why these rules need writing down as
 * tests. Somebody will type the worst thing that has ever happened to them into it, and
 * somebody will ask it whether to double a dose.
 */

function routeExists(href: string): boolean {
  const path = href.split("?")[0].slice(1);
  return ["(public)", "(account)", "(auth)"].some((group) =>
    existsSync(join(process.cwd(), "src/app", group, path, "page.tsx")),
  );
}

describe("the guide's replies", () => {
  it.each([
    "I want to kill myself",
    "i dont want to be here anymore",
    "I've been self-harming again",
    "I think I've taken an overdose",
    "my dad has chest pain",
    "I can't breathe",
    "I need help now",
    "Suicidal thoughts and depression",
  ])("puts the crisis numbers first for %j, and nothing else", (text) => {
    const reply = answerGuide(text);
    expect(reply.kind).toBe("crisis");
    expect(reply.links.map((link) => link.href)).toEqual(SUPPORT_CONTACTS.map((c) => c.href));
    // Rule 5: never a charity or a donation beside the crisis numbers.
    expect(reply.links.some((link) => /charit|donat|causes/.test(link.href))).toBe(false);
  });

  it("checks for crisis before anything that looks like navigation", () => {
    // "medicine" and "overdose" together must not become a link to the medicines pages.
    expect(answerGuide("overdose on my medicine").kind).toBe("crisis");
  });

  it.each([
    "Should I stop taking sertraline?",
    "How much ibuprofen can I take? what dose",
    "is it safe to take codeine with alcohol",
    "Does it work for migraines",
    "what's the best treatment for MS",
    "Do I have diabetes?",
    "can I take paracetamol and ibuprofen together",
  ])("declines to give medical advice for %j", (text) => {
    const reply = answerGuide(text);
    expect(reply.kind).toBe("medical");
    expect(reply.text).toMatch(/can't answer that/);
    expect(reply.text).toMatch(/doesn't give medical advice/);
  });

  it("never writes a health claim, a recommendation or a dose into any reply", () => {
    const texts = [
      ...GUIDE_TOPICS.map((topic) => topic.text),
      answerGuide("should I take it").text,
      answerGuide("help now").text,
      answerGuide("xyzzy").text,
    ];
    for (const text of texts) {
      expect(text).not.toMatch(
        /\b(recommend|improv|works? for|effective|\d+\s?mg|you should take)\b/i,
      );
    }
  });

  it.each([
    ["I've just been diagnosed with MS", "/conditions"],
    ["where are the medicines", "/medicines"],
    ["I want to track my symptoms", "/log"],
    ["how do I report a side effect", "https://yellowcard.mhra.gov.uk"],
    ["I have a GP appointment next week", "/timeline/handover"],
    ["something you wrote is wrong", "/corrections"],
    ["stop using my data for research", "/settings/consent"],
    ["I'd like to donate to a charity", "/charities"],
    ["stories about famous people", "/stories"],
    ["how do I sign in", "/sign-in"],
  ])("sends %j to %s", (text, href) => {
    const reply = answerGuide(text);
    expect(reply.kind).toBe("topic");
    expect(reply.links.map((link) => link.href)).toContain(href);
  });

  it("answers every starter button with something other than 'not sure'", () => {
    for (const starter of GUIDE_STARTERS) {
      expect(answerGuide(starter).kind).not.toBe("fallback");
    }
  });

  it("offers a site search when it does not know, capped at the search length", () => {
    const reply = answerGuide("tinnitus");
    expect(reply.kind).toBe("fallback");
    expect(reply.links[0].href).toBe("/?q=tinnitus");

    const long = answerGuide("a".repeat(400));
    expect(decodeURIComponent(long.links[0].href.slice(4))).toHaveLength(100);
  });

  it("only links to pages that exist", () => {
    const hrefs = [
      ...GUIDE_TOPICS.flatMap((topic) => topic.links),
      ...answerGuide("should I take it").links,
      ...answerGuide("unknown words").links,
    ]
      .filter((link) => !link.external)
      .map((link) => link.href);

    expect(
      hrefs.filter((href) => href !== "/" && !href.startsWith("/?") && !routeExists(href)),
    ).toEqual([]);
  });
});

describe("the guide keeps what people type to itself", () => {
  const sources = ["src/lib/guide/answer.ts", "src/components/guide/site-guide.tsx"].map((file) =>
    readFileSync(join(process.cwd(), file), "utf8"),
  );

  it("never sends, stores or logs anything", () => {
    for (const source of sources) {
      expect(source).not.toMatch(
        /\bfetch\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB|console\.|"use server"/,
      );
    }
  });

  it("does not reach the database or any server module", () => {
    for (const source of sources) {
      expect(source).not.toMatch(/@\/lib\/(db|search|auth|research)|@prisma|anthropic|openai/);
    }
  });
});

describe("the guide panel", () => {
  it("opens from a labelled button, takes a question, and answers in a live region", async () => {
    const user = userEvent.setup();
    render(<SiteGuide />);

    const launcher = screen.getByRole("button", { name: "Ask us where" });
    expect(launcher).toHaveAttribute("aria-expanded", "false");
    await user.click(launcher);

    expect(screen.getByRole("dialog", { name: "Find your way" })).toBeInTheDocument();
    const input = screen.getByRole("textbox", { name: "What are you looking for?" });
    expect(input).toHaveFocus();
    expect(
      screen.getByText(/nothing you type here is saved or sent anywhere/i),
    ).toBeInTheDocument();

    await user.type(input, "where are the medicines{Enter}");
    const log = screen.getByRole("log");
    expect(log).toHaveAttribute("aria-live", "polite");
    expect(screen.getByRole("link", { name: "Medicines" })).toHaveAttribute("href", "/medicines");
    expect(input).toHaveValue("");
  });

  it("answers a starter button as if it had been typed", async () => {
    const user = userEvent.setup();
    render(<SiteGuide />);
    await user.click(screen.getByRole("button", { name: "Ask us where" }));
    await user.click(screen.getByRole("button", { name: "I need help now" }));

    expect(screen.getByRole("link", { name: /Samaritans — 116 123/ })).toHaveAttribute(
      "href",
      "tel:116123",
    );
    // The starters go once somebody has asked something.
    expect(screen.queryByRole("list", { name: "Things you can ask" })).toBeNull();
  });

  it("closes on Escape and gives focus back to the button that opened it", async () => {
    const user = userEvent.setup();
    render(<SiteGuide />);
    await user.click(screen.getByRole("button", { name: "Ask us where" }));
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Ask us where" })).toHaveFocus();
  });
});
