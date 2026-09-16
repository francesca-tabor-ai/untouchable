import type { Metadata } from "next";
import Link from "next/link";

import { Callout } from "@/components/ui/callout";
import { Container } from "@/components/ui/container";
import { requireEditor } from "@/lib/auth/guards";
import { listAllConditions, listPublicFigures } from "@/lib/stories/editorial";

import { BLANK_STORY, StoryForm } from "../../story-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Draft a story" };

export default async function NewStoryPage() {
  await requireEditor();
  const [figures, conditions] = await Promise.all([listPublicFigures(), listAllConditions()]);

  return (
    <Container reading className="py-10">
      <p className="text-small text-muted">
        <Link href="/admin/editorial" className="text-forest-600 underline underline-offset-4">
          Editorial
        </Link>
      </p>
      <h1 className="mt-3 text-display">Draft a story</h1>
      <p className="mt-2 text-muted">
        This creates a draft. Sources and any quote are added on the next screen, and a second
        editor publishes it.
      </p>

      {figures.length === 0 ? (
        <Callout tone="warm" title="No public figures yet" className="mt-8">
          <p>
            <Link
              href="/admin/editorial/figures/new"
              className="text-forest-600 underline underline-offset-4"
            >
              Add a public figure
            </Link>{" "}
            first, or draft a community story.
          </p>
        </Callout>
      ) : null}

      <div className="mt-10">
        <StoryForm
          mode="create"
          values={BLANK_STORY}
          figures={figures}
          conditions={conditions}
          sources={[]}
          editable
        />
      </div>
    </Container>
  );
}
