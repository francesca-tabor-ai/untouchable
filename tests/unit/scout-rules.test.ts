// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { contactRoute, emailsIn } from "@/lib/scout/contact";
import * as copy from "@/lib/scout/copy";
import { draftEmail } from "@/lib/scout/email-draft";
import { templateDraft, type DraftInput } from "@/lib/scout/email-template";
import { clearScoutCache } from "@/lib/scout/http";
import { adviceProblem, doseProblem, overstatementProblem, scoutLanguageProblem } from "@/lib/scout/language";
import { CLAUDE_REQUESTS_PER_HOUR, resetClaudeLimits, takeClaudeRequest } from "@/lib/scout/limits";
import { findDisagreements, summarisePaper } from "@/lib/scout/summarise";
import { interpretationProblem } from "@/lib/tracking/no-interpretation";

import { claudeResponse, paper } from "./scout-fixtures";

/**
 * The rules the Research Scout is built around, as tests. DECISIONS.md RS-01 to RS-04.
 *
 * The carve-out from AGENTS.md rule 9 lets Claude describe a paper. It does not let anything
 * here advise, overstate, print a dose (rule 17), guess an email address, or send one.
 */

const ROOT = join(__dirname, "..", "..");

function filesUnder(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

/** Source with the comments taken out, as the food sweep does. */
function copyOnly(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
}

/** What a person reads on screen: string and JSX text in the page and its components. */
const SCREEN_FILES = [
  ...filesUnder(join(ROOT, "src/components/scout")),
  ...filesUnder(join(ROOT, "src/app/(account)/research")),
  join(ROOT, "src/lib/scout/copy.ts"),
  join(ROOT, "src/lib/scout/study-type.ts"),
  join(ROOT, "src/lib/scout/contact.ts"),
  join(ROOT, "src/lib/scout/email-template.ts"),
].filter((path) => /\.tsx?$/.test(path) && !/\/\._/.test(path));

describe("the detectors", () => {
  it("catch advice, overstatement and doses", () => {
    expect(adviceProblem("You should ask for a splint.")).toBeTruthy();
    expect(adviceProblem("This means you are likely to benefit.")).toBeTruthy();
    expect(adviceProblem("Your tinnitus may come from the jaw.")).toBeTruthy();
    expect(overstatementProblem("This proves the jaw is involved.")).toBeTruthy();
    expect(overstatementProblem("A breakthrough in tinnitus research.")).toBeTruthy();
    expect(overstatementProblem("The treatment works.")).toBeTruthy();
    expect(doseProblem("Participants took 400 mg of magnesium.")).toBeTruthy();
    expect(doseProblem("Taken twice a day for a month.")).toBeTruthy();
  });

  it("let a finding be reported as the study's finding", () => {
    expect(scoutLanguageProblem("In this study, loudness ratings fell in both groups, by a similar amount.")).toBeNull();
    expect(scoutLanguageProblem("The authors report that 120 participants took part.")).toBeNull();
    expect(scoutLanguageProblem("It was a small study of 12 people, so the result may not hold in a larger group.")).toBeNull();
  });
});

describe("every sentence on the Research Scout's screens", () => {
  it.each(SCREEN_FILES.map((path) => [path.replace(`${ROOT}/`, ""), path]))("%s keeps to the carve-out", (_, path) => {
    const source = copyOnly(readFileSync(path, "utf8"));
    expect(scoutLanguageProblem(source)).toBeNull();
    // The tracking rule too: our own copy never reads a direction into anything.
    expect(interpretationProblem(source)).toBeNull();
  });

  it("covers the standing copy", () => {
    for (const value of Object.values(copy)) {
      for (const text of typeof value === "string" ? [value] : Object.values(value)) {
        expect(scoutLanguageProblem(text)).toBeNull();
      }
    }
  });
});

describe("contact routes", () => {
  it("only ever finds an address that is printed", () => {
    expect(emailsIn("University of Nowhere. Electronic address: i.carraway@example.org.")).toEqual(["i.carraway@example.org"]);
    expect(emailsIn("Dental Institute, Imaginary College, Bristol, UK.")).toEqual([]);
  });

  it("falls back to a profile, then to saying there is nothing — never to a guess", () => {
    const withoutEmail = { public_email: null, orcid: "0000-0001-2345-6789", profile_url: null };
    const route = contactRoute(withoutEmail);
    expect(route).toMatchObject({ kind: "profile", url: "https://orcid.org/0000-0001-2345-6789" });
    expect(JSON.stringify(route)).not.toContain("@");

    const nothing = contactRoute({ public_email: null, orcid: null, profile_url: null });
    expect(nothing.kind).toBe("none");
    expect(JSON.stringify(nothing)).not.toContain("@");
  });
});

describe("talking to Claude", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    clearScoutCache();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  const summary = {
    asked: "Whether a jaw splint changes how loud tinnitus seems.",
    did: "The authors put 120 adults into two groups at random.",
    found: "Loudness ratings fell in both groups, by a similar amount.",
    why_it_matters: "It is one of few randomised trials on somatic tinnitus.",
    limits: "Based on the abstract, and followed people for six months only.",
    study_type: "randomised_trial",
    sample_size: 120,
  };

  it("sends nothing and says so when it is not switched on", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    expect(await summarisePaper(paper())).toEqual({ ok: false, reason: "not-configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the paper and nothing else, asks for structure, and labels it as from the abstract", async () => {
    fetchMock.mockResolvedValueOnce(claudeResponse(summary));
    const result = await summarisePaper(paper());
    expect(result).toMatchObject({ ok: true, summary: { based_on: "abstract", found: summary.found } });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    const body = JSON.parse(init.body);
    expect(body.model).toBe("claude-opus-5");
    expect(body.output_config.format.type).toBe("json_schema");
    expect(body.fallbacks).toBe("default");
    expect(init.headers["anthropic-beta"]).toBe("server-side-fallback-2026-07-01");
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].content).toContain(paper().abstract);
  });

  it("withholds a summary that gives advice, rather than rewording it", async () => {
    fetchMock.mockResolvedValueOnce(claudeResponse({ ...summary, why_it_matters: "You should ask your dentist about a splint." }));
    expect(await summarisePaper(paper())).toEqual({ ok: false, reason: "withheld" });
  });

  it("withholds a summary that prints a dose", async () => {
    fetchMock.mockResolvedValueOnce(claudeResponse({ ...summary, did: "Participants took 250 mg of a drug each night." }));
    expect(await summarisePaper(paper())).toEqual({ ok: false, reason: "withheld" });
  });

  it("treats a refusal or a broken answer as unavailable", async () => {
    fetchMock.mockResolvedValueOnce(claudeResponse({}, "refusal"));
    expect(await summarisePaper(paper())).toEqual({ ok: false, reason: "unavailable" });
    clearScoutCache();
    fetchMock.mockResolvedValueOnce(claudeResponse({ asked: "only half" }));
    expect(await summarisePaper(paper())).toEqual({ ok: false, reason: "unavailable" });
  });

  it("has nothing to summarise without an abstract, and does not ask", async () => {
    expect(await summarisePaper(paper({ abstract: null }))).toEqual({ ok: false, reason: "no-abstract" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("drops a disagreement that cites a paper it was not given", async () => {
    const a = paper({ id: "pmid:1" });
    const b = paper({ id: "pmid:2" });
    fetchMock.mockResolvedValueOnce(
      claudeResponse({
        disagreements: [
          { topic: "Loudness", one_side: { paper_ids: ["pmid:1"], finding: "Ratings fell." }, other_side: { paper_ids: ["pmid:2"], finding: "Ratings did not change." } },
          { topic: "Invented", one_side: { paper_ids: ["pmid:1"], finding: "x" }, other_side: { paper_ids: ["pmid:99"], finding: "y" } },
        ],
      }),
    );
    const result = await findDisagreements([a, b]);
    expect(result.ok && result.disagreements.map((item) => item.topic)).toEqual(["Loudness"]);
  });
});

describe("the email draft", () => {
  const input: DraftInput = {
    researcherName: "Imogen Carraway",
    paperTitle: "Jaw clenching and somatic tinnitus",
    paperYear: "2025",
    paperJournal: "Journal of Imaginary Otology",
    paperDoi: "10.5555/imaginary.2025.001",
    aboutMe: "I have had tinnitus since an ear infection.",
    questions: ["Did jaw movement change the sound for most people?"],
    willingToTakePart: true,
    signOff: "Sam",
    location: "London",
  };

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("is built only from what the person wrote, and does not guess a title", () => {
    const { body, subject } = templateDraft(input);
    expect(body.startsWith("Dear Imogen Carraway,")).toBe(true);
    expect(body).not.toContain("Dr ");
    expect(body).toContain(input.aboutMe);
    expect(body).toContain(input.questions[0]);
    expect(body).toContain("I live in London");
    expect(body).toContain("not asking for any");
    expect(subject).toContain("Jaw clenching and somatic tinnitus");
    expect(templateDraft({ ...input, willingToTakePart: false }).body).not.toContain("take part");
  });

  it("falls back to the template if Claude's wording adds a dose", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(claudeResponse({ subject: "Hello", body: "I take 20 mg a day." })));
    const draft = await draftEmail(input);
    expect(draft.written_by).toBe("template");
  });

  it("has no way to send anything: the module exports no sender", async () => {
    const drafting = await import("@/lib/scout/email-draft");
    expect(Object.keys(drafting).filter((name) => /send/i.test(name))).toEqual([]);
    const source = readFileSync(join(ROOT, "src/lib/scout/email-draft.ts"), "utf8");
    expect(source).not.toMatch(/from "@\/lib\/email"/);
  });
});

describe("the hourly allowance for Claude", () => {
  it("stops one person, not everybody", () => {
    resetClaudeLimits();
    const now = Date.now();
    for (let count = 0; count < CLAUDE_REQUESTS_PER_HOUR; count += 1) expect(takeClaudeRequest("a", now)).toBe(true);
    expect(takeClaudeRequest("a", now)).toBe(false);
    expect(takeClaudeRequest("b", now)).toBe(true);
    expect(takeClaudeRequest("a", now + 61 * 60 * 1000)).toBe(true);
  });
});
