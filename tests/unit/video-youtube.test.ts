// @vitest-environment node
import { describe, expect, it } from "vitest";

import { findStoryVideo } from "@/lib/video";
import { parseYouTubeUrl, youTubeEmbedUrl } from "@/lib/video/youtube";

/**
 * The video parser decides which third-party origin we are willing to put in an iframe on a
 * page about somebody's diagnosis. A permissive parser here is a privacy hole, so these
 * tests spend most of their time on what it must refuse.
 *
 * Every id below is invented. They are the right shape — eleven URL-safe characters — and
 * point at nothing.
 */

const ID = "aBcD1234_-x";

describe("reading a YouTube address", () => {
  it("reads the ordinary watch link", () => {
    expect(parseYouTubeUrl(`https://www.youtube.com/watch?v=${ID}`)).toEqual({
      id: ID,
      startSeconds: null,
    });
  });

  it("reads a watch link with no www, and with other parameters alongside", () => {
    expect(parseYouTubeUrl(`https://youtube.com/watch?list=PL123&v=${ID}&feature=share`)).toEqual({
      id: ID,
      startSeconds: null,
    });
  });

  it("reads the mobile host", () => {
    expect(parseYouTubeUrl(`https://m.youtube.com/watch?v=${ID}`)?.id).toBe(ID);
  });

  it("reads the youtu.be share link", () => {
    expect(parseYouTubeUrl(`https://youtu.be/${ID}`)).toEqual({ id: ID, startSeconds: null });
  });

  it("reads an embed link", () => {
    expect(parseYouTubeUrl(`https://www.youtube.com/embed/${ID}`)).toEqual({
      id: ID,
      startSeconds: null,
    });
  });

  it("reads an address that is already on the no-cookie host", () => {
    expect(parseYouTubeUrl(`https://www.youtube-nocookie.com/embed/${ID}`)?.id).toBe(ID);
  });
});

describe("the timestamp on a share link", () => {
  it("reads &t=444s", () => {
    expect(parseYouTubeUrl(`https://www.youtube.com/watch?v=${ID}&t=444s`)?.startSeconds).toBe(444);
  });

  it("reads ?start=444", () => {
    expect(parseYouTubeUrl(`https://www.youtube.com/embed/${ID}?start=444`)?.startSeconds).toBe(
      444,
    );
  });

  it("reads a bare ?t=444 on a share link", () => {
    expect(parseYouTubeUrl(`https://youtu.be/${ID}?t=444`)?.startSeconds).toBe(444);
  });

  it("reads an hours and minutes duration", () => {
    expect(parseYouTubeUrl(`https://www.youtube.com/watch?v=${ID}&t=1h2m3s`)?.startSeconds).toBe(
      3723,
    );
  });

  it("ignores a timestamp it cannot read, rather than refusing the video", () => {
    const video = parseYouTubeUrl(`https://www.youtube.com/watch?v=${ID}&t=half-way`);
    expect(video?.id).toBe(ID);
    expect(video?.startSeconds).toBeNull();
  });

  it("ignores a zero or negative start", () => {
    expect(parseYouTubeUrl(`https://www.youtube.com/watch?v=${ID}&t=0`)?.startSeconds).toBeNull();
    expect(parseYouTubeUrl(`https://www.youtube.com/watch?v=${ID}&t=-30`)?.startSeconds).toBeNull();
  });
});

describe("what the parser refuses", () => {
  const junk = [
    null,
    undefined,
    "",
    "   ",
    "not a url at all",
    "youtube",
    // A source we hold, but not a video.
    "https://example.test/harbour-lane-interview",
    // Another video host. Not ours to decide to embed.
    "https://vimeo.com/123456789",
    // The channel, the search page and the home page are not videos.
    "https://www.youtube.com/",
    "https://www.youtube.com/results?search_query=someone",
    "https://www.youtube.com/@someone",
    // A watch link with no id, or an id of the wrong shape.
    "https://www.youtube.com/watch",
    "https://www.youtube.com/watch?v=",
    "https://www.youtube.com/watch?v=tooshort",
    "https://www.youtube.com/watch?v=waaaaaaaaaaaaytoolong",
    "https://www.youtube.com/watch?v=has spaces!",
    "https://youtu.be/",
    // Somebody else's domain that merely contains the word. This is the one that matters:
    // a parser using `includes` or `endsWith` would hand this an iframe on a health page.
    "https://youtube.com.example.test/watch?v=aBcD1234_-x",
    "https://notyoutube.com/watch?v=aBcD1234_-x",
    "https://evil.example.test/youtube.com/watch?v=aBcD1234_-x",
    "https://youtu.be.example.test/aBcD1234_-x",
    // Not a web protocol.
    "javascript:alert(1)",
    "data:text/html,<iframe src=https://youtube.com/embed/aBcD1234_-x>",
    "file:///etc/passwd",
  ];

  for (const value of junk) {
    it(`refuses ${JSON.stringify(value)}`, () => {
      expect(parseYouTubeUrl(value)).toBeNull();
    });
  }
});

describe("the address we build", () => {
  it("is always the no-cookie host, never youtube.com", () => {
    const url = youTubeEmbedUrl({ id: ID, startSeconds: null });
    expect(new URL(url).hostname).toBe("www.youtube-nocookie.com");
    expect(url.startsWith(`https://www.youtube-nocookie.com/embed/${ID}`)).toBe(true);
  });

  it("carries the timestamp through as start", () => {
    const url = new URL(youTubeEmbedUrl({ id: ID, startSeconds: 444 }));
    expect(url.searchParams.get("start")).toBe("444");
  });

  it("does not offer somebody else's videos at the end", () => {
    expect(new URL(youTubeEmbedUrl({ id: ID, startSeconds: null })).searchParams.get("rel")).toBe(
      "0",
    );
  });

  it("round-trips every accepted form to the same no-cookie address", () => {
    const forms = [
      `https://www.youtube.com/watch?v=${ID}&t=444s`,
      `https://youtu.be/${ID}?t=444`,
      `https://www.youtube.com/embed/${ID}?start=444`,
    ];

    const built = forms.map((form) => youTubeEmbedUrl(parseYouTubeUrl(form)!));
    expect(new Set(built).size).toBe(1);
    expect(built[0]).toContain("youtube-nocookie.com");
    expect(built[0]).toContain("start=444");
  });
});

describe("picking the video off a story's sources", () => {
  const source = (id: string, url: string) => ({
    id,
    url,
    title: `Invented source ${id}`,
    publisher: "Invented Publisher",
  });

  it("is null when no source is a video", () => {
    expect(
      findStoryVideo([
        source("a", "https://example.test/an-invented-interview"),
        source("b", "https://example.test/an-invented-statement"),
      ]),
    ).toBeNull();
  });

  it("is null when there are no sources at all", () => {
    expect(findStoryVideo([])).toBeNull();
  });

  it("takes the first video source, in the order the editors gave them", () => {
    const found = findStoryVideo([
      source("a", "https://example.test/an-invented-article"),
      source("b", `https://www.youtube.com/watch?v=${ID}`),
      source("c", "https://youtu.be/zZzZ9999_-y"),
    ]);

    expect(found?.sourceId).toBe("b");
    expect(found?.video.id).toBe(ID);
    expect(found?.embedUrl).toContain("youtube-nocookie.com");
    // The original address is kept so the reader can open it themselves instead.
    expect(found?.sourceUrl).toBe(`https://www.youtube.com/watch?v=${ID}`);
  });

  it("carries the source's own title and publisher, not a title from Google", () => {
    const found = findStoryVideo([source("a", `https://youtu.be/${ID}`)]);
    expect(found?.title).toBe("Invented source a");
    expect(found?.publisher).toBe("Invented Publisher");
  });
});
