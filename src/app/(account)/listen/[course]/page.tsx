import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FinishedMark } from "@/components/listen/finished-mark";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { requireAdult } from "@/lib/auth/guards";
import { BODY_SYSTEMS } from "@/lib/conditions/body-systems";
import { allLessons, findCourse, lessonHref, listeningMinutes } from "@/lib/courses";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ course: string }>;
}): Promise<Metadata> {
  const { course: slug } = await params;
  return { title: findCourse(slug)?.title ?? "Course not found" };
}

/**
 * A course: the parts of the body it visits, then its outline.
 *
 * The map is a list of structures grouped by body system, each linking to the lessons that
 * visit it. A list rather than a drawing, because it works with a screen reader and on a
 * phone, and a drawing of an ear is a separate piece of work to get right.
 */
export default async function CoursePage({ params }: { params: Promise<{ course: string }> }) {
  const { course: slug } = await params;
  await requireAdult(`/listen/${slug}`);

  const course = findCourse(slug);
  if (!course) notFound();

  const lessons = allLessons(course);
  const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));

  return (
    <Container reading className="py-12 sm:py-16">
      <p className="text-small">
        <Link href="/listen">Listen and learn</Link>
      </p>
      <h1 className="mt-3 text-display">{course.title}</h1>
      <p className="mt-4 text-lead text-ink-soft">{course.summary}</p>

      <section className="mt-12" aria-labelledby="map">
        <h2 id="map" className="text-title">
          The parts of the body this course visits
        </h2>
        {course.body_systems.map((systemKey) => {
          const system = BODY_SYSTEMS.find((s) => s.key === systemKey)!;
          const structures = course.structures.filter((s) => s.system === systemKey);
          return (
            <div key={systemKey} className="mt-6">
              <h3 className="font-semibold text-ink">
                {system.label} <span className="font-normal text-ink-soft">— {system.about}</span>
              </h3>
              <ul className="mt-3 space-y-3">
                {structures.map((structure) => (
                  <li key={structure.name} className="rounded-card border border-line bg-white p-4">
                    <p className="font-medium text-ink">{structure.name}</p>
                    <p className="mt-1 text-small text-ink-soft">{structure.about}</p>
                    <p className="mt-2 text-small">
                      {structure.lesson_ids.map((id, i) => {
                        const lesson = lessonById.get(id)!;
                        return (
                          <span key={id}>
                            {i > 0 ? ", " : ""}
                            <Link href={lessonHref(course, lesson)}>{lesson.title}</Link>
                          </span>
                        );
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>

      <section className="mt-14" aria-labelledby="outline">
        <h2 id="outline" className="text-title">
          Lessons
        </h2>
        <ol className="mt-6 space-y-10">
          {course.modules.map((part) => (
            <li key={part.id}>
              <h3 className="text-lead font-semibold text-ink">
                Part {part.order}: {part.title}
              </h3>
              <p className="mt-1 text-small text-ink-soft">{part.summary}</p>
              <ol className="mt-4 space-y-3">
                {part.lessons.map((lesson) => (
                  <li key={lesson.id} className="rounded-card border border-line bg-white p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={lessonHref(course, lesson)} className="font-medium">
                        {lesson.title}
                      </Link>
                      {lesson.script_text ? (
                        <Badge tone="forest">About {listeningMinutes(lesson.script_text)} minutes</Badge>
                      ) : (
                        <Badge>Not written yet</Badge>
                      )}
                      <FinishedMark lessonId={lesson.id} />
                    </div>
                    <p className="mt-2 text-small text-ink-soft">{lesson.summary}</p>
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ol>
      </section>
    </Container>
  );
}
