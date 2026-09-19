import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { YouTubeFacade } from "@/components/video/youtube-facade";
import { findStoryVideo, type StoryVideo } from "@/lib/video";

/**
 * The privacy promise the facade exists to keep: **nothing loads from any Google domain
 * until somebody presses play.**
 *
 * A normal YouTube embed contacts Google the moment the page loads and sets cookies, on a
 * page about a named person's diagnosis — which tells Google who is reading about what. The
 * same leak comes back through the side door if we use Google's own thumbnail image for the
 * poster frame, which is why there is no image here at all.
 *
 * `tests/e2e/home.spec.ts` makes the same assertion against a real browser and a real
 * network. This one makes it against the markup, where it can name what went wrong.
 */

/** Hosts that would mean a request left the page for Google. */
const GOOGLE = /youtube\.com|ytimg\.com|googlevideo\.com|googleapis\.com|gstatic\.com|google\.com/i;

const video: StoryVideo = findStoryVideo([
  {
    id: "source-1",
    url: "https://www.youtube.com/watch?v=aBcD1234_-x&t=444s",
    title: "An invented conversation",
    publisher: "The Invented Programme",
  },
])!;

/** Every address the browser would fetch for us, from the markup as rendered. */
function loadedAddresses(container: HTMLElement): string[] {
  const loading = container.querySelectorAll("iframe, img, script, link, source, video, embed");
  return [...loading].flatMap((element) =>
    ["src", "href", "srcset", "data-src"]
      .map((attribute) => element.getAttribute(attribute))
      .filter((value): value is string => Boolean(value)),
  );
}

describe("before anybody presses play", () => {
  it("loads nothing at all — no iframe, no image, no script", () => {
    const { container } = render(<YouTubeFacade video={video} personName="Invented Person" />);
    expect(loadedAddresses(container)).toEqual([]);
  });

  it("names no Google domain anywhere in the markup that a browser would fetch", () => {
    const { container } = render(<YouTubeFacade video={video} personName="Invented Person" />);
    for (const address of loadedAddresses(container)) {
      expect(address).not.toMatch(GOOGLE);
    }
  });

  it("does not use YouTube's thumbnail for the poster frame", () => {
    const { container } = render(<YouTubeFacade video={video} personName="Invented Person" />);
    expect(container.querySelectorAll("img")).toHaveLength(0);
    expect(container.innerHTML).not.toContain("ytimg");
    expect(container.innerHTML).not.toContain("img.youtube");
  });

  it("says where it will play from before the person decides", () => {
    render(<YouTubeFacade video={video} personName="Invented Person" />);
    expect(
      screen.getByText(/Nothing loads from Google until you press play/i),
    ).toBeInTheDocument();
  });
});

describe("the play control", () => {
  it("is a real button, not a div with a click handler", () => {
    render(<YouTubeFacade video={video} personName="Invented Person" />);
    expect(screen.getByRole("button").tagName).toBe("BUTTON");
  });

  it("names the person and the source in its accessible name", () => {
    render(<YouTubeFacade video={video} personName="Invented Person" />);
    const name = screen.getByRole("button").getAttribute("aria-label") ?? "";

    expect(name).toContain("Invented Person");
    expect(name).toContain("An invented conversation");
    expect(name).toContain("The Invented Programme");
    expect(name).toContain("YouTube");
  });

  it("works from the keyboard", async () => {
    const user = userEvent.setup();
    render(<YouTubeFacade video={video} personName="Invented Person" />);

    await user.tab();
    expect(screen.getByRole("button")).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(screen.getByTestId("video-player")).toBeInTheDocument();
  });

  it("still names the source when we do not know whose video it is", () => {
    render(<YouTubeFacade video={video} />);
    const name = screen.getByRole("button").getAttribute("aria-label") ?? "";
    expect(name).toContain("An invented conversation");
  });
});

describe("after somebody presses play", () => {
  it("loads the video from youtube-nocookie.com and from nowhere else", async () => {
    const user = userEvent.setup();
    const { container } = render(<YouTubeFacade video={video} personName="Invented Person" />);

    await user.click(screen.getByRole("button"));

    const frame = screen.getByTestId("video-player");
    const src = frame.getAttribute("src") ?? "";

    expect(new URL(src).hostname).toBe("www.youtube-nocookie.com");
    // The ordinary player host must not appear, even as a substring.
    expect(src).not.toContain("://www.youtube.com");
    expect(src).toContain("start=444");

    // The iframe is the only thing that loads, and it is the no-cookie host.
    const addresses = loadedAddresses(container);
    expect(addresses).toHaveLength(1);
    expect(addresses[0]).toContain("youtube-nocookie.com");
  });

  it("gives the player a title, so it is not an unlabelled frame", async () => {
    const user = userEvent.setup();
    render(<YouTubeFacade video={video} personName="Invented Person" />);
    await user.click(screen.getByRole("button"));

    expect(screen.getByTestId("video-player").getAttribute("title")).toContain(
      "An invented conversation",
    );
  });

  it("moves focus to the player, so a keyboard user keeps their place", async () => {
    const user = userEvent.setup();
    render(<YouTubeFacade video={video} personName="Invented Person" />);
    await user.click(screen.getByRole("button"));

    expect(screen.getByTestId("video-player")).toHaveFocus();
  });
});
