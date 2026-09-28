import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LessonPlayer } from "@/components/listen/lesson-player";
import { Callout } from "@/components/ui/callout";
import { Container } from "@/components/ui/container";
import { requireAdult } from "@/lib/auth/guards";
import { findLesson, lessonHref, listeningMinutes, paragraphsOf } from "@/lib/courses";

type Params = Promise<{ course: string; lesson: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { course, lesson } = await params;
  return { title: findLesson(course, lesson)?.lesson.title ?? "Lesson not found" };
}

/**
 * One lesson: the player, then the written companion.
 *
 * The companion is the script itself, word for word, so what somebody reads is what they
 * would hear — plus the pronunciation guide and the sources, which the spoken version only
 * mentions lightly. It is also the transcript for anybody who cannot listen.
 */
export default async function LessonPage({ params }: { params: Params }) {
  const { course: courseSlug, lesson: lessonSlug } = await params;
  await requireAdult(`/listen/${courseSlug}/${lessonSlug}`);

  const place = findLesson(courseSlug, lessonSlug);
  if (!place) notFound();
  const { course, part, lesson, previous, next } = place;

  return (
    <Container reading className="py-12 sm:py-16">
      <p className="text-small">
        <Link href={`/listen/${course.slug}`}>{course.title}</Link>
        <span className="text-ink-soft">
          {" "}
          · Part {part.order}: {part.title}
        </span>
      </p>
      <h1 className="mt-3 text-display">{lesson.title}</h1>
      <p className="mt-4 text-lead text-ink-soft">{lesson.summary}</p>

      {lesson.script_text ? (
        <>
          <p className="mt-3 text-small text-ink-soft">
            About {listeningMinutes(lesson.script_text)} minutes to listen to.
          </p>

          <div className="mt-8">
            <LessonPlayer
              lessonId={lesson.id}
              chunks={
                lesson.audio_status === "ready" && lesson.audio_url
                  ? [{ audioUrl: lesson.audio_url, durationSec: lesson.duration_sec ?? 0 }]
                  : []
              }
            />
          </div>

          <section className="mt-12" aria-labelledby="script">
            <h2 id="script" className="text-title">
              What is said
            </h2>
            <div className="mt-5 space-y-5 text-body text-ink">
              {paragraphsOf(lesson.script_text).map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </section>

          {lesson.pronunciation_guide.length > 0 ? (
            <section className="mt-12" aria-labelledby="say-it">
              <h2 id="say-it" className="text-title">
                How to say the words
              </h2>
              <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-body">
                {lesson.pronunciation_guide.map((entry) => (
                  <div key={entry.term} className="contents">
                    <dt className="font-medium text-ink">{entry.term}</dt>
                    <dd className="text-ink-soft">{entry.guide}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          <section className="mt-12" aria-labelledby="sources">
            <h2 id="sources" className="text-title">
              Where this comes from
            </h2>
            <ul className="mt-5 space-y-4">
              {lesson.sources.map((source) => (
                <li key={source.url}>
                  <a href={source.url} rel="noopener noreferrer" className="font-medium">
                    {source.publisher}: {source.title}
                  </a>
                  <p className="mt-1 text-small text-ink-soft">{source.supports}</p>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <Callout tone="neutral" className="mt-8" title="Not written yet">
          <p>
            This lesson is planned but has not been written. Each one is written and checked
            against its sources before it is added.
          </p>
        </Callout>
      )}

      <Callout tone="care" className="mt-12">
        <p>
          This explains how the body works in general. It cannot tell you what is happening in
          your body. If something worries you, talk to your GP, or call NHS 111.
        </p>
      </Callout>

      <nav aria-label="Lessons" className="mt-10 flex flex-wrap justify-between gap-4 text-small">
        {previous ? <Link href={lessonHref(course, previous)}>Before: {previous.title}</Link> : <span />}
        {next ? <Link href={lessonHref(course, next)}>Next: {next.title}</Link> : null}
      </nav>
    </Container>
  );
}
