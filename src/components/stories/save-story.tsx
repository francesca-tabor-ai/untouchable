import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Save a story to come back to.
 *
 * A signed-out visitor is invited, never blocked: the story is right there to read, and the
 * prompt is one quiet line underneath it. What someone saves can imply a diagnosis, so it is
 * never shown to anyone else and never counted in public.
 *
 * This is a form rather than a toggle button so it works before any JavaScript arrives.
 */
export function SaveStory({
  storyId,
  saved,
  signedIn,
  action,
  returnTo,
}: {
  storyId: string;
  saved: boolean;
  signedIn: boolean;
  action: (formData: FormData) => Promise<void>;
  returnTo: string;
}) {
  if (!signedIn) {
    return (
      <p className="mt-8 text-small text-muted">
        <Link
          href={`/sign-up?next=${encodeURIComponent(returnTo)}`}
          className="text-forest-600 underline underline-offset-4"
        >
          Join UnTouchable
        </Link>{" "}
        to save stories and come back to them. You do not need an account to read anything here.
      </p>
    );
  }

  return (
    <form action={action} className="mt-8">
      <input type="hidden" name="storyId" value={storyId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <Button type="submit" variant={saved ? "secondary" : "primary"} size="sm">
        {saved ? "Saved — remove from saved" : "Save this story"}
      </Button>
      <p className="mt-2 text-legal text-muted">
        Only you can see what you have saved. We never share it.
      </p>
    </form>
  );
}
