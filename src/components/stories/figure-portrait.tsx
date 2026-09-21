import Image from "next/image";

/**
 * A photograph of a public figure, with the attribution its licence requires.
 *
 * Every image on this platform is freely licensed — Creative Commons, from Wikimedia
 * Commons — and self-hosted. Two rules hold it together:
 *
 *   1. `PublicFigure.imageUrl` cannot be set without `imageLicence`; the database refuses.
 *      Seven press and agency photographs have been turned away by that constraint.
 *   2. CC BY and CC BY-SA both require attribution. Showing the picture without naming the
 *      photographer is not "nearly compliant", it is the thing the licence forbids. So the
 *      credit renders from the same record as the image, and cannot be dropped separately.
 *
 * Someone with no licensed photograph gets no portrait. That is the intended outcome, not a
 * gap to be filled with whatever turns up in an image search.
 */
export interface FigureImage {
  imageUrl: string | null;
  imageLicence: string | null;
}

interface Attribution {
  author: string;
  licence: string;
  licenceUrl: string;
  source: string;
}

export function parseAttribution(licence: string | null): Attribution | null {
  if (!licence) return null;
  try {
    const parsed = JSON.parse(licence) as Partial<Attribution>;
    if (!parsed.author || !parsed.licence) return null;
    return {
      author: parsed.author,
      licence: parsed.licence,
      licenceUrl: parsed.licenceUrl ?? "",
      source: parsed.source ?? "",
    };
  } catch {
    return null;
  }
}

export function FigurePortrait({
  name,
  figure,
  size = 160,
  className,
}: {
  name: string;
  figure: FigureImage;
  size?: number;
  className?: string;
}) {
  const attribution = parseAttribution(figure.imageLicence);
  if (!figure.imageUrl || !attribution) return null;

  return (
    <figure className={className}>
      <Image
        src={figure.imageUrl}
        alt={`Photograph of ${name}`}
        width={size}
        height={size}
        className="rounded-card border border-line object-cover"
        style={{ width: size, height: size }}
      />
      <figcaption className="mt-2 text-legal text-muted">
        Photo: {attribution.author}
        {attribution.source ? (
          <>
            {" · "}
            <a href={attribution.source} rel="noopener noreferrer" className="underline">
              source
            </a>
          </>
        ) : null}
        {attribution.licenceUrl ? (
          <>
            {" · "}
            <a href={attribution.licenceUrl} rel="noopener noreferrer" className="underline">
              {attribution.licence}
            </a>
          </>
        ) : (
          ` · ${attribution.licence}`
        )}
      </figcaption>
    </figure>
  );
}

/**
 * Whether a person has a picture we are allowed to show.
 *
 * Both halves or neither: a URL with no readable licence counts as no picture, because the
 * attribution is what the licence asks for and we cannot render what we cannot read. Every
 * surface asks this one question rather than re-deriving it, so none of them can disagree.
 */
export function hasLicensedPhotograph(figure: FigureImage): boolean {
  return Boolean(figure.imageUrl && parseAttribution(figure.imageLicence));
}

/**
 * A small photograph for a person in a list — a condition page, a story index.
 *
 * Same rule as the portrait above, with one difference: the credit does not travel on the
 * thumbnail itself. A photographer's name repeated inside every card in a grid is not
 * attribution anybody reads, so the licences are satisfied collectively by
 * `FigurePhotoCredits` under the list. **If you render this, render that.** They are two
 * halves of one licence condition, which is why `StoryCardGrid` turns both on together and
 * `tests/unit/condition-portraits.test.tsx` holds them together.
 *
 * `alt=""` on purpose: the person's name is the next thing in the card, and a screen reader
 * announcing "Photograph of Selena Gomez, Selena Gomez" is noise, not information.
 */
export function FigureThumbnail({
  figure,
  size = 56,
  className,
}: {
  figure: FigureImage;
  size?: number;
  className?: string;
}) {
  if (!hasLicensedPhotograph(figure)) return null;

  return (
    <Image
      src={figure.imageUrl!}
      alt=""
      width={size}
      height={size}
      className={`shrink-0 rounded-full border border-line object-cover object-top ${className ?? ""}`}
      style={{ width: size, height: size }}
    />
  );
}

/** Two initials. "Marla Quintrell" becomes MQ; a single name gives one letter. */
function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  return [parts[0], parts.length > 1 ? parts[parts.length - 1] : undefined]
    .filter(Boolean)
    .map((part) => part![0]!.toUpperCase())
    .join("");
}

/**
 * What stands in for a photograph when there is no licensed one.
 *
 * Somebody with no freely licensed picture keeps their initials, and that is the intended
 * outcome rather than a gap to be filled with whatever an image search returns. Cream-200
 * on forest-800 clears 4.5:1 — the sum is in `tests/unit/home-figure-cards.test.ts`, which
 * checks the same pair on the front page.
 */
export function FigureMonogram({
  name,
  size = 56,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full bg-forest-800 font-display text-cream-200 ${className ?? ""}`}
      style={{ width: size, height: size, fontSize: size / 2.8 }}
    >
      {initials(name)}
    </span>
  );
}

/**
 * Creative Commons attribution for a list of photographs, credited collectively.
 *
 * CC BY and CC BY-SA both require attribution "reasonable to the medium". Inside a card
 * that already carries a name, a headline and sometimes a warning, a photographer's name is
 * not reasonable to anybody — so the credits gather here, under the grid the pictures are
 * in. Each story page still carries the full per-image credit beside the picture it belongs
 * to (`FigurePortrait`). PL-16.
 *
 * This is a licence condition, not decoration. If the photographs render, this renders.
 */
export function FigurePhotoCredits({
  figures,
  className,
}: {
  figures: ({ name: string } & FigureImage)[];
  className?: string;
}) {
  const credits = figures
    .map((figure) => ({ figure, attribution: parseAttribution(figure.imageLicence) }))
    .filter((entry) => hasLicensedPhotograph(entry.figure));

  if (credits.length === 0) return null;

  return (
    <p className={`text-legal text-muted ${className ?? ""}`} data-testid="photo-credits">
      Photographs, in order:{" "}
      {credits.map((entry, index) => (
        <span key={`${entry.figure.name}-${index}`}>
          {index > 0 ? "; " : ""}
          {entry.figure.name} by {entry.attribution!.author}
          {entry.attribution!.licenceUrl ? (
            <>
              {" ("}
              <a
                href={entry.attribution!.licenceUrl}
                rel="noopener noreferrer"
                className="underline"
              >
                {entry.attribution!.licence}
              </a>
              {")"}
            </>
          ) : (
            ` (${entry.attribution!.licence})`
          )}
        </span>
      ))}
      .
    </p>
  );
}
