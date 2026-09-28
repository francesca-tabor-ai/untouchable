import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { requireAdult } from "@/lib/auth/guards";
import { BODY_SYSTEMS } from "@/lib/conditions/body-systems";
import { allLessons, COURSES } from "@/lib/courses";

export const metadata: Metadata = { title: "Listen and learn" };

const systemLabel = (key: string) => BODY_SYSTEMS.find((system) => system.key === key)?.label ?? key;

/**
 * Listen and learn: spoken courses about how the body works.
 *
 * Nothing here reads anything about the person — the courses are the same for everybody, and
 * progress lives in the browser — so there is no tracking-consent guard. The adult guard runs
 * because this sits in the account area, and a guard in the layout is not a guard here.
 */
export default async function ListenPage() {
  await requireAdult("/listen");

  return (
    <Container reading className="py-12 sm:py-16">
      <h1 className="text-display">Listen and learn</h1>
      <p className="mt-4 text-lead text-ink-soft">
        Short spoken lessons about how the body works, written to be listened to on a walk.
        They explain the body. They are not about you, and they are not medical advice.
      </p>

      <ul className="mt-10 space-y-5">
        {COURSES.map((course) => {
          const lessons = allLessons(course);
          const written = lessons.filter((lesson) => lesson.script_text).length;
          return (
            <li key={course.id}>
              <Card>
                <CardTitle as="h2">
                  <Link href={`/listen/${course.slug}`} className="underline-offset-4 hover:underline">
                    {course.title}
                  </Link>
                </CardTitle>
                <p className="mt-2 text-body text-ink-soft">{course.summary}</p>
                <p className="mt-3 text-small text-ink-soft">
                  {course.modules.length} parts, {lessons.length} lessons. {written} written so far.
                </p>
                <ul className="mt-4 flex flex-wrap gap-2" aria-label="Body systems">
                  {course.body_systems.map((system) => (
                    <li key={system}>
                      <Badge>{systemLabel(system)}</Badge>
                    </li>
                  ))}
                </ul>
              </Card>
            </li>
          );
        })}
      </ul>
    </Container>
  );
}
