"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/guards";
import { toggleSavedStory } from "@/lib/stories/saved";

const schema = z.object({
  storyId: z.string().trim().min(1),
  returnTo: z
    .string()
    .trim()
    // Only ever a path on this site. A full URL here would be an open redirect.
    .regex(/^\/[A-Za-z0-9\-._~/]*$/)
    .default("/stories"),
});

/**
 * Save or unsave a story. Signed-out visitors are sent to sign in and come straight back —
 * reading is never gated, only saving.
 */
export async function toggleSavedStoryAction(formData: FormData) {
  const parsed = schema.safeParse({
    storyId: formData.get("storyId"),
    returnTo: formData.get("returnTo"),
  });
  if (!parsed.success) return;

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/sign-in?next=${encodeURIComponent(parsed.data.returnTo)}`);
  }

  await toggleSavedStory(user.id, parsed.data.storyId);
  revalidatePath(parsed.data.returnTo);
}
