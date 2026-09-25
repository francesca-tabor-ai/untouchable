// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const currentUser = vi.fn();
vi.mock("@/lib/auth/guards", () => ({ getCurrentUser: () => currentUser() }));

const searchPapers = vi.fn();
vi.mock("@/lib/scout/search", () => ({ searchPapers: (...args: unknown[]) => searchPapers(...args) }));

import { POST } from "@/app/api/scout/candidates/route";
import { queriesFor, researchForCandidates } from "@/lib/scout/candidates";
import { bePartOfResearchUrl } from "@/lib/scout/trial-links";
import { fromCtStudy, splitEligibility } from "@/lib/scout/trials";
import { DEFAULT_FILTERS, type WatchTopic } from "@/lib/scout/types";
import { afterRun, courseHandoff, isDue, markSeen } from "@/lib/scout/watch";

import { paper } from "./scout-fixtures";

/**
 * Where the Research Scout meets other things: the trial registry, the watch schedule, the
 * Course Generator and the symptom timeline.
 */

describe("trial listings", () => {
  const study = {
    protocolSection: {
      identificationModule: { nctId: "NCT09999999", briefTitle: "Jaw exercises for somatic tinnitus" },
      statusModule: { overallStatus: "RECRUITING" },
      eligibilityModule: {
        eligibilityCriteria:
          "Inclusion Criteria:\n\n1. Tinnitus for 6 months or more\n2. Age 18 to \\< 70\n\nExclusion Criteria:\n\n* Hearing aid users",
        sex: "ALL",
        minimumAge: "18 Years",
        maximumAge: "69 Years",
        healthyVolunteers: false,
      },
      contactsLocationsModule: {
        centralContacts: [{ name: "Study Office", email: "tinnitus.study@example.org", phone: "+44 20 0000 0000" }, { name: "No Route" }],
        locations: [
          { facility: "Imaginary Hospital", city: "London", country: "United Kingdom", contacts: [{ name: "Ada Fenwick", email: "a.fenwick@example.org" }] },
          { facility: "Somewhere Clinic", city: "Leeds", country: "United Kingdom" },
          { facility: "Elsewhere Institute", city: "Boston", country: "United States" },
        ],
      },
    },
  };

  it("splits the registry's own criteria on its own headings, unescaping as it goes", () => {
    expect(splitEligibility(study.protocolSection.eligibilityModule.eligibilityCriteria)).toEqual({
      inclusion: ["Tinnitus for 6 months or more", "Age 18 to < 70"],
      exclusion: ["Hearing aid users"],
      other: [],
    });
    expect(splitEligibility("Adults with tinnitus.").other).toEqual(["Adults with tinnitus."]);
  });

  it("keeps only places in the chosen area, and only contacts the registry prints", () => {
    const london = fromCtStudy(study, "london");
    expect(london?.locations).toEqual(["Imaginary Hospital, London"]);
    expect(london?.contact_public.map((contact) => contact.name)).toEqual(["Study Office", "Ada Fenwick"]);
    expect(london?.eligibility.ages).toBe("18 years to 69 years");
    expect(london?.status).toBe("Recruiting");

    expect(fromCtStudy(study, "uk")?.locations).toHaveLength(2);
    expect(fromCtStudy(study, "anywhere")?.locations).toHaveLength(3);

    const elsewhere = { protocolSection: { ...study.protocolSection, contactsLocationsModule: { locations: [{ city: "Boston", country: "United States" }] } } };
    expect(fromCtStudy(elsewhere, "london")).toBeNull();
  });

  it("links out to Be Part of Research rather than scraping it", () => {
    expect(bePartOfResearchUrl("tinnitus", "london")).toBe(
      "https://bepartofresearch.nihr.ac.uk/results/search-results?query=tinnitus&location=London",
    );
  });
});

describe("watched searches", () => {
  const topic: WatchTopic = {
    id: "w1",
    query: "tinnitus and jaw",
    queries: { pubmed: "tinnitus", europepmc: "tinnitus" },
    filters: DEFAULT_FILTERS,
    last_run: null,
    new_count: 0,
    seen_ids: [],
    new_ids: [],
  };
  const now = new Date("2026-09-25T09:00:00Z");

  it("runs when never run or a week old, not before", () => {
    expect(isDue(topic, now)).toBe(true);
    expect(isDue({ ...topic, last_run: "2026-09-20T09:00:00Z" }, now)).toBe(false);
    expect(isDue({ ...topic, last_run: "2026-09-18T09:00:00Z" }, now)).toBe(true);
  });

  it("marks nothing new the first time, and only unseen papers after that", () => {
    const first = afterRun(topic, [paper({ id: "a" }), paper({ id: "b" })], now);
    expect(first.new_count).toBe(0);
    expect(first.seen_ids).toEqual(["a", "b"]);

    const second = afterRun(first, [paper({ id: "a" }), paper({ id: "c" })], now);
    expect(second.new_ids).toEqual(["c"]);
    expect(second.new_count).toBe(1);
    expect(markSeen(second).new_count).toBe(0);
  });
});

describe("the hand-off to the Course Generator", () => {
  it("carries the papers and their ids, and leaves the person's notes behind", () => {
    const saved = [{ paper: paper({ id: "a", notes: "my private thought" }) }, { paper: paper({ id: "b" }) }];
    const handoff = courseHandoff(" tinnitus and the jaw ", saved, new Date("2026-09-25"));
    expect(handoff.source_paper_ids).toEqual(["a", "b"]);
    expect(handoff.topic).toBe("tinnitus and the jaw");
    expect(JSON.stringify(handoff)).not.toContain("my private thought");
    expect(handoff.papers[0]).not.toHaveProperty("notes");
  });
});

describe("research for the possibilities in play", () => {
  beforeEach(() => {
    searchPapers.mockReset();
    currentUser.mockReset();
  });

  it("anchors each search on the candidate it was given", () => {
    expect(queriesFor("TMJ disorder", ["tinnitus"]).pubmed.startsWith(`("Temporomandibular Joint Disorders"`)).toBe(true);
  });

  it("searches each candidate in the order given, and never reorders them", async () => {
    searchPapers.mockImplementation(async (queries: { pubmed: string }) => ({
      papers: [paper({ id: `p-${queries.pubmed.length}`, doi: null, pmid: String(queries.pubmed.length) })],
      unavailable: [],
    }));
    const result = await researchForCandidates({ symptoms: ["tinnitus"], candidate_conditions: ["TMJ disorder", "Eagle syndrome"] });
    expect(result.by_condition.map((entry) => entry.condition)).toEqual(["TMJ disorder", "Eagle syndrome"]);
    expect(result.papers[0].topics[0]).toBe("TMJ disorder");
    expect(searchPapers).toHaveBeenCalledTimes(2);
  });

  const post = (body: unknown) =>
    POST(new Request("http://localhost/api/scout/candidates", { method: "POST", body: JSON.stringify(body) }));

  it("refuses anyone signed out, and anyone who has not confirmed they are an adult", async () => {
    currentUser.mockResolvedValueOnce(null);
    expect((await post({ candidate_conditions: ["tinnitus"] })).status).toBe(401);
    currentUser.mockResolvedValueOnce({ id: "u", email: "u@example.org", role: "MEMBER", ageConfirmed: false });
    expect((await post({ candidate_conditions: ["tinnitus"] })).status).toBe(403);
    expect(searchPapers).not.toHaveBeenCalled();
  });

  it("refuses a request with no candidates", async () => {
    currentUser.mockResolvedValue({ id: "u", email: "u@example.org", role: "MEMBER", ageConfirmed: true });
    expect((await post({ symptoms: ["tinnitus"] })).status).toBe(400);
  });

  it("answers a signed-in adult, uncached", async () => {
    currentUser.mockResolvedValue({ id: "u", email: "u@example.org", role: "MEMBER", ageConfirmed: true });
    searchPapers.mockResolvedValue({ papers: [paper()], unavailable: [] });
    const response = await post({ symptoms: ["tinnitus"], candidate_conditions: ["TMJ disorder"] });
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    const body = await response.json();
    expect(body.papers).toHaveLength(1);
  });
});
