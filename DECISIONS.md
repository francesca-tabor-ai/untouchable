# Decisions log

Notable choices and why. Newest first. Every agent working on this repo appends here
rather than rewriting history.

---

## 2026-09-16 — Wave 0 foundation

### D-001 · Package manager: npm, not pnpm
The repository lives on an exFAT volume, which does not support hard links. pnpm's content-addressed
store depends on them and fails. npm works (symlinks are supported). If the repo later moves to an
APFS volume or CI, pnpm becomes viable again.

### D-002 · Brand direction: warm and community-led
The UI brief contained two conflicting type systems. Bebas Neue (condensed, all-caps) was dropped:
it reads as institutional and loses legibility at small sizes, which conflicts with Principle 9
("accessible and calm") and WCAG 2.2 AA. We keep the heritage-wellness palette but warm it — a soft
serif display paired with Rubik, which is friendly and open — and add a warm accent so the product
feels like a community rather than a clinic. Confirmed with the product owner.

### D-003 · Auth: email and password
Auth.js (v5) credentials with Argon2id hashing, plus an explicit 18-or-over confirmation. Chosen over
magic link because it works with no email provider in development and in Playwright end-to-end tests.
The `EmailProvider` interface is in place so magic link can be added later without touching call sites.

### D-004 · Launch conditions: breast cancer, type 2 diabetes, depression
Three different tracking shapes: an acute-treatment journey, a long-term metabolic condition, and a
mental health condition. Depression is deliberately included so the sensitive-topic path (content
notes, Samaritans signposting, red-flag rules) is exercised by real content rather than stubbed.

### D-005 · Fictional seed data throughout, including charities
The brief requires fictional public figures. We extend this to charities: a seeded listing carrying a
real charity's registered number would assert a verification that no editor performed. All seed
charities are clearly fictional with obviously invalid registration numbers, and the seed script
prints a warning. Real charities are added by editors through the admin, against the official register.

### D-006 · One choke point for all aggregate analytics
Every aggregate query goes through `src/lib/research/aggregate.ts`. It applies consent filtering and
small-group suppression, and no route or admin page may query tracking tables directly. This is
enforced by an ESLint rule and by tests, not by convention, because Section 9 makes it a hard
requirement that no analytics query can bypass it.

### D-007 · Free text is excluded from research exports by type, not by discipline
Free-text fields (`note`, `description`, `reason`) live behind types that the export layer cannot
accept. A developer who adds a free-text field to an export gets a compile error rather than a
privacy incident.

### D-008 · Postgres runs locally, no Docker
Docker is not installed on the build machine; PostgreSQL 17 is running via Homebrew. Databases:
`untouchable_dev`, `untouchable_shadow`, `untouchable_test`. Production target remains a UK-region
managed Postgres.

### D-009 · Next.js 16 App Router, Tailwind 4
Scaffolded from `create-next-app`. Tailwind 4 puts design tokens in CSS (`@theme`) rather than a JS
config, so the token file is the single source of truth for the design system.

### D-011 · The working copy lives on the internal SSD, not the external drive
The project was started on an exFAT external volume. Measured there, five small file writes took
**37 seconds**; the same writes on the internal SSD took **4 milliseconds**. `npm install` ran for
over half an hour without completing and deleting a `node_modules` tree progressed at roughly one
directory per minute. A Next.js build writes thousands of small files, so that volume cannot host
this build at all.

The working copy is now `~/Projects/untouchable`, pushed to the same GitHub repository, which is the
source of truth. Nothing was deleted from the external drive. Worth flagging to the owner separately:
write latency that bad is not normal for a healthy drive.

### D-012 · Prisma pinned to 6.x
`npm install prisma` resolved to **8.0.0-rc.15** — the `latest` dist-tag currently points at a release
candidate with a completely redesigned CLI (`contract`, `migration`, `db` replacing `migrate`). An
eleven-milestone health platform built by parallel agents is the wrong place to absorb an RC's churn,
so both `prisma` and `@prisma/client` are pinned to the stable 6 line.

### D-010 · GitHub repository is private
The repository is private at creation. The brand name, trademark position and legal review of consent
and disclaimer wording are all unresolved (brief Section 12), and the repo contains the full data
model for a health platform. Visibility is a product-owner decision to revisit before launch.

---

## 2026-09-16 — Wave 2, charity giving

Numbered from D-020 to leave room for the stories wave, which is appending to this file at
the same time. Nothing above has been changed.

### D-020 · An overdue re-check flags a listing; it does not hide it
Brief 6.1 says charities not re-verified within twelve months are **flagged**, and rule 4 says an
**unverified** charity is never public. These are different states and we treat them differently. A
listing nobody has ever checked has never been public and cannot become public. A listing an editor
did check, thirteen months ago, stays in the directory and is flagged in the admin as overdue.

Pulling support links away from someone mid-treatment because an internal review date slipped is a
harm caused by our own admin backlog, and the person on the page has no idea it happened. The flag
belongs where the backlog can be fixed. `verificationState()` returns `never_verified`, `lapsed` or
`current`, and only `never_verified` affects public visibility.

### D-021 · Charity logos are served from our own origin or not at all
`logoPermission` was always going to gate the logo. We added a second condition: the file must be
served from our origin. A logo hot-linked from the charity's own server sends that server the IP
address of everyone who loads the page — including a page about a single condition, which is close
to disclosing a diagnosis to a third party who never asked for it and never agreed to hold it.

So `canShowLogo()` requires both written permission and a same-origin path. A remote `logoUrl` is
still stored, because it records where the file came from, but it is never rendered; the listing
falls back to the charity's name as text. The admin tells the editor why.

### D-022 · The donate hand-off is a server redirect, not a click handler
`/charities/[slug]/donate?from=<page kind>` records the referral and issues a 303 to the charity's
own `donationUrl`. The alternative — an anchor straight to the charity with a JavaScript click
handler firing the referral — was rejected for two reasons. Counting a click would depend on a
script running, which is exactly the shape of the third-party analytics we have banned. And the
hand-off would silently stop being counted whenever a script failed.

The handler is given no session, no headers and no request body. It cannot learn who is clicking,
because it is never told. `rel="noopener noreferrer"` on the link and `Referrer-Policy: no-referrer`
on the redirect mean the charity learns nothing about where the person came from either.

The `from` parameter is coerced against a closed list of four page kinds. Anything else becomes
`"charity"`, so no URL, id or free text can ever reach the `originPage` column.

### D-023 · No-pressure gating applies where we bring giving to someone, not where they came to give
`donationPromptDecision()` is consulted before the charity block renders on a condition page, a
story page, or the causes page — the places where giving is put in front of somebody who came for
something else. It is not consulted before the Donate button on `/charities` or a charity's own
page. Someone who has navigated to a charity's page has asked for the donate button; hiding it there
would be a different kind of disrespect, and would break giving rather than de-pressurise it.

Both surfaces are still declared in the policy, so a future "other causes you might support" block
on those pages is gated like anything else.

### D-024 · The suppression module, for the waves that will call it
`src/lib/charities/prompt-policy.ts` is pure — no database, no clock of its own — and is the only
place the decision is made. `src/lib/charities/prompt-context.ts` is the only place the facts are
gathered.

```ts
// The rule. Pure. Test it with anything.
donationPromptDecision(context: DonationPromptContext): DonationPromptDecision
mayShowDonationPrompt(context: DonationPromptContext): boolean

interface DonationPromptContext {
  surface: DonationSurface;             // closed list; unknown surfaces are denied
  inOnboarding?: boolean;
  hasOpenSafetyConcern?: boolean;
  lastCheckIn?: { completedAt: Date; hadHighSymptomScores: boolean } | null;
  now?: Date;                           // injectable clock
}
interface DonationPromptDecision {
  allowed: boolean;
  reason: "safety_surface" | "onboarding" | "recent_high_symptom_check_in"
        | "open_safety_concern" | "surface_not_approved" | null;
  explanation: string;                  // internal only, never shown to the person
}

// The facts. Reads the database. Call this from a screen.
donationPromptAllowed(surface: DonationSurface, user: { id, ageConfirmed } | null): Promise<boolean>
donationPromptDecisionFor(surface, user): Promise<DonationPromptDecision>
```

Two properties worth keeping. **Default deny**: a surface that is not on `PROMPTABLE_SURFACES` gets
no prompt, so a screen added by a later wave is quiet until somebody decides otherwise on the record.
**No clinical judgement here**: this module does not decide what a high symptom score is. The
check-in domain sets `hadHighSymptomScores`; there is one marked seam in `prompt-context.ts` for
wave 6 and wave 8 to fill, and no calling screen needs revisiting when they do.

`QUIET_HOURS_AFTER_HARD_CHECK_IN` is 24. Long enough that a prompt is not attached to the bad
moment; short enough that someone who goes looking for a charity the next day is not blocked.

Donation copy is also checked, not just placed: `pressureLanguageProblem()` catches countdowns,
scarcity, guilt, obligation and reward-for-giving, and a test runs every string in `DONATION_COPY`
through it. A well-meaning rewrite cannot quietly reintroduce a deadline.

### D-025 · Vitest runs one file at a time
Every database-backed suite calls `resetDatabase`, which is `TRUNCATE ... CASCADE` across every
table. Two suites doing that concurrently in the same database take their locks in different orders
and Postgres kills one with a deadlock — which it did, on nine files out of eleven, as soon as the
charity suites landed. `fileParallelism: false` in `vitest.config.ts` fixes it; the suite still runs
in about four seconds.

This is a shared file, changed by the charity wave because the failure blocks everyone. The platform
lead should take ownership of the call. The better long-term answer is a Postgres schema per worker,
which is worth building when the suite is slow enough to need it and not before.

---

## 2026-09-16 — Milestone 1, celebrity stories hub

### D-013 · Public story surfaces are never cached
Every public stories route (`/stories`, `/stories/[slug]`, `/conditions`, `/conditions/[slug]`,
`/public-figures/[slug]`, `/corrections`, `sitemap.xml`) is `dynamic = "force-dynamic"`. Brief 5.2
requires retraction to take effect immediately, and "immediately" cannot mean "at the next
revalidation". The pages are still server-rendered, so SEO is unaffected. The whole of
`src/lib/stories/queries.ts` filters on `status = "published"`, so there is one place where that
promise is kept and `tests/unit/stories-retraction.test.ts` checks each surface separately.

### D-014 · A published story is not edited in place
Editing is closed once a story is published. A correction means retract → edit → back through
review and a second editor. The alternative — letting an editor change live text — would make
two-step publishing decorative, because anything could be published as a bland draft and then
rewritten. The cost is that a correction takes the story down for a few minutes; that is the right
way round when the subject is a named person's health. `returnToDraft` accepts a retracted story
so the loop is closed.

### D-015 · Charity blocks are withheld from sensitive-topic pages
The charity team's `CharitiesForCondition` and `StoryCharities` are rendered through
`src/components/stories/charity-slots.tsx`. On a story or condition page that touches a sensitive
topic (`Condition.isSensitiveTopic`) the slot is not rendered at all: those pages carry a content
note and support contacts, which makes them safety screens, and AGENTS.md rule 5 keeps donation
prompts off a safety screen. Their own `donationPromptAllowed` policy cannot see that a particular
story is sensitive, so the stories hub withholds the slot rather than asking them to. Worth the
charity team confirming.

### D-016 · No image upload in milestone 1
`PublicFigure.imageUrl` cannot be set without `imageLicence` (database constraint), and there is no
licensing workflow yet. Rather than build an upload that would immediately need a licence record
attached to it, public figure pages use their name and no photograph. The admin form has no image
field at all, so it is not possible to store an unlicensed image by accident.

### D-017 · Search and filter are a plain GET form
The story index filters through the query string with a normal `<form method="get">` and a list of
condition links. It works with no JavaScript, every result has a shareable address, and the back
button behaves. A client-side filter would have been fewer requests and a worse page for someone on
a bad connection in a hospital corridor.

### D-018 · Key moments are JSON on the story, not their own table
`Story.keyMomentsJson` is only ever read and written as one ordered list and is never queried
across stories, so it stays JSON. `src/lib/stories/key-moments.ts` is the only module that
understands the shape, including the `label | when | body` textarea format the admin uses.

### D-026 · The design system's named type scale had to be taught to tailwind-merge
`cn()` runs every class list through tailwind-merge, which knows Tailwind's own `text-sm`,
`text-base` and so on. Our scale is named instead — `text-hero`, `text-body`, `text-small` — and
tailwind-merge read those as *colours*. `text-small` therefore looked like a conflict with
`text-white`, and since the size variant is emitted after the colour variant, the colour lost.

Every primary button in the product was rendering body ink on the dark green fill: **1.33:1**,
against the 4.5:1 the design system requires and axe flags as a serious WCAG 2.2 AA failure. It was
not specific to charity pages — the same class list appears on the home page.

Fixed in `src/lib/cn.ts` by naming the scale in a `extendTailwindMerge` font-size group, which fixes
every component at once without touching `src/components/ui/`. Colour overrides passed through
`className` still win, as they should. The list in `cn.ts` and the scale in `tokens.css` now have to
be kept in step; the comment there says so.

Found by the axe scan in `tests/e2e/charities.spec.ts`, which is the argument for running one.
Flagged to the platform lead: `src/lib/cn.ts` is design-system plumbing, and the call belongs
to them even though the file is not on the single-writer list.

### D-027 · The donate redirect asks for `no-referrer` and does not get it
`/charities/[slug]/donate` sets `Referrer-Policy: no-referrer` on its redirect. The site-wide header
in `next.config.ts` wins, so what actually reaches the browser is
`strict-origin-when-cross-origin`. That sends the charity our origin and never a path or a query
string, so nothing about the person travels with the click, and the anchor still carries
`rel="noopener noreferrer"`.

We have left the route header in place — it is correct, and it starts working the moment the global
header is scoped. `next.config.ts` belongs to the platform lead; if they want `no-referrer` on the
hand-off, it is a route-specific entry in their `headers()` array. The end-to-end test asserts the
policy is one of the safe ones rather than pinning the exact value, so it does not go red either way.

---

## 2026-09-16 — Wave 3: sign-up, onboarding and consent

### D-013 · Onboarding progress is derived, never stored
There is no "current step" column and no session state. Each step in `src/lib/onboarding/steps.ts`
answers `isComplete(userId)` by reading the data that step saves — a profile name, a current
`core_tracking` consent, a `UserCondition` row, an active `UserSymptom` row. Resuming is therefore not
a feature we implemented; it is a property of the design. Close the tab, come back next week on a
different device, and `/onboarding` shows exactly where you were.

It also means the flow is honest in the other direction: withdraw tracking consent and the consent
step is genuinely no longer complete, so onboarding reopens at it rather than showing a tick for a
permission we no longer have.

### D-014 · Consent wording lives in `src/lib/consent/text.ts`, versioned by date
`CONSENT_TEXT_VERSION` is **"2026-09-16"**. Every `ConsentRecord` stores the version shown, and
`recordConsentDecisions` writes a fresh row when an answer is new, when it changes, **or when the
person is answering under wording they have not seen before**. So a wording change is a re-consent
event rather than a silent reinterpretation of an old answer. Re-saving an unchanged answer under the
same wording writes nothing, so the history stays readable.

The screen carries a prominent note that the wording has not been through legal review (brief section
12). That note is shown to the user, not buried in a comment: if we are asking for explicit consent to
hold special category data, the person should know the words have not been checked yet.

### D-015 · Withdrawing `core_tracking` is a separate, explicit screen
`/settings/consent/stop-tracking` lists what stops working and what happens to data already recorded,
then confirms. Every other consent is a one-button change in place. The asymmetry is deliberate and it
runs the honest way round: the screen exists to *inform*, not to talk anyone out of it. There is no
"are you sure", no guilt, and the confirm button is not made quieter than the one that goes back.

Withdrawal is enforced, not just recorded: `requireTrackingConsent()` re-reads the consent table on
every tracking page and every tracking action, so the next request after withdrawal is already closed.
Nothing caches a consent decision onto another record.

### D-016 · Treatments and baseline are registered steps with a placeholder screen
Brief 7.1 has six steps; two of them belong to later milestones. Rather than leave them out and
restructure later, both are registered in `ONBOARDING_STEPS` with `status: "coming_soon"`, a screen
that says plainly it is not built yet, and a "Skip for now" link. They do not count towards finishing
onboarding, and they do not pretend to be done.

**The contract for a later agent.** To finish either step: build the screen at the existing `href`,
replace `isComplete`, and change `status` to `"ready"`. Nothing else in the flow, the progress display
or the resume logic needs touching.

- `treatments` (milestone 5) — `href: "/onboarding/treatments"`. `isComplete(userId)` is currently
  `TreatmentCourse.count({ where: { userId } }) > 0`. Milestone 5 should keep that meaning but decide
  what "I am not on any treatment" looks like: with no marker for it, someone with nothing to record
  can never complete the step. That needs either a "nothing at the moment" record or a schema field,
  and it is a question for the platform lead, not something to invent locally.
- `baseline` (milestone 4) — `href: "/onboarding/baseline"`. `isComplete(userId)` is currently
  `Response.count({ where: { userId } }) > 0`, which is a placeholder. Once the questionnaire engine
  exists it should be "a `Response` exists against the current baseline `QuestionnaireVersion`",
  scoped to that version so a later general check-in does not retroactively satisfy the baseline.

Both step pages already call `requireAdult` and `requireTrackingConsent`, so a later agent inherits the
gate rather than having to remember it.

### D-017 · Sign-up can still be used to test whether an address has an account
Sign-in is safe: one message, the same whatever went wrong, and `authorize` does the Argon2 work even
for an address that does not exist, so it cannot be timed either. Sign-up cannot be made safe the same
way — creating an account with an address that is taken has to fail, and the person has to be told
something. We show a single neutral message and nothing else.

Closing it properly means sign-up by email verification: accept any address, send a link, and say "if
that address can be used, check your email" either way. That needs a real email provider, which we do
not have yet. Flagged rather than fudged.

### D-018 · Demographics are asked at the welcome step, and all of them are optional
Brief 7.1 puts welcome before consent, so the display name is collected before any consent decision.
Only the name is required; year of birth, sex and region are optional, each with a line saying why we
ask. Year of birth is a year — the database refuses anything that would make the person under 18
(`year_of_birth_plausible`) — and region is an ONS region, never a postcode.

### D-019 · The design system has no checkbox, select or radio
Consent, conditions, symptoms and the 18-or-over confirmation all need a checkbox, and the profile
form needs a select. Rather than four slightly different ones, there is a single implementation of
each in the feature layer: `src/components/onboarding/checkbox-row.tsx` and
`src/components/onboarding/select-input.tsx`, both plain HTML controls with real labels. They should
be promoted into `src/components/ui/` by the platform lead — two slightly different checkboxes is how
a design system dies, and right now there is one checkbox in exactly the wrong place.

### D-020 · `useActionState` state lives in `src/lib/onboarding/form-state.ts`, not beside the actions
A `"use server"` file may only export async functions. Exporting the initial form-state object from an
actions file is a build error, and a confusing one — it surfaces as "failed to collect page data" for
whichever page imports it. The shared `FormState` type and `EMPTY_FORM_STATE` therefore live in a
plain module that both the client forms and the server actions import.

### D-015a · Amends D-015 — charity blocks stay on sensitive-topic pages, as support
D-015 above withheld the charity components entirely from sensitive-topic stories and condition
pages. The platform lead has overruled it, and the reasoning is better than the original: removing
the block took the charities off `/conditions/depression` altogether, and on that page the charities
*are* the signposting somebody came for (brief 6.2). We had conflated two different things.

The distinction we should have drawn: **a donation ask on a safety screen is unacceptable; showing
someone where help is, is not.** The charity team has added a `variant` prop to both contract
components — `variant="support"` drops the donate hand-off and all giving copy and leads with
helplines and support services instead. `src/components/stories/charity-slots.tsx` now passes
`variant="support"` on sensitive-topic surfaces and `variant="default"` everywhere else, rather
than withholding the block. Their own `donationPromptAllowed` gate is untouched and still runs
first; the variant is not a replacement for it.

The guarantee is the pairing, so it is tested as one thing: `tests/e2e/stories.spec.ts` asserts that
`/conditions/depression` and a sensitive story page both **render the charity block** and carry
**no donate affordance**, and that an ordinary condition page still carries the hand-off. Asserting
only one half would let a refactor break the other and stay green.

The original D-015 entry is left above as written.

### D-028 · A support variant, so a content note does not cost someone the helpline
On a sensitive-topic surface — a story about suicide, the depression condition page — a Donate
button sitting under a content note is wrong. Withholding the charity block entirely is also wrong,
and worse: it removes the signposting the platform exists to provide, from the page where somebody
is most likely to need it.

So the two things are separated rather than traded off. `CharitiesForCondition` and `StoryCharities`
take `variant: "default" | "support"`. `default` is unchanged. `support` shows the same verified
charities, framed as where to get help: no Donate button, no hand-off link, no giving copy anywhere
in the block, and the visible action is the charity's own website, which is where the helpline is.
The charity's name still links to its listing here, and someone who follows it has navigated to the
donate hand-off deliberately — the line already drawn in D-023.

**On a sensitive story the support variant makes no claim about anybody.** The default variant
separates sourced support ("they have publicly supported this") from unsourced links. The support
variant does neither: it lists the charities with no attribution at all. What somebody reading a
story about suicide needs from this block is a helpline, not a fact about whose cause it is. Making
no claim also satisfies the sourcing rule by construction rather than by care.

**One judgement call inside the platform lead's instruction, flagged for them.** The brief was to
keep the `donationPromptAllowed` gate where it is. It is still there, at the same call site, on the
`default` variant. It does **not** gate the `support` variant, because a support block contains no
donation prompt — so the gate has nothing to suppress, and applying it would hide the helpline from
exactly the person the rule exists to protect: someone with an open safety concern reading
`/conditions/depression`. If the platform lead wants the gate over both variants, it is a two-line
change and this entry is the place to say so.

Copy is enforced, not just written: `givingLanguageProblem()` catches donating, giving, fundraising,
contributing, Gift Aid, money and amounts, and `tests/unit/charity-support-variant.test.ts` renders
the support block to markup and asserts the bytes contain no donate route, no referral origin, no
string from `DONATION_COPY` and no giving language. A fourth test renders `DonateLink` through the
same detector, so the assertion cannot pass because the detector is broken.

---

## Platform lead rulings — 2026-09-16, Wave 1 close

Numbered `PL-` to avoid colliding with feature teams appending `D-` entries in parallel.

### PL-1 · Charities appear on sensitive-topic pages, as support rather than as causes
Overrules the original D-015. The stories team withheld the charity blocks entirely on
sensitive-topic stories and condition pages, reasoning that a page carrying a content note and
support contacts is a safety screen. The instinct was right and the conclusion was not: it left
`/conditions/depression` with no charities at all, which removes exactly the signposting this
platform exists to provide, from the page where someone is most likely to need it.

We had conflated two different things. A donation **ask** beside a content note about suicide is
unacceptable. Showing someone **where help is** is the opposite of a harm. So those surfaces now
render `variant="support"`: helplines and support services, no donate affordance, no giving copy.
The hand-off stays reachable from the charity's own page, which a person navigates to deliberately.

### PL-2 · The no-pressure gate does not apply to the support variant — confirmed
The charity team asked whether `donationPromptAllowed` should also gate `variant="support"`. It
should not, and their reasoning was right: a support block contains no donation prompt, so the gate
has nothing to suppress, and applying it would hide a helpline from someone with an open safety
concern — reintroducing through a different door exactly the failure PL-1 just removed. The gate
stays on `default` only.

### PL-3 · The support variant makes no claim about any person — confirmed
The charity team went beyond the brief and dropped the "charities they have publicly supported"
attribution from the support variant. Kept. What someone reading a story about suicide needs from
that block is a helpline, not a fact about whose cause it is — and it satisfies the sourcing rule
by construction rather than by care.

### PL-4 · A narrower header rule must be listed after the site-wide one
The donation hand-off is meant to send `no-referrer`, so the charity learns nothing at all — our
origin alone would disclose that the visitor uses a health platform, which on a single-condition
charity is close to disclosing a diagnosis. The route-specific rule was originally listed *before*
the site-wide rule, which reads more naturally and silently does nothing: Next applies every
matching entry and, for a repeated header key, the last match wins. Caught by the charity team
testing the actual response rather than reading the config. Now verified by request:
`/charities/:slug/donate` returns `no-referrer`, other pages return `strict-origin-when-cross-origin`.

### PL-5 · The lockfile is regenerated from scratch, not incrementally
CI failed on `npm ci` with `@emnapi` packages missing. `@node-rs/argon2` ships per-platform native
binaries, and a lockfile grown incrementally on macOS carried stale nested versions that no Linux
resolution could satisfy. Deleting it and regenerating produced a consistent tree with all twelve
platform variants. Worth remembering: a lockfile that works locally is not evidence it installs
anywhere else, and only a clean `npm ci` proves it.

### PL-6 · Form controls are promoted into the design system, not left in a feature folder
The auth team built the only checkbox and select in the product inside
`src/components/onboarding/`. Both are now `src/components/ui/checkbox.tsx` and `select.tsx`. They
are native elements rather than custom widgets, which is the right call and is now written into the
design system: consent is the most important screen here and must not depend on a script loading.

### PL-7 · Onboarding completeness for "I take nothing"
Counting `TreatmentCourse` rows made the treatments step impossible to finish for anyone who takes
nothing — a real and common answer. Added `Profile.treatmentsConfirmedAt`: completeness is "you were
asked and you answered", not "you have at least one medicine". It also gives us a genuine "last
reviewed your medicines" date later. The two pending onboarding steps now live in modules owned by
the teams that will finish them, so two teams completing two steps never edit the same file.

### PL-8 · Neither brand font was rendering, anywhere
next/font puts its CSS variables on the element you give the class to; we had them on `<body>`.
Our design tokens live in an `@theme` block, which Tailwind emits on `:root` — so
`--font-display: var(--font-fraunces), …` was computed where `--font-fraunces` did not exist,
the declaration became invalid, and every heading and every word of body text silently fell back
to system sans. The build was green, the tests were green, and the product was wearing none of
its own typography. The variables now go on `<html>`.

Worth generalising: a design system can be entirely correct in the stylesheet and entirely absent
in the browser, and nothing in a test suite will say so. Somebody has to look at it.

### PL-9 · Navigation is visible on every screen size
The header hid the whole navigation, and the sign-in link, below `md`. On a platform whose first
principle is mobile-first, the phone had no way to reach stories, conditions or charities except
the footer. The links now move to their own row underneath on small screens rather than
collapsing into a menu button: it works before the JavaScript arrives, needs no state, and puts
the destinations in front of someone who does not yet know what is here.

### D-031 · Questionnaire item types, and what each one is answered with
Seven types, one per brief 7.3: `likert`, `scale_0_10`, `single_choice`, `multi_choice`, `yes_no`,
`date`, `text`. Each has exactly one answer shape — a Likert or 0–10 answer is a number, a single
choice a code, a multiple choice a list of codes, yes/no a boolean, a date `YYYY-MM-DD`, free text a
trimmed string. That is what lets validation, scoring and the red flag rules each be a short, dull
function rather than a pile of type sniffing.

Yes/no is two radio buttons, not a tick box. An unticked box cannot tell "no" apart from "I have not
answered", and in a health record those are different facts. The 0–10 scale is eleven radio buttons,
not a slider: a slider needs JavaScript to be readable, is miserable to land on with a thumb, and
gives a screen reader a number with no meaning.

### D-032 · A version is checked as a whole before it can be published
Parsing each JSON column on its own is not enough. `readDefinition` also cross-checks them: a score
cannot be built from a question that does not exist; a `sum` or `mean` cannot be taken over a
question that is not answered with a number (use `map` to give worded answers numbers first); a red
flag rule cannot watch a question that is not there, cannot compare a non-numeric answer as a number,
and **cannot be pointed at a free-text question at all** — free text is only ever seen by the person
who wrote it, so no rule may read it.

This is what makes "an admin publishes a new version with no code change" safe rather than reckless.
Every one of these is caught at the moment the admin presses save, not the first time somebody tired
and frightened is shown a form the engine cannot score.

### D-033 · A published version is immutable, enforced in the domain layer
`updateDraftVersion` throws `PublishedVersionError` if the version has been published, and
`publishVersion` refuses a second publish. There is no database constraint behind this because the
schema is owned by the platform lead — **a partial unique or trigger-level guard would be better and
is raised with them**. Until then the rule lives in `src/lib/questionnaires/versions.ts`, every admin
path goes through it, and `tests/unit/questionnaire-versions.test.ts` proves it.

Publishing also requires a licence note on the questionnaire. We cannot check a licence
automatically, so we require that somebody has written the terms down, and the publish audit entry
records who confirmed them.

### D-034 · What makes a response "the baseline"
The baseline version is whichever published version declares `schedule.baseline` — no questionnaire
key is hard coded anywhere, so swapping the placeholder for a licensed instrument is publishing a
version, not a deployment.

Scoping completeness to that version is not enough on its own, because the general check-in cycle
uses the *same* version: a check-in answered three months later would retroactively satisfy the
baseline, which is exactly what acceptance criterion 6 forbids. So the baseline is the response to
that version **with no `ScheduledCheckIn` attached**. Every other way of answering a questionnaire
goes through a scheduled check-in, so `checkInId === null` is the marker.

**For the scheduling milestone:** `schedule.baseline: true` means *asked during onboarding*. Do not
create a `ScheduledCheckIn` for the baseline itself, or this distinction disappears and the baseline
step can never be completed.

### D-035 · The admin edits a version as JSON, with real validation and a preview
Four textareas — questions, scoring, red flag rules, schedule — not a form builder. The definition is
JSON; an admin loading a licensed instrument will be pasting one in, and a builder would be a lossy
retyping of something they already have. What makes it safe is not the widget, it is D-032: every
mistake is explained in English beside the box it is in, and the page renders the questions with the
same components the real form uses so nobody publishes something they have not looked at.

A published version has no form on its page at all — not a disabled one, no form. The only way to
change what a questionnaire asks is a new version, and the screen should not suggest otherwise.

### D-036 · Save and resume lives in a cookie, and should not
A long questionnaire is often answered on a phone in a waiting room, and the person gets called in.
Half-finished answers are kept in an `httpOnly` cookie scoped by `path` to the one page they belong
to, capped at 3.5KB, and deleted the moment the answers are recorded for real.

The database would be the right home, but there is no table for it and the schema is not ours. The
alternative — writing a partial `Response` — was rejected outright: every later milestone reads
`Response` as a real answer, and a draft sitting in there would quietly become somebody's record and
somebody's research row. **A `QuestionnaireDraft` table is requested from the platform lead**; a
cookie does not survive changing device, which is the one thing it cannot do honestly.

### D-037 · Red flags are reported, never acted on
`evaluateRedFlags(version, answers)` is pure, returns every matching rule in the order the version
lists them, and decides nothing. It writes no `SafetyEvent`, alerts nobody and contacts nobody —
brief 7.8 gives the signposting screen its own milestone, and that is the only thing that decides
what a person sees.

It throws rather than returning `[]` if a version's rules cannot be parsed. A safety rule that cannot
be understood must stop the request, not quietly evaluate to "nothing wrong".

Until the safety milestone lands, the "your answers are recorded" screen repeats the support contacts
we already publish, quietly, when a rule matched — the rule's own wording of what it noticed, and
NHS 111, 999 and Samaritans. That is signposting and nothing more. **Milestone 8 takes this surface
over**, and adds the `SafetyEvent` write that this milestone deliberately does not make.

### D-038 · The daily log's sliders start where the person left them, and the screen says so
"Under thirty seconds" (brief 7.5) is an acceptance criterion, and the honest way to hit it is to
remove decisions rather than to move them. So every slider opens holding a value: the last score
recorded for that symptom, or the middle of the scale for a symptom never scored. A day where
nothing has changed is then **one press and no typing**, measured in
`tests/unit/daily-log-speed.test.tsx` by taking the form's `FormData` with nothing interacted with
and asking the domain's own parser whether it is already a complete, valid log.

The cost is real and worth naming. Carrying a value forward risks flat data from somebody who cannot
face the screen — and the alternative, defaulting every slider to 5, fabricates a number just as
readily while being slower. Neither is free; only one of them is also fast. So the screen states in
words where the starting positions came from and which day they are from ("The sliders start where
you left them on 14 September"), and a first-ever log says plainly that it starts in the middle.

**For the research milestone:** a stored score is what the person submitted, and a submitted score
may be a carried-forward one they did not touch. There is no "untouched" flag — `symptomScoresJson`
has no room for one and the schema is not ours. If distinguishing them ever matters, that is a
schema request, not something to infer.

### D-039 · A slider primitive lives in the feature layer, and should not
`src/components/tracking/score-slider.tsx` is a native `<input type="range">` with a real label, the
current value in text, `aria-valuetext`, a 44px hit area and a 28px thumb. It belongs in
`src/components/ui/` — the daily log needs it, the questionnaire engine's 0–10 items need one, and
the check-in screens will. It is in the feature layer only because `src/components/ui/**` is
single-writer. **Requested for promotion by the platform lead**, on the same reasoning as D-019.

Two things about it are not decoration and should survive the move. It is a **native range input**,
so the arrow keys, Home and End, the phone's own touch handling and the screen reader's slider role
all come for free rather than being re-implemented out of divs. And it is **one colour at every
value** — a track that turns red at 8 would be the interface telling somebody their day was bad,
which is exactly what AGENTS.md rule 9 forbids. `tests/unit/tracking-rules.test.tsx` fails if a
meaning colour appears in that file.

### D-040 · "Show data, never interpret it" is enforced by a detector, not by good intentions
A tracking UI breaks AGENTS.md rule 9 one label at a time — "getting better", "a good week", a trend
arrow — and no behavioural test notices, because nobody writes a test for the heading they were about
to write. `src/lib/tracking/no-interpretation.ts` holds the phrasings we reach for, and
`tests/unit/tracking-rules.test.tsx` runs every tracking screen, component and domain module through
it, with comments stripped so that explaining the rule does not trip it.

It is a tripwire, not a proof: it catches the phrasings we thought of. Passing it is not permission
to write a sentence that draws a conclusion for somebody. The same file carries the giving-language
check, so no tracking surface can grow a donation prompt round the charity team's gate.

### D-041 · Yellow Card is on the page at all times, and stamped at the moment of the write
Brief 7.8 asks for the MHRA Yellow Card link after any logged side effect. Rendering it only once a
report exists leaves a state — the response that saved the first one — where the record says we
showed it and the screen may not have. So the note is part of the side effects section
unconditionally, before, during and after; `yellowCardShownAt` is set by the same `create` that
writes the report; and `tests/unit/treatment-side-effects.test.tsx` asserts **both halves together**,
because asserting one would let a refactor break the other and stay green (the reasoning of D-015a).

The note says plainly that recording something here is *not* reporting it to the MHRA. Somebody who
believes it is will not report, and the signpost will have done harm rather than nothing.

### D-042 · "I am not on any treatment" is a button, and finishes the step
Brief 7.1's treatments step has to be completable by somebody who takes nothing — a real and common
answer, and one that must not be harder to give than a list of four medicines. `/onboarding/treatments`
therefore has two endings, both one tap and no typing: "I am not on any treatment at the moment" when
nothing is recorded, and "That is all of them" when something is. The confirm button sits **above**
the add form, so the person with nothing to add does not scroll past a form to say so.

Both write `Profile.treatmentsConfirmedAt`, and null goes on meaning "we have never asked" — a
distinction a count of `TreatmentCourse` rows cannot make, which is why D-016's original
`count > 0` was replaced rather than kept. `TREATMENTS_STEP_STATUS` is now `"ready"`.

**Note for the platform lead:** `tests/e2e/onboarding.spec.ts` still walks past treatments and
baseline as "This part is not ready yet" and counts "4 of 4 done". Both steps are now built, so that
journey needs updating; it is owned by the auth/onboarding area and two agents editing it at once is
what the ownership rules exist to prevent, so it is reported rather than changed here.

### D-043 · Anything can be recorded as a treatment, and nothing gets a code it has not earned
The treatment name is an open text box with the seeded sample list offered through a `<datalist>`.
A real medicine cabinet will not match our sample data, and "that is not on our list" is being told
your own treatment does not count. Anything new becomes an `Intervention` with `dmdCode` **null** —
a full dm+d import needs an NHS TRUD account and is a later task, and a guessed code would be wrong
in a way that looks authoritative. The treatment page says so on screen.

Matching is case-insensitive and whitespace-collapsed on (name, type), so "metformin" and "Metformin"
do not become two rows and split a research cohort in half. Two people adding the same new treatment
at the same moment is handled by reading back the row the unique constraint let through.

### D-044 · The demo seed is built to make suppression visible, and to tell no story
`prisma/seed/demo-tracking.ts` creates 37 invented patients across three cohorts, sized so that after
consent filtering some groups sit comfortably over the small-group threshold of 10 and some sit
comfortably under it: type 2 diabetes (16 people, 14 consented) and depression (15, 12) are
disclosed; breast cancer (6, 4) is suppressed. By treatment, Metformin (12 consented) and Sertraline
(11) are disclosed and everything else is not. The table is written out in the file, and
`tests/unit/tracking-demo-seed.test.ts` runs the real `applySuppression` over it so that a change to
the threshold is reported rather than discovered.

Consent varies on purpose — granted, refused, and granted-then-withdrawn as a second consent row,
which is how the real flow records it. Symptom scores are a **random walk with no drift term at
all**, and the test asserts every series moves in both directions: a seeded recovery arc is a demo
data set that will eventually be screenshotted as though it meant something.

### PL-10 · The home page figure strip carries no photographs, and no auto-scroll
A horizontally scrolling row of public figures sits under the hero, modelled on the member row
of dohealth.co.

**No photographs.** We hold a licence for none of the people on this platform, and three separate
image URLs supplied so far — a Google thumbnail, a speaker agency's promotional file and an IMDb
still — were all refused by `figure_image_requires_licence`. Each person gets an initials
monogram instead, which the brief already anticipates ("initials or neutral illustration"). The
card is laid out so a licensed image can replace the monogram later without touching anything
else.

**No auto-scrolling marquee**, which is what "a scroll of celebrities" often means. Moving
content that contains links has to offer a way to pause it (WCAG 2.2.2), it is harder to read and
harder to click, and on a page about people's diagnoses the calmer register is the right one.
Scrolling is native overflow with scroll-snap, so it works by touch, trackpad and keyboard with
no JavaScript; the arrows render only after mount, because a button that does nothing is worse
than no button.

The row reads through `listPublishedStories` like every other public surface, so a retracted
story leaves the front page on the next request. `tests/unit/home-figure-strip.test.ts` fails if
anyone later hand-rolls a query here and drops the published filter.

### PL-11 · The design system is now Do Health's, with two forced departures
The colours, type scale and shapes were re-based on dohealth.co at the product owner's request, and
measured from the live site rather than eyeballed: text `#19301E`, ground `#F4F1E7`, dividers
`#E4E1D8`, the lime `#B9F00A`, 24px cards, 40px panels, pills everywhere else, and a 72/44/32/24/16
type scale with -0.5px tracking on the large sizes.

Two things could not be copied.

**The typefaces are commercial.** Do Health sets **Season Mix** (Displaay) over **NB International
Pro** (Neubau). We hold neither licence, so the closest free equivalents stand in — **Outfit** for
the light display face, **Inter** for the neutral grotesque. Buying the real licences is a two-line
change in `tokens.css` and `layout.tsx`.

**Their muted text colour does not meet WCAG AA.** `#67796B` is roughly 3.8:1 on their own cream,
under the 4.5:1 that body text requires. Ours is `#566658` at 5.6:1. We are not going to ship text
our own accessibility principle forbids in order to match a hex value.

The lime is a **fill only**, at about 1.3:1 against every ground we use. `Button` gained a `dark`
variant so safety screens, destructive confirmations and anything already sombre can use the deep
green instead — a bright lime "Delete everything you have recorded" would be grotesque.

The token *names* did not change, only their values, so the entire product re-skinned without
touching a single feature component. `tests/unit/design-system.test.ts` still passes because the
type scale kept its names; all 385 tests pass, and axe reports zero violations across the home,
stories, condition and charity pages at both 1280px and 375px.
