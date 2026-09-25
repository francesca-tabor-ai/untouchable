import { bareOrcid, orcidUrl } from "./contact";
import { contactEmail, getJson, SourceUnavailableError } from "./http";

/**
 * Who a researcher is, from OpenAlex: where they work, their ORCID, what else they have
 * written on the topic, and a public page to find them through.
 *
 * OpenAlex holds no email addresses, and nothing here derives one. The contact route is
 * decided in `contact.ts` from what the paper printed; this adds a profile to fall back on.
 */

const BASE = "https://api.openalex.org";

function withPolitePool(url: string): string {
  const joined = new URL(url);
  const email = contactEmail();
  if (email) joined.searchParams.set("mailto", email);
  if (process.env.OPENALEX_API_KEY) joined.searchParams.set("api_key", process.env.OPENALEX_API_KEY);
  return joined.toString();
}

interface OpenAlexInstitution {
  id?: string;
  display_name?: string;
  ror?: string | null;
  homepage_url?: string | null;
  country_code?: string | null;
}

interface OpenAlexAuthorship {
  author?: { id?: string; display_name?: string; orcid?: string | null };
  institutions?: OpenAlexInstitution[];
  is_corresponding?: boolean;
  raw_affiliation_strings?: string[];
}

interface OpenAlexWork {
  id?: string;
  doi?: string | null;
  title?: string | null;
  display_name?: string | null;
  publication_year?: number | null;
  authorships?: OpenAlexAuthorship[];
}

interface OpenAlexAuthor {
  id?: string;
  display_name?: string;
  orcid?: string | null;
  works_count?: number;
  last_known_institutions?: OpenAlexInstitution[] | null;
}

export interface ResearcherProfile {
  name: string;
  orcid: string | null;
  orcid_url: string | null;
  openalex_url: string | null;
  institution: { name: string; homepage: string | null; ror: string | null } | null;
  /** From OpenAlex's own record of the paper. Null when OpenAlex does not have the paper. */
  is_corresponding: boolean | null;
  works_count: number | null;
  recent_on_topic: { title: string; year: number | null; url: string }[];
  /** Sources that did not answer, for the panel to say so. */
  unavailable: string[];
}

function surname(name: string): string {
  return name.toLowerCase().replace(/[^a-z\s-]/g, "").trim().split(/\s+/).at(-1) ?? "";
}

function findAuthorship(work: OpenAlexWork, name: string, orcid: string | null) {
  const authorships = work.authorships ?? [];
  if (orcid) {
    const byOrcid = authorships.find((entry) => bareOrcid(entry.author?.orcid) === orcid);
    if (byOrcid) return byOrcid;
  }
  const wanted = surname(name);
  return authorships.find((entry) => surname(entry.author?.display_name ?? "") === wanted);
}

function shortId(id: string | undefined): string | null {
  return id ? (id.split("/").at(-1) ?? null) : null;
}

export async function researcherProfile(input: {
  name: string;
  orcid: string | null;
  paperDoi: string | null;
  topicTerms: string[];
}): Promise<ResearcherProfile> {
  const unavailable: string[] = [];
  const profile: ResearcherProfile = {
    name: input.name,
    orcid: input.orcid,
    orcid_url: orcidUrl(input.orcid),
    openalex_url: null,
    institution: null,
    is_corresponding: null,
    works_count: null,
    recent_on_topic: [],
    unavailable,
  };

  try {
    let authorId: string | null = null;

    if (input.paperDoi) {
      const work = await getJson<OpenAlexWork>(
        "OpenAlex",
        withPolitePool(`${BASE}/works/doi:${encodeURIComponent(input.paperDoi)}?select=id,authorships`),
      ).catch((error: unknown) => {
        // A paper OpenAlex has not indexed is a 404, not an outage.
        if (error instanceof SourceUnavailableError && /404/.test(error.message)) return null;
        throw error;
      });
      const authorship = work ? findAuthorship(work, input.name, input.orcid) : undefined;
      if (authorship) {
        authorId = shortId(authorship.author?.id);
        profile.is_corresponding = authorship.is_corresponding ?? null;
        profile.orcid = profile.orcid ?? bareOrcid(authorship.author?.orcid);
        const institution = authorship.institutions?.[0];
        if (institution?.display_name) {
          profile.institution = { name: institution.display_name, homepage: null, ror: institution.ror ?? null };
        }
      }
    }

    if (!authorId && profile.orcid) {
      const found = await getJson<{ results?: OpenAlexAuthor[] }>(
        "OpenAlex",
        withPolitePool(`${BASE}/authors?filter=orcid:${profile.orcid}&select=id`),
      );
      authorId = shortId(found.results?.[0]?.id);
    }

    if (authorId) {
      const author = await getJson<OpenAlexAuthor>(
        "OpenAlex",
        withPolitePool(`${BASE}/authors/${authorId}?select=id,display_name,orcid,works_count,last_known_institutions`),
      );
      profile.openalex_url = `https://openalex.org/${authorId}`;
      profile.works_count = author.works_count ?? null;
      profile.orcid = profile.orcid ?? bareOrcid(author.orcid);
      const latest = author.last_known_institutions?.[0];
      if (!profile.institution && latest?.display_name) {
        profile.institution = { name: latest.display_name, homepage: null, ror: latest.ror ?? null };
      }

      const institutionId = shortId(latest?.id);
      if (institutionId) {
        const institution = await getJson<OpenAlexInstitution>(
          "OpenAlex",
          withPolitePool(`${BASE}/institutions/${institutionId}?select=display_name,homepage_url,ror`),
        ).catch(() => null);
        if (institution && profile.institution && institution.display_name === profile.institution.name) {
          profile.institution.homepage = institution.homepage_url ?? null;
        }
      }

      const terms = input.topicTerms.filter(Boolean).slice(0, 4).join(" ");
      const filter = [`author.id:${authorId}`, terms ? `title_and_abstract.search:${terms.replace(/[,:]/g, " ")}` : null]
        .filter(Boolean)
        .join(",");
      const works = await getJson<{ results?: OpenAlexWork[] }>(
        "OpenAlex",
        withPolitePool(`${BASE}/works?filter=${encodeURIComponent(filter)}&sort=publication_date:desc&per-page=5&select=id,doi,display_name,publication_year`),
      );
      profile.recent_on_topic = (works.results ?? [])
        .filter((work) => work.display_name)
        .map((work) => ({
          title: work.display_name ?? "",
          year: work.publication_year ?? null,
          url: work.doi ?? work.id ?? "",
        }))
        .filter((work) => work.url);
    }

    profile.orcid_url = orcidUrl(profile.orcid);
  } catch (error) {
    unavailable.push(error instanceof SourceUnavailableError ? error.source : "OpenAlex");
  }

  return profile;
}
