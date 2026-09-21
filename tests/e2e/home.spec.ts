import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { config } from "dotenv";

import { PrismaClient } from "../../src/generated/prisma";

/**
 * The home page, and the video facade, against the seeded development data.
 *
 * Everything the seed contains is invented — see prisma/seed/. Two fixtures are added here
 * rather than to the seed, because both are about how a surface behaves rather than about
 * content: a YouTube source on one story, and a licensed photograph on one figure.
 *
 * **Why this file runs on its own.** It writes to the end-to-end database, so it takes the
 * whole file into a single worker (`mode: "default"`) and a single project. Two workers
 * setting up and tearing down the same rows at the same time is a flake that looks like a
 * bug in the code. The acceptance criterion is 375px rather than a particular device, so the
 * viewport is set explicitly where it matters — the same decision as tests/e2e/stories.spec.ts.
 */

config({ path: ".env.e2e", override: true });

test.describe.configure({ mode: "default" });

/** The one project that owns the database fixtures below. */
const FIXTURE_PROJECT = "desktop";

/** Anything from one of these hosts means a request left this page for Google. */
const GOOGLE = /youtube\.com|ytimg\.com|googlevideo\.com|googleapis\.com|gstatic\.com|google\.com/i;

const STORY_SLUG = "marla-quintrell-breast-cancer";
const FIGURE_SLUG = "marla-quintrell";
const FIGURE_NAME = "Marla Quintrell";
const PUBLISHER = "The Invented Programme";

/** An invented video id of the right shape, pointing at nothing. */
const VIDEO_URL = "https://www.youtube.com/watch?v=aBcD1234_-x&t=444s";
const SOURCE_ID = "e2e-home-spec-video-source";

/**
 * A path that exists nowhere on disk. Every request for it is intercepted below and
 * answered with a solid white image — the lightest photograph there can be, and therefore
 * the hardest case for white text over it.
 */
const PLACEHOLDER_PHOTO = "/figures/e2e-home-spec-placeholder.jpg";

const PLACEHOLDER_LICENCE = JSON.stringify({
  author: "An Invented Photographer",
  licence: "CC BY-SA 4.0",
  licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  source: "https://example.test/an-invented-photograph",
});

/**
 * Enough invented people to fill more than one page of the grid.
 *
 * The seed has four published figure stories, which all fit on the first page — so the
 * "View more" button never appears against the seed alone and there is nothing to test.
 * These rows exist to make a second page exist. Every one of them is invented, as rule 1
 * requires, and they are removed again in `afterAll`.
 *
 * The surnames are deliberately unlike anything else in the seed, so a spec running
 * alongside this one and searching for a real seeded word cannot match one of them.
 */
const PAGED_FIXTURE_PREFIX = "e2e-home-spec-paged";
const PAGED_FIXTURE_COUNT = 10;

const PAGED_FIXTURES = Array.from({ length: PAGED_FIXTURE_COUNT }, (_, index) => ({
  id: `${PAGED_FIXTURE_PREFIX}-${index}`,
  slug: `${PAGED_FIXTURE_PREFIX}-${index}`,
  name: `Wendeline Postlebury the ${index + 1}`,
}));

/** A 1×1 solid white PNG. */
const WHITE_PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

const db = new PrismaClient();

test.beforeAll(async ({}, testInfo) => {
  if (testInfo.project.name !== FIXTURE_PROJECT) return;

  const story = await db.story.findUnique({ where: { slug: STORY_SLUG }, select: { id: true } });
  if (!story) throw new Error(`The seed no longer contains ${STORY_SLUG}.`);

  await db.source.upsert({
    where: { id: SOURCE_ID },
    create: {
      id: SOURCE_ID,
      storyId: story.id,
      url: VIDEO_URL,
      title: "An invented conversation about the spring dates",
      publisher: PUBLISHER,
      publishedDate: new Date("2024-03-01"),
      sourceType: "interview",
    },
    update: { storyId: story.id, url: VIDEO_URL },
  });

  await db.publicFigure.update({
    where: { slug: FIGURE_SLUG },
    data: { imageUrl: PLACEHOLDER_PHOTO, imageLicence: PLACEHOLDER_LICENCE },
  });

  await createPagedFixtures();
});

/**
 * Ten more invented people with published stories, so the grid runs past its first page.
 *
 * Publishing is not something a fixture may shortcut. The database requires a second editor
 * who is not the drafter and at least one source on anything published, and these rows meet
 * both — the constraint is the rule, and a test that worked around it would be testing a
 * database we do not ship.
 */
async function createPagedFixtures() {
  const editors = await db.user.findMany({
    where: { role: "editor" },
    select: { id: true },
    orderBy: { email: "asc" },
    take: 2,
  });
  if (editors.length < 2) throw new Error("The seed no longer has two editors to publish with.");
  const [drafted, verified] = editors as [{ id: string }, { id: string }];

  for (const fixture of PAGED_FIXTURES) {
    const figure = await db.publicFigure.upsert({
      where: { slug: fixture.slug },
      update: { name: fixture.name },
      create: {
        id: fixture.id,
        slug: fixture.slug,
        name: fixture.name,
        shortBio: "An invented person, here only so that the grid has a second page.",
      },
      select: { id: true },
    });

    // Draft first, then add the source, then publish: the trigger that requires a source
    // fires on the status change, and a story cannot be born published without one.
    await db.story.upsert({
      where: { slug: fixture.slug },
      update: { status: "draft" },
      create: {
        id: fixture.id,
        slug: fixture.slug,
        type: "public_figure",
        status: "draft",
        disclosureType: "own",
        publicFigureId: figure.id,
        title: `${fixture.name} on an invented afternoon`,
        summary: "An invented summary, written so that this card has something to show.",
        draftedById: drafted.id,
        verifiedById: verified.id,
      },
    });

    await db.source.upsert({
      where: { id: fixture.id },
      update: { storyId: fixture.id },
      create: {
        id: fixture.id,
        storyId: fixture.id,
        url: `https://example.test/${fixture.slug}`,
        title: "An invented interview",
        publisher: "The Invented Programme",
        publishedDate: new Date("2024-05-01"),
        sourceType: "interview",
      },
    });

    await db.story.update({
      where: { id: fixture.id },
      data: { status: "published", publishedAt: new Date("2024-05-01") },
    });
  }
}

/** Retract before deleting: the database refuses to strip the last source off a published story. */
async function removePagedFixtures() {
  const ids = PAGED_FIXTURES.map((fixture) => fixture.id);
  await db.story.updateMany({ where: { id: { in: ids } }, data: { status: "draft" } });
  await db.source.deleteMany({ where: { id: { in: ids } } });
  await db.story.deleteMany({ where: { id: { in: ids } } });
  await db.publicFigure.deleteMany({ where: { id: { in: ids } } });
}

test.afterAll(async ({}, testInfo) => {
  if (testInfo.project.name === FIXTURE_PROJECT) {
    await db.source.deleteMany({ where: { id: SOURCE_ID } });
    await db.publicFigure.updateMany({
      where: { slug: FIGURE_SLUG },
      data: { imageUrl: null, imageLicence: null },
    });
    await removePagedFixtures();
  }
  await db.$disconnect();
});

test.beforeEach(({}, testInfo) => {
  test.skip(
    testInfo.project.name !== FIXTURE_PROJECT,
    "This file owns database fixtures, so it runs in one project and sets its own viewports.",
  );
});

/** Serve the placeholder photograph as solid white, without adding anything to the repository. */
async function serveWhitePhotograph(page: Page) {
  await page.route(
    (url) => url.pathname.startsWith("/_next/image") || url.pathname === PLACEHOLDER_PHOTO,
    (route) => route.fulfill({ status: 200, contentType: "image/png", body: WHITE_PIXEL }),
  );
}

function axe(page: Page) {
  return new AxeBuilder({ page }).withTags([
    "wcag2a",
    "wcag2aa",
    "wcag21a",
    "wcag21aa",
    "wcag22aa",
  ]);
}

/* ------------------------------------------------------------------------- */

test.describe("searching from the home page", () => {
  test("finds a condition from the box, and nothing but conditions", async ({ page }) => {
    await serveWhitePhotograph(page);
    await page.goto("/");

    await page.getByLabel(/search conditions/i).fill("breast");
    await page.getByRole("button", { name: "Search" }).click();

    await expect(page).toHaveURL(/q=breast/);
    await expect(page.getByRole("heading", { name: /results for/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Conditions", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Charities", exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Stories", exact: true })).toHaveCount(0);
  });

  test("does not find a medicine, because medicines have their own index", async ({ page }) => {
    // Nitrazepam is in the public medicine index under the brand name on the packet. The
    // front page no longer reaches it: /medicines does, and so does every condition page.
    await page.goto("/?q=Mogadon");

    await expect(page.getByRole("region", { name: "Medicines and treatments" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /nothing matches/i })).toBeVisible();
  });

  test("finds a condition by a word somebody would actually type", async ({ page }) => {
    await page.goto("/?q=diabetes");

    const conditions = page.getByRole("region", { name: "Conditions", exact: true });
    await expect(conditions.getByRole("link", { name: /type 2 diabetes/i })).toBeVisible();
  });

  test("finds a condition by a word from its description, not only its name", async ({ page }) => {
    // Somebody who knows the word "insulin" but not the name of the condition.
    await page.goto("/?q=insulin");

    const conditions = page.getByRole("region", { name: "Conditions", exact: true });
    await expect(conditions.getByRole("link", { name: /type 2 diabetes/i })).toBeVisible();
  });

  test("cannot be widened by hand-editing the address", async ({ page }) => {
    // The kind is fixed by the page, so a URL somebody has typed into cannot turn the front
    // page back into a search of everything.
    await page.goto("/?q=breast&kind=charities");

    await expect(page.getByRole("heading", { name: "Conditions", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Charities", exact: true })).toHaveCount(0);
  });

  test("says so plainly when nothing matches", async ({ page }) => {
    await page.goto("/?q=qwertyuiopzxcvbn");
    await expect(page.getByRole("heading", { name: /nothing matches/i })).toBeVisible();
  });
});

test.describe("search never returns something that is not publicly visible", () => {
  test("a retracted story is not in the results", async ({ page }) => {
    // Kit Marrowby's story is retracted in the seed, and the front page is the worst
    // possible place for a retracted story to reappear.
    await page.goto("/?q=Marrowby");

    await expect(page.getByRole("heading", { name: /nothing matches/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /changing how he cooks/i })).toHaveCount(0);
  });

  test("a draft story is not in the results", async ({ page }) => {
    await page.goto("/?q=Dunleath");
    await expect(page.getByRole("link", { name: /going back on air/i })).toHaveCount(0);
  });

  test("a charity is not in the results at all, verified or not", async ({ page }) => {
    // "Kitchen Table Mental Health" is seeded with no verification at all, and the front
    // page no longer searches charities either way.
    await page.goto("/?q=Kitchen+Table");
    await expect(page.getByRole("link", { name: /Kitchen Table Mental Health/i })).toHaveCount(0);
  });

  test("a medicine no editor has written up is not in the results", async ({ page }) => {
    // Metformin exists only because the demo tracking data logged it as somebody's own
    // treatment. That is a private medicine cabinet, not a public index. D-046.
    await page.goto("/?q=Metformin");

    await expect(page.getByRole("region", { name: "Medicines and treatments" })).toHaveCount(0);
  });

  test("no donation prompt appears anywhere on the home page", async ({ page }) => {
    await serveWhitePhotograph(page);
    await page.goto("/");

    await expect(page.getByRole("link", { name: /donate|give now|support us/i })).toHaveCount(0);
    await expect(page.locator('a[href*="/donate"]')).toHaveCount(0);
  });
});

test.describe("with JavaScript switched off", () => {
  test.use({ javaScriptEnabled: false });

  test("the search box still works, and the results still render", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await serveWhitePhotograph(page);

    await page.goto("/");
    await page.getByLabel(/search conditions/i).fill("breast");
    await page.getByRole("button", { name: "Search" }).click();

    await expect(page).toHaveURL(/\?q=breast/);
    await expect(page.getByRole("heading", { name: /results for/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Conditions", exact: true })).toBeVisible();
  });

  test("the cards still render and still link to their stories", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await serveWhitePhotograph(page);
    await page.goto("/");

    const cards = page.getByTestId("figure-card");
    expect(await cards.count()).toBeGreaterThan(2);
    await expect(cards.first()).toHaveAttribute("href", /^\/stories\//);
  });
});

test.describe("the cards under the hero", () => {
  test("show the photograph, and credit the photographer", async ({ page }) => {
    await serveWhitePhotograph(page);
    await page.goto("/");

    const withPhoto = page.locator('[data-testid="figure-card"][data-photograph="yes"]');
    await expect(withPhoto).toHaveCount(1);
    await expect(withPhoto.locator("img")).toBeVisible();

    // CC BY and CC BY-SA require attribution. If the photograph renders, the credit renders.
    const credits = page.getByTestId("photo-credits");
    await expect(credits).toBeVisible();
    await expect(credits).toContainText("An Invented Photographer");
    await expect(credits).toContainText(FIGURE_NAME);
  });

  test("a figure with no licensed photograph gets no photograph", async ({ page }) => {
    await serveWhitePhotograph(page);
    await page.goto("/");

    const withoutPhoto = page.locator('[data-testid="figure-card"][data-photograph="no"]');
    expect(await withoutPhoto.count()).toBeGreaterThan(0);

    // Not a placeholder picture, not a broken image: no image element at all.
    await expect(withoutPhoto.first().locator("img")).toHaveCount(0);
    // And the card is still a finished thing — it has the name, and it goes somewhere.
    await expect(withoutPhoto.first().getByTestId("figure-card-name")).toBeVisible();
    await expect(withoutPhoto.first()).toHaveAttribute("href", /^\/stories\//);
  });

  test("show tags for what the story is about", async ({ page }) => {
    await serveWhitePhotograph(page);
    await page.goto("/");

    const marla = page.getByTestId("figure-card").filter({ hasText: FIGURE_NAME });
    await expect(marla).toContainText("Breast cancer");
  });

  test("keep the content note on a sensitive story", async ({ page }) => {
    await serveWhitePhotograph(page);
    await page.goto("/");

    // Ines Vallimar's story is about depression, which the seed marks sensitive. Nobody
    // should meet it as a glamorous photograph with no warning.
    const sensitive = page.getByTestId("figure-card").filter({ hasText: "Ines Vallimar" });
    await expect(sensitive).toContainText(/content note/i);
  });

  /**
   * The contrast proof.
   *
   * axe cannot decide contrast for text sitting over a picture — it reports it as something
   * a person should check rather than as a pass. So this does the check itself, against the
   * worst photograph physically possible: the scrim is composited over solid white, and the
   * ratio is computed from the colours the browser says it is actually painting.
   */
  test("white text over a photograph clears 4.5:1, even over a white photograph", async ({
    page,
  }) => {
    await serveWhitePhotograph(page);
    await page.goto("/");

    const measured = await page.evaluate(() => {
      /**
       * Ask the browser to paint the colour rather than trying to parse it.
       *
       * Tailwind 4 writes an opacity modifier as `color-mix(in oklab, …)`, and the computed
       * style comes back in whatever colour space the engine settled on. Painting one pixel
       * of `colour` over `beneath` and reading it back gives the composite the browser
       * actually produces, in sRGB, whatever the notation was.
       */
      const paint = (beneath: string, colour: string): [number, number, number] => {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = beneath;
        ctx.fillRect(0, 0, 1, 1);
        ctx.fillStyle = colour;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        return [r!, g!, b!];
      };

      const luminance = ([r, g, b]: [number, number, number]) => {
        const channel = (v: number) => {
          const c = v / 255;
          return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
      };
      const ratio = (a: [number, number, number], b: [number, number, number]) => {
        const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
        return (hi! + 0.05) / (lo! + 0.05);
      };

      return [...document.querySelectorAll('[data-photograph="yes"]')].map((card) => {
        const scrim = card.querySelector('[data-testid="figure-card-scrim"]')!;
        const declared = getComputedStyle(scrim).backgroundColor;

        // The scrim painted over the lightest photograph there can be.
        const worstCase = paint("#ffffff", declared);
        const asCss = `rgb(${worstCase.join(",")})`;

        // Every piece of text inside the bed, painted over that same worst case — so a
        // translucent text colour or a translucent pill behind it is included, not assumed
        // away.
        // Only elements that carry a word of their own. A wrapper reports its children's
        // text but paints none of it, and measuring one tells you nothing about what a
        // reader sees.
        const writesText = (el: Element) =>
          [...el.childNodes].some(
            (node) => node.nodeType === 3 && (node.textContent ?? "").trim().length > 0,
          );

        const measurements = [...scrim.querySelectorAll("span")]
          .filter(writesText)
          .map((el) => {
            const colour = getComputedStyle(el).color;
            const behind = getComputedStyle(el).backgroundColor;
            const bg = paint(asCss, behind);
            return {
              colour,
              text: (el.textContent ?? "").trim().slice(0, 30),
              ratio: ratio(paint(`rgb(${bg.join(",")})`, colour), bg),
            };
          });

        const worst = measurements.reduce((a, b) => (a.ratio <= b.ratio ? a : b));

        return { declared, worstCase, count: measurements.length, worst };
      });
    });

    expect(measured.length).toBeGreaterThan(0);

    for (const card of measured) {
      expect(card.count).toBeGreaterThan(0);
      // The composite under the text is dark, which is what makes the rest of it hold.
      expect(Math.max(...card.worstCase)).toBeLessThan(90);
      expect(
        card.worst.ratio,
        `“${card.worst.text}” in ${card.worst.colour} over ${card.worstCase}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});

/**
 * Everybody with a published story is reachable from the front page, a page at a time.
 *
 * The control that asks for the next page is a link with an address in it rather than a
 * button that fetches, which is what these tests are really checking: the last one runs
 * with JavaScript switched off and still expects it to work.
 */
test.describe("seeing everybody, a page at a time", () => {
  /** How many published stories with a person attached the database currently holds. */
  async function totalPeople(): Promise<number> {
    return db.story.count({ where: { status: "published", publicFigureId: { not: null } } });
  }

  test("shows the first page, and says how many people there are altogether", async ({ page }) => {
    await serveWhitePhotograph(page);
    await page.goto("/");

    const total = await totalPeople();
    expect(total).toBeGreaterThan(12);

    await expect(page.getByTestId("figure-card")).toHaveCount(12);
    await expect(page.getByTestId("figure-count")).toHaveText(`Showing 12 of ${total} people.`);
  });

  test("adds the next page when the button is pressed", async ({ page }) => {
    await serveWhitePhotograph(page);
    await page.goto("/");

    const total = await totalPeople();
    await page.getByTestId("view-more").click();

    await expect(page).toHaveURL(/people=24/);
    await expect(page.getByTestId("figure-card")).toHaveCount(Math.min(24, total));
  });

  test("stops offering more once everybody is shown", async ({ page }) => {
    await serveWhitePhotograph(page);

    const total = await totalPeople();
    await page.goto(`/?people=${total + 12}#people`);

    await expect(page.getByTestId("figure-card")).toHaveCount(total);
    await expect(page.getByTestId("figure-count")).toHaveText(`Showing ${total} of ${total} people.`);
    await expect(page.getByTestId("view-more")).toHaveCount(0);
  });

  test("a nonsense number in the address shows the first page rather than an error", async ({
    page,
  }) => {
    await serveWhitePhotograph(page);
    await page.goto("/?people=banana");

    await expect(page.getByTestId("figure-card")).toHaveCount(12);
  });

  test("a retracted story is not on any page of the grid", async ({ page }) => {
    await serveWhitePhotograph(page);
    await page.goto("/?people=300");

    // Kit Marrowby's story is retracted in the seed. Paging is a new way to reach the grid,
    // and a new way to reach a grid is a new way to leak something that was taken down.
    await expect(page.getByTestId("figure-card").filter({ hasText: "Kit Marrowby" })).toHaveCount(
      0,
    );
  });
});

test.describe("asking for more people with JavaScript switched off", () => {
  test.use({ javaScriptEnabled: false });

  test("the button is a link, so it still loads the next page", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await serveWhitePhotograph(page);
    await page.goto("/");

    await expect(page.getByTestId("figure-card")).toHaveCount(12);
    await page.getByTestId("view-more").click();

    await expect(page).toHaveURL(/people=24/);
    expect(await page.getByTestId("figure-card").count()).toBeGreaterThan(12);
  });
});

test.describe("the video facade", () => {
  /**
   * The promise the facade exists to keep: nothing loads from any Google domain until
   * somebody presses play. Asserted here against a real browser and a real network, rather
   * than against the markup alone.
   */
  test("loads nothing from Google before the person clicks", async ({ page }) => {
    const requested: string[] = [];
    page.on("request", (request) => requested.push(request.url()));

    await serveWhitePhotograph(page);
    await page.goto(`/stories/${STORY_SLUG}`);
    await expect(page.getByTestId("video-facade")).toBeVisible();
    // Give anything lazy a chance to fire.
    await page.waitForLoadState("networkidle");

    expect(requested.filter((url) => GOOGLE.test(url))).toEqual([]);
    // Not even an iframe sitting there waiting to be pointed somewhere.
    await expect(page.locator("iframe")).toHaveCount(0);
    // And no poster frame borrowed from Google's image host.
    await expect(page.getByTestId("video-facade").locator("img")).toHaveCount(0);
  });

  test("says where it will play from, before the person decides", async ({ page }) => {
    await serveWhitePhotograph(page);
    await page.goto(`/stories/${STORY_SLUG}`);
    await expect(page.getByTestId("video-facade")).toContainText(
      /Nothing loads from Google until you press play/i,
    );
  });

  test("the play control is a keyboard-operable button that names the person", async ({
    page,
  }) => {
    await serveWhitePhotograph(page);
    await page.goto(`/stories/${STORY_SLUG}`);

    const play = page.getByTestId("video-play");
    const label = (await play.getAttribute("aria-label")) ?? "";
    expect(label).toContain(FIGURE_NAME);
    expect(label).toContain(PUBLISHER);

    await play.focus();
    await expect(play).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("video-player")).toBeVisible();
  });

  test("on click, loads the player from youtube-nocookie.com and nowhere else", async ({
    page,
  }) => {
    const requested: string[] = [];
    page.on("request", (request) => requested.push(request.url()));

    // Answer the player ourselves, so the suite never reaches out to the real internet.
    await page.route("**youtube-nocookie.com/**", (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<p>An invented player.</p>" }),
    );

    await serveWhitePhotograph(page);
    await page.goto(`/stories/${STORY_SLUG}`);

    // Armed before the click: `waitForRequest` only sees what happens after it is called.
    const playerRequest = page.waitForRequest(/youtube-nocookie\.com/);
    await page.getByTestId("video-play").click();
    await playerRequest;

    const src = (await page.getByTestId("video-player").getAttribute("src")) ?? "";
    expect(new URL(src).hostname).toBe("www.youtube-nocookie.com");
    // The timestamp on the source URL is honoured.
    expect(new URL(src).searchParams.get("start")).toBe("444");

    // The no-cookie host is the only third party reached, and the ordinary player host is
    // still never touched.
    expect(requested.filter((url) => GOOGLE.test(url))).toEqual([]);
    expect(requested.some((url) => url.includes("youtube-nocookie.com"))).toBe(true);
  });

  test("appears on the public figure's page too, and loads nothing there either", async ({
    page,
  }) => {
    const requested: string[] = [];
    page.on("request", (request) => requested.push(request.url()));

    await page.goto(`/public-figures/${FIGURE_SLUG}`);
    await expect(page.getByTestId("video-facade")).toBeVisible();
    await page.waitForLoadState("networkidle");

    expect(requested.filter((url) => GOOGLE.test(url))).toEqual([]);
  });

  test("a story with no video source renders no video at all", async ({ page }) => {
    await page.goto("/stories/ines-vallimar-depression");
    await expect(page.getByTestId("video-facade")).toHaveCount(0);
  });
});

test.describe("accessibility", () => {
  for (const width of [375, 1280]) {
    test(`the home page has no violations at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await serveWhitePhotograph(page);
      await page.goto("/");

      const results = await axe(page).analyze();
      expect(results.violations.map((violation) => violation.id)).toEqual([]);

      // And it does not scroll sideways at this width.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      expect(overflow).toBe(false);
    });

    test(`the home page with results has no violations at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/?q=breast");

      const results = await axe(page).analyze();
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    });

    test(`a story page with a video has no violations at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await serveWhitePhotograph(page);
      await page.goto(`/stories/${STORY_SLUG}`);

      const results = await axe(page).analyze();
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    });

    test(`a public figure's page with a video has no violations at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/public-figures/${FIGURE_SLUG}`);

      const results = await axe(page).analyze();
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    });
  }
});
