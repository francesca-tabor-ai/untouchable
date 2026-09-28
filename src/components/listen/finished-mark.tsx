"use client";

import { Badge } from "@/components/ui/badge";
import { useProgress } from "@/lib/courses/progress";

/** "Finished" beside a lesson in the outline, from this device's progress. Nothing when not. */
export function FinishedMark({ lessonId }: { lessonId: string }) {
  const finished = useProgress()[lessonId]?.completed ?? false;
  return finished ? <Badge tone="forest">Finished</Badge> : null;
}
