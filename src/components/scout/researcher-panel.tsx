"use client";

import * as React from "react";

import { researcher } from "@/app/(account)/research/actions";
import { Button } from "@/components/ui/button";
import { contactRoute } from "@/lib/scout/contact";
import type { ResearcherProfile } from "@/lib/scout/openalex";
import type { Author } from "@/lib/scout/types";

/**
 * One researcher: where they work, their ORCID, what else they have written on this, and the
 * contact route `contact.ts` allows — a printed email, or a public profile, or an honest
 * "we found neither".
 */
export function ResearcherPanel({
  author,
  paperDoi,
  topicTerms,
  onWrite,
}: {
  author: Author;
  paperDoi: string | null;
  topicTerms: string[];
  onWrite: () => void;
}) {
  const [profile, setProfile] = React.useState<ResearcherProfile | null>(null);
  const [failed, setFailed] = React.useState(false);

  // A string, not the array: the parent builds a new array every render, and each one would
  // look up the researcher again.
  const terms = topicTerms.join("|");

  React.useEffect(() => {
    let live = true;
    researcher({ name: author.name, orcid: author.orcid, paperDoi, topicTerms: terms ? terms.split("|") : [] })
      .then((result) => live && setProfile(result))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [author.name, author.orcid, paperDoi, terms]);

  const route = contactRoute({
    public_email: author.public_email,
    orcid: profile?.orcid ?? author.orcid,
    profile_url: author.profile_url ?? profile?.orcid_url ?? profile?.institution?.homepage ?? profile?.openalex_url ?? null,
  });

  return (
    <div className="mt-3 rounded-field border border-line bg-cream-50 p-4" aria-live="polite">
      {!profile && !failed ? <p className="text-small text-muted">Looking up {author.name}…</p> : null}
      {failed ? <p className="text-small text-muted">We could not look this researcher up just now.</p> : null}

      {profile ? (
        <dl className="space-y-2 text-small">
          <div>
            <dt className="font-semibold text-ink">Works at</dt>
            <dd className="text-ink-soft">
              {profile.institution?.homepage ? (
                <a href={profile.institution.homepage} rel="noreferrer" target="_blank" className="text-forest-600 underline underline-offset-2">
                  {profile.institution.name}
                </a>
              ) : (
                (profile.institution?.name ?? author.institution ?? "Not known")
              )}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">ORCID</dt>
            <dd className="text-ink-soft">
              {profile.orcid_url ? (
                <a href={profile.orcid_url} rel="noreferrer" target="_blank" className="text-forest-600 underline underline-offset-2">
                  {profile.orcid}
                </a>
              ) : (
                "None found"
              )}
            </dd>
          </div>
          {profile.works_count !== null ? (
            <div>
              <dt className="font-semibold text-ink">Papers written</dt>
              <dd className="text-ink-soft">{profile.works_count.toLocaleString("en-GB")} in total, according to OpenAlex</dd>
            </div>
          ) : null}
          {profile.recent_on_topic.length > 0 ? (
            <div>
              <dt className="font-semibold text-ink">Other recent papers on this</dt>
              <dd>
                <ul className="mt-1 space-y-1">
                  {profile.recent_on_topic.map((work) => (
                    <li key={work.url}>
                      <a href={work.url} rel="noreferrer" target="_blank" className="text-forest-600 underline underline-offset-2">
                        {work.title}
                      </a>
                      {work.year ? <span className="text-muted"> ({work.year})</span> : null}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          ) : null}
          {profile.unavailable.length > 0 ? <p className="text-muted">{profile.unavailable.join(", ")} did not answer, so this may be incomplete.</p> : null}
        </dl>
      ) : null}

      <div className="mt-4 border-t border-line pt-4 text-small">
        <p className="font-semibold text-ink">How to get in touch</p>
        {route.kind === "email" ? (
          <>
            <p className="mt-1 text-ink-soft">
              <a href={`mailto:${route.email}`} className="text-forest-600 underline underline-offset-2">
                {route.email}
              </a>{" "}
              — {route.where}
            </p>
            <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={onWrite}>
              Draft an email
            </Button>
          </>
        ) : route.kind === "profile" ? (
          <p className="mt-1 text-ink-soft">
            {route.where}{" "}
            <a href={route.url} rel="noreferrer" target="_blank" className="text-forest-600 underline underline-offset-2">
              Open their profile
            </a>
          </p>
        ) : (
          <p className="mt-1 text-ink-soft">{route.where}</p>
        )}
      </div>
    </div>
  );
}
