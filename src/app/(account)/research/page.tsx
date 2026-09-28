import type { Metadata } from "next";

import { ResearchScout } from "@/components/scout/research-scout";
import { Container } from "@/components/ui/container";
import { requireAdult } from "@/lib/auth/guards";
import { claudeConfigured } from "@/lib/scout/claude";
import { WHAT_THIS_IS } from "@/lib/scout/copy";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Research Scout" };

/**
 * The Research Scout.
 *
 * It exists by an explicit platform-lead decision to carve it out of AGENTS.md rule 9 and the
 * brief's "no AI-generated insight", recorded in DECISIONS.md RS-01. The carve-out is narrow:
 * Claude may say in plain English what a paper asked, did and found. It may not advise,
 * overstate or print a dose, and `src/lib/scout/language.ts` withholds anything that does.
 *
 * Reading lists, notes and watched searches are held in the browser (RS-03), so there is no
 * schema change behind this page. The guard still runs here, every time, and again in every
 * server action — a client component holding the data is not a permission check.
 */
export default async function ResearchPage() {
  await requireAdult("/research");

  return (
    <Container className="py-12 sm:py-16">
      <div className="max-w-3xl">
        <h1 className="text-display">Research Scout</h1>
        <p className="mt-4 text-lead text-ink-soft">{WHAT_THIS_IS}</p>
      </div>

      <div className="mt-10">
        <ResearchScout claudeOn={claudeConfigured()} />
      </div>
    </Container>
  );
}
