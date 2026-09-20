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

### D-045 · Dependence signposting is a second set of contacts, not a replacement
`SUPPORT_CONTACTS` in `src/lib/safety/constants.ts` is NHS 111, 999 and Samaritans. Those are the
right numbers for somebody in danger tonight. They are not the right numbers for somebody who was
prescribed a sleeping tablet at twenty-three and is still taking it at fifty, which is exactly the
situation a page about nitrazepam can put a reader in.

So `src/lib/safety/substance-support.ts` sits alongside it rather than inside it: FRANK and the NHS,
for dependence and coming off something. A sensitive-topic medicine surface shows **both** blocks —
crisis and dependence are different questions and a person should not have to translate one into the
other. The two have separate heading ids so they can appear on the same page without colliding.

Both contacts were checked against independent sources before being written down, on 18 September
2026: FRANK's number and text line from `talktofrank.com/contact-frank`, corroborated by the NHS
page at `nhs.uk/live-well/addiction-support/drug-addiction-getting-help/`, which prints the same
number. Nothing here links to anyone who sells treatment (AGENTS.md rule 14). Re-check both at the
twelve-month review.

### D-046 · A medicine is public only once an editor has written what it is
`Intervention` rows are created two ways. An editor creates one here. `findOrCreateIntervention`
creates one every time a person types a treatment into their own tracking that we have not heard of
(D-043) — which is the whole point of that feature, and which means the table is part medicine
reference and part **somebody's private medicine cabinet**.

A public index over that table would be a health-data leak dressed up as a reference work. So
`src/lib/medicines/queries.ts` filters on `summary IS NOT NULL AND slug IS NOT NULL`: a plain-English
description written from the NHS, the BNF or the eMC is the thing only an editor ever produces, and
a medicine with no description is not worth a page anyway — a drug name on its own tells a
frightened reader nothing. This is the medicines equivalent of "an unverified charity is never
publicly visible", and it is tested in `tests/unit/medicine-visibility.test.ts`.

The editorial picker uses a weaker filter (`slug IS NOT NULL`) for the same reason in a smaller way:
rows a person created in their own log have no slug, and an editorial dropdown is not the place to
enumerate them. Anything genuinely missing goes through `createMedicine`, which **adopts** an
existing row rather than duplicating it — so an editor writing up a medicine somebody had already
logged adds an identity to that row and reads nothing from anyone's tracking.

### D-047 · No donation prompt on a medicine surface, and no medicine surface in the prompt policy
`DONATION_SURFACES` in `src/lib/charities/prompt-policy.ts` is the charity team's list and their
policy is default-deny: a surface nobody has decided about gets no prompt. `/medicines` and
`/medicines/[slug]` are not on it, so they show no charity block at all — not a giving one, and not
a support one either.

That is a deliberate choice, not an oversight. The support variant (D-028) is the right pattern for
a sensitive surface, but `CharitiesForCondition` is written for one condition and carries a fixed
element id; a medicine page is about several conditions at once, and rendering the block more than
once would duplicate that id. The medicine page therefore signposts to the condition pages, which
carry the charity block properly, and carries the dependence and crisis contacts itself.

Where the support variant **does** apply is the story page: `hasSensitiveMedicine` now flips a story
to `variant="support"` on the medicine alone, so a story about a benzodiazepine drops the donate
hand-off even when none of its condition tags is marked sensitive. Whether `medicine_page` should
join `DONATION_SURFACES` is the charity team's call, and nothing here needs to change if they take it.

### D-048 · The dose rule is a detector, not a review note
AGENTS.md rule 15 says never publish a dose, a regimen, or how much of something someone took. A
rule enforced by an editor reading carefully is a rule we will break on a busy Friday, so
`src/lib/medicines/dose-language.ts` is the single definition of "dose-shaped" and it runs in three
places: in the Zod schema, so the editor is told at the form; in the domain layer, so a second
interface cannot skip it; and in `tests/unit/medicine-surfaces.test.tsx`, which renders every public
medicine surface and scans the whole text content, so a sentence assembled at render time cannot get
past it either.

It is deliberately over-eager. It flags "dose", "daily" and "a day", which are ordinary English —
ordinary English that has no business on these surfaces. The cost of a false positive is a rewritten
phrase. The cost of a false negative is a page that reads as a recipe to somebody in recovery. The
`StoryIntervention.context` column is capped at 160 characters by the database for the same reason:
a phrase cannot become a regimen if there is nowhere to put one.

### PL-12 · Adding a condition with no symptoms locked people out of the product
Six conditions were added through content work — encephalitis, tinnitus, Hodgkin lymphoma, motor
neurone disease, multiple sclerosis, brain tumour — with no symptoms linked to any of them. The
onboarding symptoms step offers only symptoms attached to the conditions someone has chosen, and it
requires at least one. So anyone choosing one of those six reached a step that demanded a choice and
offered none: unable to finish onboarding, and therefore unable to use any tracking feature at all.

The build was green and 385 unit tests passed throughout. An end-to-end test caught it, which is
most of the argument for having them.

Fixed in two places, because either alone would leave the trap set:
- **Data**: symptoms are now linked to every seeded condition, including fourteen new ones.
- **Behaviour**: `symptomsForUser` falls back to the full symptom list when the chosen conditions
  have none of their own. Editors add conditions through the admin and cannot be asked to link
  symptoms in the same breath; a slightly long list is a far smaller problem than a locked door.

`tests/unit/onboarding-symptoms-invariant.test.ts` holds the rule: onboarding must never present a
step that demands a choice and offers none.

### PL-13 · End-to-end tests get their own database, port and build directory
They used to run against the development database. Several specs legitimately create things — a
published story, a questionnaire version — so every run left the developer's data further from the
seed. It eventually produced a failure with no bug behind it: six published questionnaire versions
had accumulated and the one the baseline step looks for was no longer the newest.

`npm run test:e2e` now migrates and re-seeds `untouchable_e2e`, serves it on port 3100 from
`.next-e2e` (Next locks a dev server per directory, so a developer's own server would otherwise
block the run), and starts from identical fictional data every time.

Also serialised. Two browser projects walking the same sign-up flow concurrently against one
database produced twenty-nine thirty-second timeouts with nothing wrong in the code. End-to-end runs
are not where we spend the speed budget.

### PL-14 · A medical charity may source a condition page; a company selling treatment may not
Rule 14 forbids taking medicine information from anyone who sells treatment. It does not forbid
charities, and the distinction matters: the NHS has no page for colloid cysts, and The Brain Tumour
Charity does — written by a registered charity whose purpose is information, with nothing to sell.
That is the source for the colloid cyst condition page, cited on it.

The test is not "is this an NHS page", it is "does whoever wrote this benefit from you believing
it". A private clinic's drug page fails that test. A disease charity's information page does not.

The Brain Tumour Charity is also an obvious candidate for the charity directory against
`brain-tumour` and `colloid-cyst`. It has not been added, because an editor has to check it against
the register first and nobody has.

### PL-15 · Editorial content lives in the database, not in the repository
Every real story added so far — Clarke, Laing, Zohn, Dane, McCall — exists only in the local
development database. None of it is in the repository, and none of it would survive a deployment to
a fresh environment.

That is the correct design: real content is editorial work, entered through the admin against
verified sources by named editors, not committed by engineers. But it means the content added during
development is a demonstration of the workflow rather than an asset, and the same stories will need
re-entering once there is a production environment. If that becomes tiresome, the thing to build is
an export and import for editorial content — not a habit of seeding real people.

### PL-16 · Photographs are Creative Commons, self-hosted, and credited
Eight images were supplied for these pages over the course of the build — Google's thumbnail cache,
a speaker agency's promotional file, an IMDb still, NBC News, the Liverpool Echo, Kent Online, the
Telegraph, a Squarespace site. All eight were refused by `figure_image_requires_licence`, because we
held a licence for none of them. Publishing them on a public site would have been copyright
infringement with the site owner's name on it.

The route that works is Wikimedia Commons. Five of the six people with published stories have
photographs there under CC BY or CC BY-SA, which permit commercial reuse with attribution. Each
one's licence and photographer were read from the Commons API, not assumed, and recorded in
`imageLicence` as JSON so the page can render the credit the licence requires.

Three rules hold it together:
- **Self-hosted, not hot-linked.** Loading a portrait from Wikimedia would tell their servers the
  IP address of everyone reading a page about a named person's diagnosis. Same reasoning as D-021.
- **The image and the credit come from one record**, and `FigurePortrait` renders neither without
  the other. An unreadable licence is treated as no licence.
- **No licensed photograph means no photograph.** Ethan Zohn has none, so his card shows initials.
  That is the intended outcome, not a gap to fill with whatever an image search returns.

Attribution is collective under the home page row — a photographer's name under a 56px thumbnail is
not "reasonable to the medium" — and per-image beside the portrait on each story page.

### D-049 · One search box over four kinds of thing, and not one query of its own
Somebody who has just been told they have tinnitus does not know whether what they want is filed
under a condition, a medicine, a charity or somebody's story. So the home page has one box that
covers all four, and `src/lib/search/index.ts` holds the logic.

**There is no Prisma query in that file, deliberately.** It calls `listConditions`,
`listPublicMedicines`, `listPublicCharities` and `listPublishedStories` and filters what comes back.
Those four modules are where "published", "verified and active" and "an editor has written it up"
are decided, and re-implementing any of them in a second place — even correctly, even once — makes
the second place the one that gets it wrong later. The widest public surface on the platform is the
worst place to hold a copy of a visibility rule.
`tests/unit/search-visibility.test.ts` fails if this file ever grows a query, and also drives the
real thing: a retracted story, a draft, an unverified charity, a withdrawn charity and a medicine
with no write-up each go in and come back out of `search()` as nothing.

It is a plain GET form pointed at `/`, like the story index filters: it works before the JavaScript
arrives and with it switched off, every result set has an address that can be shared, and the back
button behaves. The kind filter is a row of links for the same reason.

**No ranking.** Results keep the order their own module gave them — alphabetical for conditions,
medicines and charities, newest first for stories. Any other ordering on a health platform reads as
an endorsement, and there is no honest way to rank a charity above another one here.

Search results and the grid of people are alternatives rather than a stack: repeating the same six
faces under somebody's search results is noise.

### D-050 · The front page cards carry photographs, and the contrast is arithmetic rather than hope
The initials row from PL-10 is now a card grid: the figure's photograph fills the card, a dark
gradient rises from the bottom, and the name, the disclosure line, the conditions and medicines as
tags, and the content note sit on top of it. The whole card is the link, so the tags are plain text
rather than links — a link inside a link is invalid markup and unusable with a keyboard.

**A gradient is not a contrast guarantee.** A light photograph defeats one, and "usually dark
enough" is not a standard. So the text does not sit on the gradient. It sits on a flat scrim —
`bg-forest-900/95` — with a short fade of the same colour above it, so the two read as one gradient
while the text is always on the flat part. The worst case a photograph can produce is every pixel
under the scrim being solid white, and white on that is **14.5:1**. `cream-200` is 11.8:1 and the
translucent tag pills 9.0:1. `tests/unit/home-figure-cards.test.ts` reads the token out of
`tokens.css` and the opacity out of the component and redoes the sum, so changing either re-runs it.

Two contrast failures were found and fixed during the build, both worth recording because both are
the same mistake in different clothes.

**A faint watermark is still text.** The card for a figure with no photograph carried the initials
at 25% white, 80px, `aria-hidden`. axe reported 2.24:1 against forest-800, under the 3:1 large text
needs. `aria-hidden` hides something from a screen reader; it does not hide it from somebody with
low vision, and at that size it was the most prominent thing on the card. It is now a solid
`cream-200` monogram centred in the space a photograph would have filled — 10.1:1 at worst across
the three tints, and a deliberate-looking card rather than a missing image.

**A wrapper with no colour inherits body ink.** The tag row's container had no text colour, so it
inherited `#19301E` — 1.02:1 on the scrim, which is invisible rather than merely low-contrast. The
individual pills set `text-white` and looked fine, which is exactly why it survived review. The bed
now sets `text-white` itself, so anything added later that forgets a colour is readable by default.
Both were caught by measuring the page rather than by looking at it.

Photographs still render only when a licence is recorded on the same record, and the collective
Creative Commons credit under the grid renders whenever they do. PL-16 is unchanged.

`src/components/home/scroller.tsx` is gone with the row it served. PL-10's reasoning against an
auto-playing marquee still holds and nothing here auto-plays; a grid simply reads better than a
scroller when each card is a photograph, and it does not hide half the people behind a swipe.

### D-051 · Video plays from a facade, and nothing reaches Google until somebody presses play
Most sources on this platform are YouTube interviews of the person speaking for themselves, which is
the best evidence a story can have. A normal embed would have surfaced them at an unacceptable
price: a YouTube iframe contacts Google and sets cookies the moment the page loads, on a page about
a named person's diagnosis. The request *is* the disclosure — it tells a third party that this
browser is reading about that illness, before the reader has done anything at all.

So what renders is ours: a typographic card in our own type and colours with a real `<button>`, and
a line that says where it will play from before the person chooses. **Not YouTube's thumbnail** —
`i.ytimg.com` serves those, and hot-linking one would reintroduce the exact leak the facade exists
to prevent while looking private. On click, and only on click, an iframe appears pointed at
`youtube-nocookie.com`.

The video is not a new field. It is the first of the story's existing `Source` rows whose URL is a
YouTube link, so a video cannot be attached without also being a cited source checked by the two
editors who published the story, and retraction takes the video with it. `src/lib/video/youtube.ts`
does the parsing and is deliberately strict: hosts are matched whole rather than with `includes`, so
`youtube.com.example.test` is refused, as are ids of the wrong shape and anything that is not http
or https. 44 unit tests, most of them about what it refuses.

Proof that nothing loads before the click is made twice. `tests/unit/video-facade.test.tsx` walks
every `src`, `href` and `srcset` in the rendered markup and asserts the list is empty. `tests/e2e/
home.spec.ts` records every request a real browser makes, loads the story and the public figure
page, waits for network idle, and asserts nothing matched `youtube.com`, `ytimg.com`,
`googlevideo.com`, `googleapis.com`, `gstatic.com` or `google.com` — then clicks, and asserts the
only third party reached is the no-cookie host.

### PL-17 · The project lives on /Volumes/Health, and `npm install` must not be committed from macOS
The working copy moved to `/Volumes/Health/HEALTH/Untouchables` for the space. The disk is exFAT,
which costs about 38ms per small file against 0.055ms on the internal SSD — a `node_modules`
install is roughly half an hour and a production build about a hundred seconds rather than three.
That is the price of the space, and it is paid knowingly.

The obvious mitigation does not work: Next 16 refuses a `node_modules` symlink that points outside
the project root ("Symlink [project]/node_modules is invalid, it points out of the filesystem
root"). Source, dependencies and build output all have to live on the same volume.

Two traps this volume sets, both of which have already been sprung once:

**macOS writes AppleDouble `._` files on exFAT**, and git tries to read `._pack-*.idx` as a pack
index, reporting "non-monotonic index" on every command. The previous copy of this repository was
left permanently in that state. Export `COPYFILE_DISABLE=1` when copying onto the volume, and
`find . -name '._*' -delete` if it happens.

**A plain `npm install` on macOS rewrites `package-lock.json` to drop the Linux-only packages** —
`@emnapi/*`, the platform variants of `@node-rs/argon2`. Committing that breaks `npm ci` on
Vercel and in CI, which is precisely the failure recorded in PL-5. If `git status` shows
`package-lock.json` modified after an install and you did not change a dependency, revert it:

```bash
git checkout -- package-lock.json
```

### D-052 · Three stories added, and the one place rule 15 was actually load-bearing
Shania Twain (Lyme disease), Bruce Willis (frontotemporal dementia) and Alanis Morissette
(postnatal depression). Every sentence was written from a source that was fetched and read, not
from anyone's recollection. Where a source supported a nice line and the source I had actually read
did not, the line came out — three of them did, including a vivid sentence about the moments after
Shania Twain's surgery that turned out to exist only in a search-result summary of an interview I
had not opened.

**Bruce Willis is the reason rule 15 exists, and all four of its conditions were checked against the
statement itself** rather than against anybody's report of it.

1. *A deliberate public statement in the family's own words.* `theaftd.org/MNLStatement23/`, dated
   16 February 2023, headed "A Statement from the Willis Family" and signed by seven of them. Read
   in full through the browser; AFTD's own commentary sits on a separate page and none of it is in
   the story.
2. *Plainly intended to be public.* The statement asks that media attention be pointed at awareness
   and research, names the charity twice, and asks readers with no experience of FTD to go and learn
   about it.
3. *Drawn from the statement, not from coverage of it.* The story cites the statement and nothing
   else. One detail that only appears in journalism — that the March 2022 announcement was a
   retirement — was cut from the story, even though it is true and easy to source, because the
   statement itself only refers to having announced a diagnosis.
4. *Nothing added about his current state.* The story says so on the page, in the content note and
   in the closing line: the statement is from February 2023 and we have added nothing to it.

The content note also says plainly that he has not spoken about this himself. A reader who does not
know that will assume he did, and the whole justification for publishing rests on their knowing.

**Third parties were cut twice.** Shania Twain described her surgeon's own cancer; Alanis Morissette
names her children. Neither has given us a source for their own health, so neither appears.

**Nothing came from an auto-generated caption track verbatim.** Two of the three stories are sourced
to YouTube interviews, whose transcripts mangle names and medical terms. They were used to establish
what was said and then written out in our own words. The single quote on the batch is from the
Willis statement, which is published text: sixteen words, attributed, within the 25-word limit.

### D-053 · Postnatal depression is marked sensitive, on the condition rather than the story
The Morissette source contains intrusive thoughts and medication, and no suicidal ideation — so the
literal trigger for the sensitive flag was not met by this story. It is set anyway, on the
condition, because the NHS page for postnatal depression lists thoughts of harming yourself or your
baby among its ordinary symptoms. The flag lives on the condition, so the next story tagged
`postnatal-depression` inherits the content note and the support contacts without an editor having
to remember. `depression` is already marked this way and the two should not disagree.

The condition summary says the frightening thoughts are a symptom and a reason to ask for help, and
that asking very rarely leads to a baby being removed. Both are on the NHS page, and the second one
is the sentence most likely to make somebody pick up the phone. No method detail anywhere, per the
Samaritans guidelines.

### D-054 · Condition summaries, symptom links, and photographs for this batch
**Summaries** were written from the NHS pages for each condition — `nhs.uk/conditions/lyme-disease/`,
`/frontotemporal-dementia/` and `/post-natal-depression/` — all three read in full. PL-14's harder
case did not arise: unlike the colloid cyst, all three have an NHS page, so no charity source was
needed and no page that sells treatment was used.

The frontotemporal dementia summary keeps the average survival figure the NHS gives. Leaving a
number like that out reads as kindness and is closer to euphemism; a page about a dementia that
cannot be slowed should not be vaguer than the NHS is.

**Symptoms** are linked to all three new conditions, using only symptoms already in the table and
only ones the NHS page actually describes. The PL-12 fallback means an unlinked condition no longer
locks anyone out of onboarding, so this is an improvement rather than a fix.

**Photographs** are Wikimedia Commons, downloaded to `public/figures/`, with the photographer and
licence read from the Commons API and stored in `imageLicence` — Raph_PH under CC BY 2.0 (Twain),
Gage Skidmore under CC BY-SA 3.0 (Willis), Raph_PH under CC BY 4.0 (Morissette). PL-16 unchanged.

The Willis file carries a Commons **personality-rights** warning: the licence covers the copyright,
not the use of someone's likeness to imply they endorse something. That is already the brief's
no-endorsement rule (5.2) and its ban on using figures in advertising, so nothing changes here — but
it is worth knowing that this particular image would be the wrong one to put on a marketing page,
and that the person in it cannot object.

### D-055 · Four more stories, and what each one actually rests on
Emilia Clarke (brain aneurysm), Brooke Shields (postnatal depression), Padma Lakshmi
(endometriosis) and Venus Williams (Sjögren's syndrome). Every sentence was written from a source
that was fetched and read end to end, not from anybody's recollection of these people.

Three of the four are the person speaking for themselves with nobody in between: Clarke's own essay
in *The New Yorker* (21 March 2019), Williams' own video on her own YouTube channel (17 June 2022,
channel confirmed through the oEmbed endpoint rather than assumed from the title), and Shields
speaking at a press conference in Washington DC on 11 May 2007, carried as raw footage by AP. The
fourth, Lakshmi, is a 2015 interview by Lola Pellegrino, first published in Lenny Letter and
republished by the Endometriosis Foundation of America, which Lakshmi co-founded.

**`WebFetch` refuses newyorker.com and nytimes.com, and the browser pane refuses nytimes.com
outright.** The New Yorker essay came down with `curl` and a normal user agent once the right URL
was found — the remembered one 404s, which is exactly the sort of thing that would have gone
unnoticed if the story had been written from memory and the link pasted in afterwards. Brooke
Shields' 2005 op-ed could not be retrieved at all, so it is not cited; what is cited is footage of
her saying the same things two years later, which was watched.

**Nothing is quoted.** Three of the five sources are auto-captioned video, and the caption track
renders "Sjögren's" four different wrong ways in a single Venus Williams video. No quote field is
set on any of these four stories.

**Third parties are absent by design.** Clarke's essay discusses her father's death from cancer and
Lakshmi's interview describes her mother's periods; neither has given us a source for their own
health, so neither appears. Shields' daughter is referred to only as her daughter — she is not
named, and nothing is said about her.

### D-056 · The Clarke essay contains a passage we did not publish, and why
Clarke writes that during the aphasia she wanted to pull the plug and asked the medical staff to let
her die. It is one of the most honest things in the piece and it is hers to tell.

It is not in our story. Publishing it would need Samaritans handling — a content note, which the
story has, and support signposting, which `needsSupportSignposting` only produces when the
*condition* is flagged sensitive. Flagging `brain-aneurysm` sensitive would put suicide signposting
and a content warning on the condition page for every reader who has one, which is not what a
ruptured vessel is, and telling a frightened reader otherwise is its own harm. Leaving the passage
in with no signposting is the option the guidelines exist to refuse.

So the story carries a content note about a life-threatening bleed and a hard recovery, says plainly
that there were panic attacks and weeks she cannot remember, and stops there. Raising it rather than
quietly writing around it: if the platform lead would rather the passage ran, the thing to build is
story-level signposting independent of the condition flag, not a sensitive flag on a vascular
condition.

### D-057 · Condition pages and photographs for this batch
**Summaries** come from `nhs.uk/conditions/brain-aneurysm/`, `/endometriosis/` and
`/sjogrens-syndrome/`, each read in full, written out in our own words. All three exist, so PL-14's
harder case did not arise and nothing that sells treatment was used. `postnatal-depression` already
existed with the sensitive flag set — another editor's, per D-053 — and was left exactly as it was.

Each summary ends on what the NHS itself says about getting help, attributed to the NHS rather than
offered as our own advice: call 999 for the signs of a bleed on the brain; see a GP if endometriosis
symptoms are affecting everyday life, work or relationships; see a GP if Sjögren's symptoms are
affecting daily life.

**Symptoms** are linked only where the NHS page names them and the symptom already exists in the
table. Sjögren's therefore gets two, fatigue and pain, because there is no dry-eye or dry-mouth
symptom to link and inventing one to make the list look fuller would be the wrong trade.

**Photographs** are Wikimedia Commons, self-hosted in `public/figures/`, with photographer and
licence read from the Commons API — Vengerb3rg under CC0 (Clarke), Greg2600 under CC BY-SA 2.0
(Shields), the National Book Foundation under CC BY 3.0 (Lakshmi), Hameltion under CC BY-SA 4.0
(Williams). PL-16 unchanged; all four were opened and looked at before being stored, because a
correctly licensed photograph of the wrong person is still the wrong person.

The obvious Brooke Shields file — the one Wikipedia uses — is a crop somebody tagged as their own
work over a photograph that is actually Kristin Dos Santos', so the credit it would have printed
names the wrong photographer. A different Commons file was used instead. Checking the parent file
took one extra API call and is worth doing every time a Commons description says "cropped from".

### D-055 · Four stories where the source was hard to reach: Jolie, Fox, Gomez, Gaga
Four public figures were added — Angelina Jolie (BRCA1 and preventive surgery), Michael J. Fox
(Parkinson's disease), Selena Gomez (lupus and a kidney transplant) and Lady Gaga (fibromyalgia).
Every one is written from a primary self-disclosure that was actually retrieved and read. Four
things are worth recording.

**The New York Times is unreachable from this environment**, in both the fetch tool and the browser.
Angelina Jolie's disclosure is her 2013 NYT op-ed, so for a while there was no story. What worked
was a **licensed syndicated reprint**: the Tampa Bay Times carried the full text under her byline
and a "© 2013 New York Times" credit, and that is what is cited, with the reprint's URL and date.
A reprint of her own words is still her own words; a news report *about* the op-ed would not have
been. This is worth knowing for anyone who hits the same wall — the sources that are reachable here
are YouTube transcripts, X's own oEmbed endpoint, NHS and charity pages, and most non-US press.

Lady Gaga's original disclosure is a tweet. It was retrieved from **X's own oEmbed endpoint**
(`publish.twitter.com/oembed`), which returns the author, the date and the text of a single post
without a login, and so is a genuine primary retrieval rather than a quote copied out of coverage.
The 23-word quote on that story is that tweet, and it is the only verbatim quote on the four; a
second quote, Jolie's closing line, comes from the printed op-ed. Nothing is quoted from a YouTube
caption track — those mangle names and medical terms, and two of these four sources are captions.

**A living organ donor is a third person**, and her health is not ours to publish. The Gomez story
is written entirely from what Gomez says about herself: lupus, failing kidneys, the transplant, the
second operation when an artery turned, the recovery. The donor is not named or described anywhere
in our words. The TODAY headline that names her is kept intact in the source citation, because a
citation is the publisher's title and altering it to be tactful would quietly break the one thing
sourcing is for. We also left out what Gomez said about her lupus and arthritis after the
transplant: that is a treatment-worked claim, and rule 9 is rule 9 even when the person said it.

**The NHS has no BRCA page.** `nhs.uk/conditions/predictive-genetic-tests-cancer/` now redirects to
a 404, and the breast cancer page mentions a faulty BRCA gene only in a list of risk factors. So the
`brca1-gene-change` summary is written from **Breast Cancer Now**, under PL-14 — a registered
charity whose purpose is information, with nothing to sell — with the risk figures it gives
(roughly 65–79 in 100 for breast cancer, 40–60 in 100 for ovarian) rather than the 87 per cent and
50 per cent Jolie's own doctors gave her, which belong in her story as her doctors' estimate for
her. `kidney-transplant` is a condition page sourced from NHS Blood and Transplant; the other three
are NHS condition pages. The rest are NHS pages read in full.

One correction worth recording against the "ALS not MS" lesson: **secondary coverage of Jolie's
op-ed widely says her mother died at 56. The op-ed itself says 59.** We publish neither, because her
mother's illness is a third person's health and needs its own source — but it is a clean
demonstration that the summary of a source and the source are not the same document.

**Photographs** are Wikimedia Commons, self-hosted in `public/figures/`, licence and photographer
read from the Commons API: Harald Krichel, CC BY-SA 4.0 (Jolie); Thomas Atilla Lewis, CC BY 2.0
(Fox); Frank Sun / WikiPortraits, CC BY-SA 4.0 (Gomez); Carlos M. Vazquez II, CC BY 2.0 (Gaga).
PL-16 unchanged. The first Fox portrait found — the one Wikipedia uses — was rejected on editorial
rather than licence grounds: it is from a US election campaign event and he is wearing a campaign
badge, which is not what a health story's card should imply about him.

### PL-18 · A story can carry support contacts its condition does not imply
Sensitivity has always lived on the condition: `depression` is flagged, so every story tagged to it
gets a content note and support contacts. That broke on a story about a ruptured brain aneurysm. The
person's own essay describes asking the medical staff to let her die, and the editor had two
options — publish it with no signposting, or cut it. Marking `brain-aneurysm` a sensitive topic to
solve it would have put suicide signposting in front of every reader who has one, which is wrong for
them and wrong for the condition. The passage was cut.

`Story.needsSupportSignposting` fixes it. The condition stays what it is, and the story carries what
it contains. First used on Richard Bacon's ADHD story, which is substantially about drinking he has
not stopped: ADHD is not a sensitive topic and flagging it would have put addiction signposting in
front of every reader with ADHD.

The card query was also re-deriving the content-note rule inline instead of calling the shared
function — the exact drift the module's own comment warns about. It now goes through
`needsContentNote` like everything else.

### PL-19 · Three editors, one test database
All three content editors were told to run their suites against `.env.test.qa`. They did, at the
same time, and spent real effort diagnosing 14, 61 and 83 failures that were four processes
truncating one database under each other. Every one of them worked it out and re-ran in isolation
rather than reporting a red suite, which is the right instinct — but the instruction was wrong and
it was mine. Parallel editors need parallel databases; the env files already exist for exactly this.

### PL-20 · Sarah Hiscox, and the two things we would not repeat from the source
Published, linked to Mogadon through `StoryIntervention` — the first story to use the medicine link
for the purpose it was built for. Two things in the source did not survive editing.

**The caption calls Valium "a very very strong opioid".** It is a benzodiazepine, and the caption
also renders the drug's name as "palium" and Mogadon as "Mogadom". Naming a drug and misstating its
class in the same sentence, attributed to a real person, is precisely the error the platform exists
to prevent. The story says she took pills she found in the family bathroom cabinet and does not name
them. If a source of hers names them correctly, an editor can add it.

**She describes the first tablet as "like having a big blanket wrapped around me. It was delicious."**
True to her experience, and a sentence that reads as an advertisement for taking it. People in
recovery read pages like this one. The story says it was the beginning of something without the
sensory detail.

The UKAT page supplied as a source is a private rehab provider (rule 14). Mogadon's summary continues
to come from the electronic Medicines Compendium and the NHS.

She has no freely licensed photograph, so her card shows initials. Two press images were supplied
and both were refused.

### PL-21 · A friend may speak for someone who has died — rule 16
Beverley Knight's story is about Tyrone, her closest friend, who declined treatment and died in
2003. He was not a public figure, and HIV status is among the most stigmatised health information
there is. The brief allowed a **family or estate** to share publicly after a death. It did not cover
the friend who was in the next room, and grief does not follow family trees.

Rule 16 now permits it, with four conditions: the person has died and time has passed; the speaker
was close to them and is telling their own story; only the name the speaker uses is published; and
nothing is added or inferred. The rule says explicitly to apply it more strictly the more stigma the
condition carries, because the person cannot correct us.

So the story names him "Tyrone", as she does, and says on the page that he was not a public figure
and nothing has been added to what she said. The condition page leads with the two facts stigma has
outlived: effective treatment makes the virus untransmittable, and you cannot catch HIV from
everyday contact.

### PL-22 · What was cut from these two stories
**Kate Nash:** a classmate who was critically ill with a heart problem is the reason her mother
stopped attributing her palpitations to an inhaler. That is a third person's health, so the story
says a girl at her school became critically ill and gives none of the detail the source gives.

**Beverley Knight:** nothing about HIV campaigning. The chapter heading supplied with this source
described how Tyrone's illness changed her purpose; this recording does not contain that, and a
plausible claim is still a claim. If she has said it elsewhere, an editor can add it with that
source.

### PL-23 · Support is matched to the topic, not bolted to the medicine
Signposting was hard-wired: the crisis contacts on every page, plus a substance block only when a
flagged **medicine** was attached to the story. Two failures fell out of that within a day.

DJ Fat Tony's story is tagged to drug addiction and has no medicine, so it showed no FRANK. And a
story about childhood sexual abuse would have offered Samaritans and nothing else — no Rape Crisis,
no Sexual Assault Referral Centre. Being handed only the wrong number reads as nobody having
thought about you.

`Condition.supportTopic` names a block in `src/lib/safety/support-topics.ts`, and pages render it
alongside the crisis contacts. Adding a topic is a row of data plus an entry there; no page changes.
Unknown keys are ignored rather than thrown — losing an extra block is bad, taking down the page
that carries the crisis contacts is worse.

Every number was read from **two independent sources** before being written down: Rape Crisis
0808 500 2222 from the NHS page and from rapecrisis.org.uk; FRANK from talktofrank.com and the NHS.
The sexual violence copy leads with the two facts most likely to stop someone ringing — you do not
have to go to the police, and it does not matter how long ago it was.

### PL-24 · Kimberly Wyatt, and writing less than the source gives
She said she did not want to go into detail, and the story does not. It gives the shape — extended
family, the same isolated house, more than once, more than one person — and no more.

The centre of it is not the abuse. It is that she told someone as a child and was not believed. That
is what the story is built around, and it is the part a reader in the same position most needs to
see written down.

Cut: a claim made in the conversation that trauma is stored in the hips, which is folk physiology
with nothing behind it; and a named neuroscientist she works with, who adds nothing to her account.
The people who abused her are unnamed in the source and unnamed here.

### PL-25 · Ella Mills, and reporting a sequence without endorsing it
Her own site carries a detailed first-person account: PoTS diagnosed at twenty, a standing heart
rate of 150–180, most of a year in bed, twenty-five medications a day, a change of diet in May 2012,
and no medication since. The turn in that story is food, and she sells food.

The story reports the sequence in the order she tells it and stops there. It says in our own voice
that none of it is evidence that changing a diet treats PoTS, that the NHS says PoTS has no cure,
and that anyone thinking of stopping a prescribed medicine should speak to the prescriber. Same call
as the Selena Gomez cut (D-021): a person's account of what they did is publishable, a claim that it
worked is not.

Her own site is the source for *her account*; the NHS is the source for everything clinical. That
split is what keeps rule 14 intact when the person telling the story has something to sell.

No photograph: Wikimedia Commons has no picture of her, only a packet of her almonds. The supplied
press image was refused, and the card falls back to the monogram.

### PL-26 · Sophie Ellis-Bextor, and leaving her children out of it
Pre-eclampsia twice, at thirty-one weeks and then nine weeks early, caught the first time because
she read a passage in a pregnancy book the night before an appointment and recognised herself.

The source also describes one child's meningitis and another's collapsed lungs and week on a
ventilator. Both are living people who were infants at the time and have never said any of this
themselves. Rule 13 — out, along with the birth weights, which are facts about the babies rather
than about her. Gestational age stayed: delivery is the treatment for pre-eclampsia, so when they
were born is part of her own clinical course.

She says she was told that having had it twice does not mean you are expected to have it again. The
NHS lists previous pre-eclampsia among the things that raise the risk. Her recollection is reported
as hers, the NHS position is stated as the NHS's, and the page does not adjudicate between a reader
and their consultant. The condition summary was missing that risk factor and now has it.

### PL-27 · Delta Goodrem was not diagnosed with what we were told
The request paired her with the NHS page for **non-Hodgkin** lymphoma. Her diagnosis, in July 2003
at eighteen, was **Hodgkin** lymphoma — Wikipedia with a citation, and confirmed against NZ Herald,
Australian Women's Weekly and Mamamia. The interview never names it at all.

Tagged to the existing `hodgkin-lymphoma` condition. Second time a supplied condition has been wrong
(Eric Dane, D-019); the check is now routine rather than occasional.

### PL-28 · Jo Malone, and a treatment claim we could not check
Her doctor told her, twenty-one years later, that standard chemotherapy would not have saved her and
that he had put her on a then-new protocol along with a small number of other women, all of whom
are alive. It is the emotional centre of what she wants people to take from it, and it is an
efficacy claim we cannot verify.

Kept, attributed to her twice over — her account of what her doctor told her — with our own voice
saying plainly that the site cannot check it, that nothing described is being put forward as a
treatment that works, and that treatment decisions belong with an oncologist.

Cut: the interval and duration of the protocol, which would have made it a regimen (rule 17); the
"jagged edges, not a round pebble" description of her scan, which reads as a way to self-assess a
lump; competing lifetime-risk figures of one in three and one in seven, neither checkable and at
least one wrong; and a call for routine screening at thirty-eight, which is a policy opinion that
contradicts NHS screening ages.

No photograph: Commons has Jo Malone shops and Jo Malone bottles, and no Jo Malone.

### PL-29 · Cancer support was missing
Three stories tagged to cancers and the only signposting was NHS 111, 999 and Samaritans — the
numbers for someone in danger tonight, and not the ones a person newly diagnosed needs.

`cancer` topic added: the Macmillan Support Line (0808 808 00 00, read from Macmillan's own page and
from NHS trust pages publishing the same number) and Maggie's centres. Maggie's is there because it
asks nothing — no referral, no appointment, free, in the grounds of NHS hospitals — which is the one
that still works on a day you cannot face a phone call. Applied to breast cancer, Hodgkin lymphoma,
brain tumour and the BRCA1 gene change.

### PL-30 · The support flags never reached production
`Condition.supportTopic` and `Story.needsSupportSignposting` were added to the schema and to the
pages, and to neither of the scripts that move editorial content between environments. Local was
right and production was wrong, and nothing failed: the pages rendered, they just rendered the
crisis contacts and nothing else. No Rape Crisis on the story about childhood sexual abuse, no FRANK
on the one about addiction.

Both fields now travel. The import still leaves an existing story's text alone — re-importing over a
correction made on the far side would be worse than stale — but it updates the support flag, because
that one decides whether a person is shown a helpline. Importing this time repaired four stories
that had been live without it.

The lesson is narrower than "update the scripts": a safety feature that is only wired up in the
environment you look at is not wired up. The migration had not been deployed either.

### PL-31 · Alcohol support, and the warning that goes before the numbers
New `alcohol` topic: Drinkline (0300 123 1110, from the NHS alcohol support page and Alcohol Change
UK), Alcoholics Anonymous (0800 917 7650, from AA's own site and the NHS service directory), and
Alcohol Change UK as a link.

The intro carries a warning the other topics do not need, and it comes before any number. The NHS is
explicit that stopping suddenly when you are dependent can cause seizures and can need emergency
care. This block sits at the foot of stories about people who stopped drinking. A page that reads as
encouragement to do the same tonight, with that left out, is the foreseeable harm.

### PL-32 · Spencer Matthews sells the thing his story is about
He founded a non-alcoholic drinks company in 2018. The story says so, in his own part of the page,
because a reader working out what to make of a famous person describing how much better life is
without drink should know he has a commercial interest in that conclusion. One of the two images
supplied was from his company's shop.

He also declines to present moderation as a method, and the story does not either: he says that with
an addictive nature it stays a slippery slope, and what changed is the size of what he would lose.
Reported as his, flagged in our own voice as not a route this page puts forward.

His brother died on Everest when he was ten. He says therapists connect that to his drinking and
that he is uncomfortable making the connection himself, because he enjoyed drinking and nobody made
him. Both halves kept, neither resolved. Cut: allegations of negligence around the death, which are
not health information and which name nobody who can answer them.

### PL-33 · Penny Lancaster, and a husband's diagnosis left out
Three incidents, all hers, all told by her: an assault at twelve on the way to school, a drugging
and assault by a client during her modelling years, and an attack on the Underground. She reported
the first the same day and was believed; she refused to identify a suspect she was not certain of,
and he was never caught. She told nobody about the second for decades, and declined to make a
statement when an officer told her she had just reported a crime.

Her reason for stopping therapy after one session was that she was caring for her husband, who was
seriously ill. His diagnosis is public and he is a living person who did not disclose it here, so it
is not on this page — "seriously ill" carries her reason without publishing his health from her
mouth. Rule 15 does not have a famous-enough exception.

Cut: her account of brain development and of alcohol and drugs causing permanent damage before
twenty-one, which is a health claim, is contested, and is not her story.

### PL-34 · Tulisa, and writing a suicide attempt with nothing in it
The source describes an attempt in full — what was taken, how much, what was searched for
beforehand, how she was found, what colour she was. None of that is on the page, and the page says
so rather than leaving a gap a reader might try to fill.

What is published is the shape and the outcome: that she made attempts during those three years,
that a friend worked out something was wrong and called an ambulance, that she lived, that she was
angry to wake up, and that she thanked the person who intervened. The Samaritans media guidelines
are the floor here, not the target.

Also cut: the name of the private individual she thanked, and her mother's psychiatric diagnoses.
Her mother is living and did not disclose them here; the story says only that Tulisa was caring for
a parent from a young age, which is a fact about Tulisa. The journalist and newspaper are unnamed —
she was acquitted, and the page is about what the three years did to her health.

### PL-35 · Import the data after the code, not before
The alcohol topic went live as a `supportTopic` value on a condition row before the deploy carrying
the `alcohol` entry in `support-topics.ts` had finished. For a few minutes production served
Spencer Matthews's story with no alcohol support on it at all — because `supportTopicsFor` ignores a
key it does not recognise, which is the behaviour we chose so an unknown key can never take down the
page that carries the crisis contacts.

That fail-safe worked exactly as designed and it is still the wrong outcome, because it fails
quietly. When a topic is new, the deploy has to land before the import runs, and the page has to be
checked afterwards rather than assumed. Checking is what found it.

### PL-40 · Nine stories from one podcast, and what came off each of them
Eight new stories, plus a rewrite of one already published. All nine sources are long, deliberate,
first-person interviews given by the person whose health it is — except Andi Oliver's brother's
sickle cell, which is a sister speaking publicly about someone who died thirty-five years ago, and
which the brief allows.

Cut, story by story, with the reason rather than the list:

**Jamie Theakston** — every survival percentage. He recalls being told he had a ninety per cent
chance at stage one, and quotes figures for stage two and stage three. They are a patient's memory
of a consultation, they are not checkable, and a survival number on a health page is a claim about
the reader as much as about him. One tabloid has already run his specialist's "nine times out of
ten it's cancer" as "told he had a one in ten chance of survival", which is the whole argument.
Also out: his call for a national prostate screening programme, which is a policy opinion (PL-28),
and **his father's Alzheimer's**. His father is living and has not disclosed it. Rule 15's capacity
exception exists for a story told *about* such a person, deliberately, to raise awareness — not for
an incidental mention inside somebody else's story. Same call as Penny Lancaster's husband (PL-33).

**Andi Oliver** — her statement that a person with sickle cell cannot be given a general anaesthetic
"because it can kill them". Published on a health page, that could make somebody refuse an
operation they need. What is publishable is the Cyprus story itself: a crisis taken for appendicitis
and a doctor who recognised sickle cell and stopped the operation. Also out: her attempt at the
biology, which she says herself she gets mixed up. And the **life expectancy of thirty** the family
was given in the 1970s is on the page only as what they were told then, set against the NHS position
now. A dated prognosis left to stand alone is a prognosis handed to every reader who has the
condition today.

**Trisha Goddard** — "the fitter you are, the better the outcome, and that's not just me saying it".
It is not checkable and it tells anyone doing badly that they did not try hard enough, which is the
exact thing she spends the rest of the interview objecting to. Her account of being in physiotherapy
at seven in the morning stays; the generalisation goes. Also out: an unverifiable statistic about
the proportion of men who leave a wife who is ill, her husband's first wife's illness, and her
speculation about the circumstances of her own conception — not health information, and about
someone who cannot answer.

**Julia Bradbury** — the largest cut of the nine. A specific recurrence-risk percentage attributed
to a named professor; a figure for how many women over fifty have dense breast tissue; the whole
cortisol, inflammation, sugar and "tribal ancestors" thread; and the passage where she puts the
interviewer on a plan, down to the percentage of cocoa. She sells books and walking retreats in
this area, so the page says so (PL-32) and says in our own voice that nothing she changed is here
as something that treated her cancer. Same handling as Ella Mills (PL-25). What survives is the
part that matters: a lump she found herself, two scans that called it benign, dense tissue that made
it hard to see, and an ultrasound offered as an afterthought as she stood up to leave.

**Fearne Cotton** — she recovered from bulimia without counselling, by cooking. That is her account
and it stays, with our own voice immediately after it saying it is not a route this page puts
forward, that eating disorders are treatable, and where to go. Nothing about behaviours, no
frequencies, no numbers.

**Ed Jackson and Andi Oliver** both describe wanting to die. Both stories carry the support flag and
a content note, and neither contains a method.

**Katie Piper** — the volume and strength of the acid (rule 17 applies to more than medicines: the
test is whether it reads as instructions), and her mother's private diary, which is read aloud in
the source with Katie's blessing but is a living third party's own writing.
### PL-41 · Ed Jackson was paired with the wrong condition
The request supplied the NHS head injury and concussion page. He did hit his head — on the bottom of
a swimming pool — but what he describes is a C6/C7 fracture-dislocation with disc fragments in the
spinal cord and no movement below the neck. The NHS head injury page does not mention the neck or
the spinal cord at all, and would have sent a reader looking for the wrong thing.

The NHS has no A–Z page for spinal cord injury, so the condition is written from NHS trust and NHS
spinal network pages, which is still an independent source and still not somebody selling treatment
(rule 14).

Third time a supplied condition has not matched the story (Eric Dane D-019, Delta Goodrem PL-27).
The check is no longer occasional.
### PL-42 · Six new conditions and five new support blocks
Conditions: acid and chemical burns, laryngeal cancer, sickle cell disease, spinal cord injury,
bulimia, binge eating disorder. Support blocks: `eating_disorder`, `sickle_cell`,
`spinal_cord_injury`, `burns`, `perinatal_mental_health`.

Two of them are worth the words.

**`eating_disorder`.** Andi Oliver's GP asked whether she was anorexic, then whether she was
bulimic, and on two noes told her nothing was available and put her on a diet — which was the thing
that had been setting off the next binge for years. So the block says, before any number, that you
do not have to be underweight or diagnosed, and that you are allowed to ask again. There is a test
for that sentence, because it is the point of the block rather than decoration. Beat's number was
read from Beat and from the NHS.

**`perinatal_mental_health`, and a number we did not print.** Paloma Faith's story went up with the
support flag set and no block behind it, because `postnatal-depression` had no topic — the PL-23
failure exactly, and it had been sitting there under Alanis Morissette and Brooke Shields too.
Writing the block turned up something better than the block: several NHS-adjacent and council
directories still publish a PANDAS telephone helpline, and PANDAS's own support page no longer
lists one. It runs WhatsApp, a bookable callback, email and groups, and sends anyone in crisis to
Samaritans. So no number is printed. A helpline that rings out is worse than no helpline for
somebody who had to work up to dialling it, and this is what the two-source rule is actually for —
it is not a formality, it caught a dead number.
### PL-43 · Katie Piper's own charity is on Katie Piper's page
The `burns` block carries Changing Faces and the Katie Piper Foundation. The Foundation is the
national charity for burns rehabilitation, and it is hers. Leaving it out to avoid the awkwardness
would have cost a reader the most relevant service in the country; leaving it in silently would have
been an advert. So it is in, and the story says in our own voice that she founded it — the same
handling as Spencer Matthews and his drinks company (PL-32).

The block sits on the condition, not the story, so it reaches anyone reading about acid and chemical
burns whether or not they came via her.
### PL-44 · Davina McCall's story ended at the anaesthetic
It was published from a recording that runs well past the operation, and stopped as she went under.
The same source has the part a reader facing this surgery would most want: the cyst was sitting on
the passage short-term memories travel through, it pulled that passage out of shape as it came out,
and she woke not knowing who or where she was. It came back over weeks.

Extended rather than published again as a second story. That meant taking it down, back to draft,
and through review and a second editor — which is what the admin screen says happens to a published
story, and there is no shortcut for having been published once. The published date moves as a
result. That is the design, not a side effect to route around.

Two things follow from this that are worth someone else knowing. The import script deliberately
leaves an existing story's text alone, so **this rewrite will not reach production by importing**;
it needs doing there. And a story built from a long recording should be checked for where it stops,
because the interesting half is often after the operation.
### PL-45 · Photographs: press images refused again, three stories with none
Press and agency images were supplied for most of these people — a newspaper's own CDN, a magazine's
optimiser, a stock still. All refused, as in PL-25. The five photographs used are from Wikimedia
Commons with the author, licence and source recorded on the figure, and each was opened and looked
at before it went anywhere near a story, because a wrong face on a health page is not a typo.

Jamie Theakston, Trisha Goddard and Ed Jackson have no photograph on Commons, so their cards fall
back to the monogram. A missing photograph is not a reason to publish one we have no right to.
### PL-46 · Quotes, and automatic captions
These sources were read as YouTube's automatic captions. They are good enough to report from
faithfully in our own words, and they are not a reliable record of anyone's exact words — they
mis-hear names, drop clauses and invent punctuation. One quote is used in the whole wave, and only
because it is short, plain and hard to mis-transcribe.

Where a date was not corroborated elsewhere it is simply absent from the source record, rather than
guessed to the nearest month.
### PL-47 · Three things found by reading the pages back
Everything above was written from the sources and checked against them. These three were only
visible on the published page, read cold:

**Andi Oliver** — the page said, in our own voice, that the diet her GP put her on "was the thing
that had been setting off the next binge for years". That is a health claim, and it is hers to make
rather than ours. Rewritten as what she says: that dieting was already what she had been trying, and
that she would resolve not to eat all day and then be unable to stop once she had started.

**Fearne Cotton** — the order was wrong. The page had her depression coming before the bulimia. In
the source it comes afterwards, in her thirties, around the point her career changed shape. A
sequence error in a mental health story is not a detail: it changes what caused what.

**Julia Bradbury** — she says she was addicted to alcohol, and the story was tagged only to breast
cancer, so it carried Macmillan and no Drinkline. A page that describes somebody stopping drinking
is precisely the page that needs the block whose first line is the NHS warning about stopping
suddenly. Tagged to alcohol use disorder as well.

All three went down, back to draft, through review and out again with a second editor, and the
retraction reason on each says what was wrong. That is three published dates moved for three
sentences, and it is the right price.

The lesson is the cheap one: read the page, not the draft. Two of these were invisible in the text
and obvious on the screen.
