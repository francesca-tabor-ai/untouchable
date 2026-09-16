"use server";

import { signOut } from "@/lib/auth";

/** Sign out and go back to the public site. */
export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
