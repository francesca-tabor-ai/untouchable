import { requireAdult } from "@/lib/auth/guards";
import { requireTrackingConsent } from "@/lib/onboarding/require-consent";
import { timelineMarkdown } from "@/lib/timeline/export";
import { exportTimeline, loadTimeline } from "@/lib/timeline/queries";
import { toDateInputValue, ukToday } from "@/lib/tracking/dates";

/**
 * Take it all with you.
 *
 * The answer to "can I have my own data" is yes, completely, in one request, without being
 * asked why. Both guards still run — a download is a read of special category data and is
 * not exempt from anything.
 *
 * Nothing is cached. `no-store` matters here rather than being boilerplate: this response is
 * one person's entire health record, and a copy of it left in a cache on a shared machine is
 * the thing this platform exists not to do.
 */
export async function GET(request: Request) {
  const user = await requireAdult("/timeline");
  await requireTrackingConsent(user.id);

  const format = new URL(request.url).searchParams.get("format") === "json" ? "json" : "markdown";
  const stamp = toDateInputValue(ukToday());

  const headers = (type: string, extension: string) => ({
    "Content-Type": `${type}; charset=utf-8`,
    "Content-Disposition": `attachment; filename="untouchable-timeline-${stamp}.${extension}"`,
    "Cache-Control": "no-store, private",
  });

  if (format === "json") {
    const dump = await exportTimeline(user.id);
    return new Response(JSON.stringify(dump, null, 2), {
      headers: headers("application/json", "json"),
    });
  }

  const timeline = await loadTimeline(user.id);
  return new Response(timelineMarkdown(timeline, ukToday()), {
    headers: headers("text/markdown", "md"),
  });
}
