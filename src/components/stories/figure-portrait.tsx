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
