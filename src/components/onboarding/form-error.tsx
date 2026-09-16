/**
 * The one thing that went wrong with a whole form, said once, at the top, where a screen
 * reader will reach it and a person scrolling will not miss it.
 */
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="rounded-card border border-danger/40 bg-clay-100 px-5 py-4 text-small text-ink"
    >
      {message}
    </div>
  );
}
