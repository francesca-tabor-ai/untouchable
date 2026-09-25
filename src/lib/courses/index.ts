import { HEARING_AND_BALANCE } from "./hearing-and-balance";
import type { Course, CourseModule, Lesson } from "./types";

export type { Course, CourseModule, Lesson, LessonProgress, PronunciationEntry } from "./types";
export { listeningMinutes, paragraphsOf } from "./script-rules";

/**
 * Every listening course. Written by hand and reviewed like any other content change.
 *
 * Held in code rather than the database because the tables would need a change to
 * `prisma/schema.prisma`, which is single-writer (AGENTS.md section 3). When the platform
 * lead adds them, this list becomes the seed. See DECISIONS.md LC-01.
 */
export const COURSES: readonly Course[] = [HEARING_AND_BALANCE];

export function findCourse(slug: string): Course | null {
  return COURSES.find((course) => course.slug === slug) ?? null;
}

export function allLessons(course: Course): Lesson[] {
  return course.modules.flatMap((part) => part.lessons);
}

export interface LessonPlace {
  course: Course;
  part: CourseModule;
  lesson: Lesson;
  previous: Lesson | null;
  next: Lesson | null;
}

export function findLesson(courseSlug: string, lessonSlug: string): LessonPlace | null {
  const course = findCourse(courseSlug);
  if (!course) return null;
  const lessons = allLessons(course);
  const index = lessons.findIndex((lesson) => lesson.slug === lessonSlug);
  if (index === -1) return null;
  const lesson = lessons[index]!;
  const part = course.modules.find((m) => m.id === lesson.module_id)!;
  return {
    course,
    part,
    lesson,
    previous: lessons[index - 1] ?? null,
    next: lessons[index + 1] ?? null,
  };
}

export function lessonHref(course: Course, lesson: Lesson): string {
  return `/listen/${course.slug}/${lesson.slug}`;
}
