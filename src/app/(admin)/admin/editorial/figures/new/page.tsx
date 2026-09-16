import type { Metadata } from "next";
import Link from "next/link";

import { Callout } from "@/components/ui/callout";
import { Container } from "@/components/ui/container";
import { requireEditor } from "@/lib/auth/guards";

import { FigureForm } from "../../forms";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Add a public figure" };

export default async function NewFigurePage() {
  await requireEditor();

  return (
    <Container reading className="py-10">
      <p className="text-small text-muted">
        <Link href="/admin/editorial" className="text-forest-600 underline underline-offset-4">
          Editorial
        </Link>
      </p>
      <h1 className="mt-3 text-display">Add a public figure</h1>

      <Callout tone="neutral" title="Before you add someone" className="mt-6">
        <p>
          Adding a person here is the first half of a claim about their health. Only add someone
          who has spoken publicly about their own health, or about someone they love — or whose
          family or estate has done so after their death.
        </p>
        <p className="mt-2">
          Their page will carry the line &ldquo;[their name] is not affiliated with and has not
          endorsed UnTouchable&rdquo;, and it only appears at all while one of their stories is
          published.
        </p>
      </Callout>

      <div className="mt-10">
        <FigureForm />
      </div>
    </Container>
  );
}
