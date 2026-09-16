import {
  PrismaClient,
  type DisclosureType,
  type SourceType,
  type StoryType,
} from "../../src/generated/prisma";

import type { SeedContext } from "./context";

/**
 * Fictional public figures and their stories.
 *
 * EVERY PERSON HERE IS INVENTED. Nothing in this file may describe a real person, living or
 * dead, however well known their health disclosures are. Real stories are added by editors
 * through the admin, against verified sources. Brief section 5.3.
 *
 * The same goes for the sources: every URL is on `example.test`, a domain that cannot
 * resolve, so a fabricated citation can never be mistaken for a real one.
 *
 * Owned by the stories feature team.
 */

interface SeedFigure {
  name: string;
  slug: string;
  shortBio: string;
  isDeceased?: boolean;
}

interface SeedSource {
  url: string;
  title: string;
  publisher: string;
  publishedDate: string;
  sourceType: SourceType;
}

interface SeedStory {
  slug: string;
  title: string;
  type: StoryType;
  figureSlug?: string;
  disclosureType: DisclosureType;
  conditions: string[];
  summary: string;
  keyMoments: { label: string; when: string; body: string }[];
  contentNote?: string;
  /** Index into `sources`. The quote is attributed to that source. */
  quote?: { text: string; sourceIndex: number };
  sources: SeedSource[];
  status: "draft" | "in_review" | "published" | "retracted";
  communityPermissionConfirmed?: boolean;
  /** How long ago the twelve-month re-check happened. Drives the review queue. */
  reviewedMonthsAgo?: number;
  retractionReason?: string;
}

const FIGURES: SeedFigure[] = [
  {
    name: "Marla Quintrell",
    slug: "marla-quintrell",
    shortBio:
      "An invented stage actor, thirty years into touring theatre and a long run in the radio serial Harbour Lane. Created for development. She does not exist.",
  },
  {
    name: "Desmond Achebe-Rowntree",
    slug: "desmond-achebe-rowntree",
    shortBio:
      "An invented former county cricketer who now commentates on the county game. Created for development. He does not exist.",
  },
  {
    name: "Ines Vallimar",
    slug: "ines-vallimar",
    shortBio:
      "An invented novelist and essayist, best known for the Saltmarsh trilogy. Created for development. She does not exist.",
  },
  {
    name: "Tomas Brightwater",
    slug: "tomas-brightwater",
    shortBio:
      "An invented folk musician who tours village halls with a four-piece band. Created for development. He does not exist.",
  },
  {
    name: "Orla Penhaligon",
    slug: "orla-penhaligon",
    shortBio:
      "An invented former Paralympic rower, now a coach at a community club. Created for development. She does not exist.",
  },
  {
    name: "Kit Marrowby",
    slug: "kit-marrowby",
    shortBio:
      "An invented television cook with a long-running weekday programme. Created for development. He does not exist.",
  },
  {
    name: "Saoirse Dunleath",
    slug: "saoirse-dunleath",
    shortBio:
      "An invented radio broadcaster and former newsreader. Created for development. She does not exist.",
  },
];

const STORIES: SeedStory[] = [
  {
    slug: "marla-quintrell-breast-cancer",
    title: "Marla Quintrell on finishing a tour in the middle of treatment",
    type: "public_figure",
    figureSlug: "marla-quintrell",
    disclosureType: "own",
    conditions: ["breast-cancer"],
    summary: `Marla Quintrell was diagnosed with breast cancer after a routine screening appointment, two weeks before a national tour was due to open. She has spoken about carrying on working through surgery and radiotherapy, and about the parts of it she did not expect — losing her voice for a while, and the tiredness that arrived months after the treatment had finished.

She has been clear that carrying on working was her own decision rather than anyone's advice, and that she had a great deal of help. She has since talked about the gap between finishing treatment and feeling like yourself again, which she describes as the part nobody warned her about.`,
    keyMoments: [
      {
        label: "Diagnosis",
        when: "Autumn, four years ago",
        body: "Found at a routine screening appointment, with no symptoms she had noticed.",
      },
      {
        label: "Surgery and radiotherapy",
        when: "The following winter",
        body: "Treatment ran alongside a reduced touring schedule, with performances dropped around hospital days.",
      },
      {
        label: "Afterwards",
        when: "The year after",
        body: "She has described the tiredness arriving once treatment ended, rather than during it.",
      },
    ],
    quote: {
      text: "I kept working because it was the only hour of the day when nobody looked at me with that face.",
      sourceIndex: 0,
    },
    sources: [
      {
        url: "https://example.test/harbour-lane-interview",
        title: "A long conversation with Marla Quintrell",
        publisher: "Example Arts Review",
        publishedDate: "2023-03-14",
        sourceType: "interview",
      },
      {
        url: "https://example.test/quintrell-statement",
        title: "A note to audiences about the spring dates",
        publisher: "Example Theatre Company",
        publishedDate: "2022-11-02",
        sourceType: "statement",
      },
    ],
    status: "published",
    reviewedMonthsAgo: 2,
  },
  {
    slug: "desmond-achebe-rowntree-type-2-diabetes",
    title: "Desmond Achebe-Rowntree on the diagnosis he ignored for a year",
    type: "public_figure",
    figureSlug: "desmond-achebe-rowntree",
    disclosureType: "own",
    conditions: ["type-2-diabetes"],
    summary: `Desmond Achebe-Rowntree has talked publicly about being told he had type 2 diabetes and then, in his own words, doing very little about it for about a year. He has described the appointments he skipped and the reasons he gave himself, and what changed when a friend of his was admitted to hospital.

He now talks about what his own management looks like day to day: regular blood tests, medication, and walking. He has been careful to say each time that this is what he does, not what anyone else should do.`,
    keyMoments: [
      {
        label: "Diagnosis",
        when: "Eight years ago",
        body: "Picked up in a blood test after a routine medical for work.",
      },
      {
        label: "The year of not dealing with it",
        when: "The year after",
        body: "He has described missing appointments and telling himself it was not serious.",
      },
      {
        label: "Changing how he managed it",
        when: "Six years ago",
        body: "He began regular checks and medication, and has spoken about walking as the part he kept up.",
      },
    ],
    quote: {
      text: "I did not argue with the diagnosis. I just quietly decided it could wait. It could not.",
      sourceIndex: 0,
    },
    sources: [
      {
        url: "https://example.test/county-game-podcast-42",
        title: "Episode 42: Desmond Achebe-Rowntree",
        publisher: "Example County Game Podcast",
        publishedDate: "2024-06-09",
        sourceType: "podcast",
      },
    ],
    status: "published",
    // Deliberately older than a year, so the twelve-month review queue has something in it.
    reviewedMonthsAgo: 14,
  },
  {
    slug: "ines-vallimar-depression",
    title: "Ines Vallimar on the year she could not write",
    type: "public_figure",
    figureSlug: "ines-vallimar",
    disclosureType: "own",
    conditions: ["depression"],
    contentNote:
      "This story talks about depression, and about a long period of being very unwell. You do not have to read it now. Support is listed at the end of the page, and it is there any time.",
    summary: `Ines Vallimar has written about a year in which she could not work at all, and about being treated for depression. She has described the ordinary things that became difficult first — answering letters, leaving the house — and how long it took her to call it anything other than being tired.

She has spoken about talking therapy and medication as the two things that helped her, and has said each time that she is describing her own treatment and not making a recommendation. She has also written about telling her publisher, and about how much easier the second conversation was than the first.`,
    keyMoments: [
      {
        label: "The year she stopped writing",
        when: "Six years ago",
        body: "She has described months of not working, and of not saying why.",
      },
      {
        label: "Getting help",
        when: "The following spring",
        body: "She saw her GP after a friend pushed her to, and began treatment.",
      },
      {
        label: "Writing about it",
        when: "Three years ago",
        body: "She published an essay about that year, which is the source for most of this story.",
      },
    ],
    quote: {
      text: "The first thing to go was the post. A pile of unopened letters is a very quiet alarm.",
      sourceIndex: 0,
    },
    sources: [
      {
        url: "https://example.test/vallimar-essay-the-quiet-year",
        title: "The quiet year",
        publisher: "Example Literary Quarterly",
        publishedDate: "2023-09-01",
        sourceType: "article",
      },
      {
        url: "https://example.test/vallimar-festival-talk",
        title: "In conversation at the Example Book Festival",
        publisher: "Example Book Festival",
        publishedDate: "2024-05-18",
        sourceType: "interview",
      },
    ],
    status: "published",
    reviewedMonthsAgo: 1,
  },
  {
    slug: "tomas-brightwater-mothers-breast-cancer",
    title: "Tomas Brightwater on the year his mother was ill",
    type: "public_figure",
    figureSlug: "tomas-brightwater",
    disclosureType: "loved_one",
    conditions: ["breast-cancer"],
    summary: `Tomas Brightwater has spoken about the year his mother was treated for breast cancer, and about being the one who drove to the appointments. He has talked about the practical side that nobody prepares you for — the parking, the forms, the waiting — and about writing songs in hospital car parks because it was the only quiet he had.

He has been clear that the story is his mother's as much as his, and that she agreed to him talking about it. He talks about his own part in it: being a son, not a patient.`,
    keyMoments: [
      {
        label: "Her diagnosis",
        when: "Five years ago",
        body: "He has described the phone call, and the drive home afterwards.",
      },
      {
        label: "Treatment",
        when: "That year",
        body: "He took a year off touring and has talked about what that did to the band's finances.",
      },
      {
        label: "The record",
        when: "Two years ago",
        body: "He released an album written largely during that year, and has spoken about it since.",
      },
    ],
    sources: [
      {
        url: "https://example.test/brightwater-folk-hour",
        title: "Tomas Brightwater on the year off",
        publisher: "Example Folk Hour",
        publishedDate: "2024-02-20",
        sourceType: "interview",
      },
    ],
    status: "published",
    reviewedMonthsAgo: 3,
  },
  {
    slug: "a-community-story-depression-and-work",
    title: "A community story: going back to work after depression",
    type: "community",
    disclosureType: "own",
    conditions: ["depression"],
    contentNote:
      "This story talks about depression, and about being off work for a long time. You do not have to read it now. Support is listed at the end of the page, and it is there any time.",
    summary: `This story was shared by a member of the UnTouchable community, who asked to stay anonymous. She was off work for seven months with depression, and has written about the return: the phased hours, the conversation with her manager, and the week she nearly resigned.

She describes what helped as being allowed to come back slowly, and having one person at work who knew. She is writing about her own experience only, and has asked us to say that she is not offering advice to anyone else.`,
    keyMoments: [
      {
        label: "Signed off",
        when: "Two years ago",
        body: "She was signed off work, and has described the first fortnight as mostly sleep.",
      },
      {
        label: "Going back",
        when: "Seven months later",
        body: "She returned on reduced hours, building up over about three months.",
      },
      {
        label: "A year on",
        when: "Last year",
        body: "She is back to her usual hours, and has written about what she would do differently.",
      },
    ],
    sources: [
      {
        url: "https://example.test/community/returning-to-work",
        title: "Going back to work, slowly",
        publisher: "Written for UnTouchable, with permission",
        publishedDate: "2025-04-11",
        sourceType: "statement",
      },
    ],
    status: "published",
    communityPermissionConfirmed: true,
    reviewedMonthsAgo: 4,
  },
  {
    slug: "kit-marrowby-type-2-diabetes",
    title: "Kit Marrowby on changing how he cooks",
    type: "public_figure",
    figureSlug: "kit-marrowby",
    disclosureType: "own",
    conditions: ["type-2-diabetes"],
    summary: `Kit Marrowby talked on his programme about being diagnosed with type 2 diabetes, and about what changed in his own kitchen afterwards.

This story has been retracted. It is kept in the admin so that the record of what we published, and why we took it down, is complete. It does not appear anywhere on the public site.`,
    keyMoments: [
      { label: "Diagnosis", when: "Three years ago", body: "Described on his programme." },
    ],
    sources: [
      {
        url: "https://example.test/marrowby-programme-notes",
        title: "Programme notes, series nine",
        publisher: "Example Television",
        publishedDate: "2023-10-05",
        sourceType: "statement",
      },
    ],
    status: "retracted",
    retractionReason:
      "His representative asked us to take it down: the programme segment was a general item about cooking and he had made no disclosure about his own health. Our summary went further than the source did.",
  },
  {
    slug: "orla-penhaligon-brothers-depression",
    title: "Orla Penhaligon on her brother, and on being the one who is fine",
    type: "public_figure",
    figureSlug: "orla-penhaligon",
    disclosureType: "loved_one",
    conditions: ["depression"],
    contentNote:
      "This story talks about depression, and about supporting someone who is very unwell. You do not have to read it now. Support is listed at the end of the page, and it is there any time.",
    summary: `Orla Penhaligon has spoken about her brother's depression, and about being the sibling everyone assumed was coping. She has described years of being the reliable one, and what it took to say that she was not, in fact, fine.

She has said that her brother agreed to her speaking about this, and she keeps the detail of his treatment to what he has said himself. This draft is with a second editor, who is checking both sources before it goes anywhere near the public site.`,
    keyMoments: [
      {
        label: "Her brother's diagnosis",
        when: "Nine years ago",
        body: "She has described the family closing ranks, and not talking about it.",
      },
      {
        label: "Saying it out loud",
        when: "Four years ago",
        body: "She spoke about it publicly for the first time in a long interview.",
      },
    ],
    sources: [
      {
        url: "https://example.test/penhaligon-long-interview",
        title: "Orla Penhaligon: the reliable one",
        publisher: "Example Sport Monthly",
        publishedDate: "2022-08-30",
        sourceType: "interview",
      },
      {
        url: "https://example.test/penhaligon-club-newsletter",
        title: "A note from our head coach",
        publisher: "Example Community Rowing Club",
        publishedDate: "2023-01-16",
        sourceType: "statement",
      },
    ],
    status: "in_review",
  },
  {
    slug: "saoirse-dunleath-breast-cancer",
    title: "Saoirse Dunleath on going back on air",
    type: "public_figure",
    figureSlug: "saoirse-dunleath",
    disclosureType: "own",
    conditions: ["breast-cancer"],
    summary: `Saoirse Dunleath has talked about being treated for breast cancer, and about going back to live radio afterwards. This is an early draft: the summary still leans too close to the wording of the interview, and there is no source on it yet, so it cannot be sent for review.`,
    keyMoments: [
      { label: "Diagnosis", when: "Two years ago", body: "Announced in a short statement at the time." },
    ],
    sources: [],
    status: "draft",
  },
];

export async function seedStories(db: PrismaClient, ctx: SeedContext) {
  const storySlugs = STORIES.map((story) => story.slug);
  const figureSlugs = FIGURES.map((figure) => figure.slug);

  // Start from a clean slate so the seed can be run again. Published stories are moved back
  // to draft first: the database will not let the last source of a published story go, and
  // that is exactly the rule we want left in place.
  await db.story.updateMany({ where: { slug: { in: storySlugs } }, data: { status: "draft" } });
  await db.story.deleteMany({ where: { slug: { in: storySlugs } } });
  await db.publicFigure.deleteMany({ where: { slug: { in: figureSlugs } } });

  const figures: Record<string, string> = {};
  for (const figure of FIGURES) {
    const record = await db.publicFigure.create({
      data: {
        name: figure.name,
        slug: figure.slug,
        shortBio: figure.shortBio,
        isDeceased: figure.isDeceased ?? false,
      },
      select: { id: true },
    });
    figures[figure.slug] = record.id;
  }

  const storyIds: Record<string, string> = {};

  for (const story of STORIES) {
    const conditionIds = story.conditions.map((slug) => {
      const condition = ctx.conditions[slug];
      if (!condition) throw new Error(`Seed story ${story.slug} names unknown condition ${slug}`);
      return condition.id;
    });

    // Always born a draft. A story is only ever published by the two-step route, and the
    // database refuses a published row with no source anyway.
    const record = await db.story.create({
      data: {
        type: story.type,
        publicFigureId: story.figureSlug ? figures[story.figureSlug] : null,
        disclosureType: story.disclosureType,
        title: story.title,
        slug: story.slug,
        summary: story.summary,
        keyMomentsJson: story.keyMoments,
        contentNote: story.contentNote ?? null,
        communityPermissionConfirmed:
          story.type === "community" ? (story.communityPermissionConfirmed ?? false) : null,
        status: "draft",
        draftedById: ctx.editorOne.id,
        conditions: { create: conditionIds.map((conditionId) => ({ conditionId })) },
        sources: {
          create: story.sources.map((source) => ({
            url: source.url,
            title: source.title,
            publisher: source.publisher,
            publishedDate: new Date(source.publishedDate),
            sourceType: source.sourceType,
          })),
        },
      },
      select: { id: true, sources: { select: { id: true }, orderBy: { createdAt: "asc" } } },
    });
    storyIds[story.slug] = record.id;

    if (story.quote) {
      const source = record.sources[story.quote.sourceIndex];
      if (!source) throw new Error(`Seed story ${story.slug} quotes a source that is not there`);
      await db.story.update({
        where: { id: record.id },
        data: { quote: story.quote.text, quoteSourceId: source.id },
      });
    }

    if (story.status === "in_review") {
      await db.story.update({ where: { id: record.id }, data: { status: "in_review" } });
    }

    if (story.status === "published" || story.status === "retracted") {
      const reviewedAt = new Date();
      reviewedAt.setMonth(reviewedAt.getMonth() - (story.reviewedMonthsAgo ?? 0));

      // A second editor, never the drafter. This is the constraint the whole workflow exists
      // to protect, so even the seed goes through it.
      await db.story.update({
        where: { id: record.id },
        data: {
          status: "published",
          verifiedById: ctx.editorTwo.id,
          publishedAt: reviewedAt,
          lastReviewedAt: reviewedAt,
        },
      });
    }

    if (story.status === "retracted") {
      await db.story.update({
        where: { id: record.id },
        data: {
          status: "retracted",
          retractedAt: new Date(),
          retractionReason: story.retractionReason ?? "Retracted during development seeding.",
        },
      });
    }
  }

  await seedRequests(db, storyIds);
}

/** A couple of correction requests, so the admin queue is not empty in development. */
async function seedRequests(db: PrismaClient, storyIds: Record<string, string>) {
  const open = storyIds["desmond-achebe-rowntree-type-2-diabetes"];
  const closed = storyIds["kit-marrowby-type-2-diabetes"];

  if (open) {
    await db.takedownRequest.create({
      data: {
        storyId: open,
        type: "correction",
        requesterName: "Invented Reader",
        requesterEmail: "reader@example.test",
        relationship: "a reader",
        reason:
          "The story says the diagnosis was eight years ago, but the podcast episode it cites says nine. Worth checking against the recording.",
        status: "open",
      },
    });
  }

  if (closed) {
    await db.takedownRequest.create({
      data: {
        storyId: closed,
        type: "removal",
        requesterName: "Invented Representative",
        requesterEmail: "office@example.test",
        relationship: "their representative",
        reason:
          "My client made no disclosure about his own health on that programme. Please take the story down.",
        status: "actioned",
        resolutionNote:
          "Checked against the programme notes. The segment was general and carried no personal disclosure, so our summary went further than the source. Story retracted, and the requester told the same day.",
        resolvedAt: new Date(),
      },
    });
  }
}
