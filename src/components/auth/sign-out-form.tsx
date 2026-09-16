import { signOutAction } from "@/components/auth/actions";
import { Button } from "@/components/ui/button";

/**
 * A form rather than a link: signing out changes something, and a link that changes
 * something can be triggered by a prefetch or by anything that follows links on the page.
 */
export function SignOutForm({ label = "Sign out" }: { label?: string }) {
  return (
    <form action={signOutAction}>
      <Button type="submit" variant="ghost" size="sm">
        {label}
      </Button>
    </form>
  );
}
