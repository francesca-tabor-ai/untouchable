import { userConditions } from "@/lib/onboarding/conditions";
import { pendingCheckIns } from "@/lib/questionnaires/check-ins";
import { listSavedStories } from "@/lib/stories/saved";
import { loadTimeline, reviewTimeline } from "@/lib/timeline/queries";
import { dailyLogScreen, getDailyLog, recentLogs } from "@/lib/tracking/daily-log";
import { ukToday } from "@/lib/tracking/dates";
import { listTreatmentCourses } from "@/lib/tracking/treatments";

/**
 * Everything the dashboard shows, in one read.
 *
 * It is a summary of what the person has written down and nothing else. There are no
 * averages, no comparisons between days and no totals that could be read as a verdict —
 * AGENTS.md rule 9. Where a number appears, it is one they entered.
 */
export async function healthSummary(userId: string, now: Date = new Date()) {
  const today = ukToday(now);

  const [conditions, screen, todaysLog, latest, courses, checkIns, timeline, saved] =
    await Promise.all([
      userConditions(userId),
      dailyLogScreen(userId, today),
      getDailyLog(userId, today),
      recentLogs(userId, 1),
      listTreatmentCourses(userId),
      pendingCheckIns(userId),
      loadTimeline(userId),
      listSavedStories(userId),
    ]);

  const review = reviewTimeline(timeline);
  const due = checkIns.filter((checkIn) => checkIn.dueAt <= now);
  const upcoming = checkIns.filter((checkIn) => checkIn.dueAt > now);

  return {
    conditions: conditions.map((row) => row.condition),
    log: {
      trackedSymptoms: screen.symptoms.length,
      loggedToday: todaysLog !== null,
      latest: latest[0] ?? null,
    },
    treatments: courses.current.map((course) => ({
      id: course.id,
      name: course.intervention.name,
      startDate: course.startDate,
    })),
    checkIns: { due: due.length, next: upcoming[0] ?? null },
    timeline: {
      entries: timeline.observations.length + timeline.events.length,
      disagreements: review.contradictions.length,
      openItems: review.openItems.length,
      possibilities: review.matrix.columns.length,
    },
    savedStories: saved,
  };
}

export type HealthSummary = Awaited<ReturnType<typeof healthSummary>>;
