import { canShowLogo } from "@/lib/charities/logo";

/**
 * How a charity is named on the page.
 *
 * Without recorded permission to use the logo, this is the charity's name as text — never
 * the logo. See `canShowLogo`, which is the single place that decision is made.
 */
export function CharityIdentity({
  charity,
  className,
}: {
  charity: { name: string; logoUrl: string | null; logoPermission: boolean };
  className?: string;
}) {
  if (!canShowLogo(charity)) {
    return <span className={className}>{charity.name}</span>;
  }

  return (
    <span className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element -- logos are served from our own
          origin as plain files; next/image would need a remote loader we deliberately do not
          have. See src/lib/charities/logo.ts. */}
      <img
        src={charity.logoUrl as string}
        alt={charity.name}
        className="h-10 w-auto max-w-[12rem] object-contain"
      />
    </span>
  );
}
