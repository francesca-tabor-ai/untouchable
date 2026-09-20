# Engineering contract — read this before writing any code

**UnTouchable** is a health platform. Everything here is downstream of one fact: we hold UK GDPR
special category data about people at vulnerable moments, and we publish information about real,
named human beings. A bug in this codebase is not a broken feature, it is a harm.

The product brief is [`docs/brief/untouchables.md`](docs/brief/untouchables.md). It is the source of
truth for scope. This file is the source of truth for *how* we build.

---

## 1. Rules that are never negotiable

These are enforced by tests and lint rules. If you find yourself wanting to work around one, stop and
raise it instead.

1. **No content about real public figures.** Seeds, fixtures, tests and demo data use clearly
   fictional people only. Never generate biography-shaped text about a real person, living or dead.
2. **A story cannot be published without at least one source and two distinct editors.** Enforced in
   the domain layer and by a database constraint. The UI is not where this is decided.
3. **Retraction is immediate.** A retracted story disappears from every public surface — lists,
   search, condition pages, related stories, sitemaps, caches — on the next request.
4. **An unverified charity is never publicly visible.**
5. **Donation prompts are suppressed** on safety screens, throughout onboarding, and after any
   check-in that triggers a red flag. The suppression decision lives in one module.
6. **Every aggregate query goes through `src/lib/research/aggregate.ts`**, which applies consent
   filtering and small-group suppression (minimum 10, configurable). No exceptions, no direct queries.
7. **Free text never leaves the system in a research export.** Not notes, not descriptions, not stop
   reasons written by users.
8. **Withdrawing consent takes effect immediately** — the next query, export or email must already
   exclude that person.
9. **No medical advice, ever.** The UI shows data. It never interprets, ranks, recommends, or says a
   treatment worked. No AI-generated insight of any kind in the MVP.
10. **Role checks are server-side** on every route, action and query. A hidden button is not a
    permission check.
11. **No third-party analytics or tracking scripts on any authenticated page.**
12. **`DonationReferral` never stores a user id, IP address, or health context.**
13. **No content about a living child's health.** An adult telling their own childhood — what they
    were prescribed at eight, what they found in the bathroom cabinet at thirteen — is their own
    story and may be published: they are the person, grown up, choosing to tell it. A child's
    health disclosed by a parent, a relative or anyone else may not be published at all. The rule
    protects children who cannot consent, not adults remembering.
14. **Medicine information comes from independent sources** — the NHS, the BNF, or the electronic
    Medicines Compendium. **Never** from a company that sells treatment, however good its page is.
    A private clinic's drug page exists to find customers, and linking to it would sell the one
    thing this platform has: that nobody paid to be here.
15. **A family may speak for a living person who cannot speak for themselves — narrowly.** The
    default remains self-disclosure, or a family or estate speaking publicly after a death. The
    one exception is a condition that takes away the capacity to disclose: advanced dementia,
    aphasia, severe brain injury. It is allowed only when **all** of these hold, and an editor
    records that they hold:
    - the family has made a **deliberate public statement**, in their own words, not a leak,
      a paparazzi story, or a reporter's inference;
    - the statement was plainly **intended to be public**, usually to raise awareness;
    - the story is drawn **from that statement**, not from coverage of it;
    - nothing is added about the person's current state beyond what the family said.

    Refusing these would mean the conditions that silence people are the ones this platform
    never covers, which is the opposite of the point. But it is an exception, and it is not a
    licence to write about anyone who is unwell and famous.
16. **Never publish a dose, a regimen, or how much of something someone took.** A story can say a
    person was prescribed a drug, became dependent on it, and came off it. It must not be readable
    as instructions.

## 2. Architecture

```
src/
  app/
    (public)/          # no login: stories, conditions, charities, corrections
    (account)/         # signed in: onboarding, tracking, dashboard, settings
    (admin)/           # editor + admin: editorial, charities, questionnaires, research
    api/
  components/
    ui/                # design system primitives — OWNED BY THE PLATFORM LEAD
    ...                # feature components live beside their feature
  lib/
    db.ts              # Prisma client singleton
    auth/              # Auth.js config, session helpers, role guards
    consent/           # consent reads and the active-consent predicate
    research/          # aggregate.ts — the only path to aggregate data
    stories/ charities/ tracking/ questionnaires/ safety/ scheduling/
    email/             # provider interface + console provider
  styles/tokens.css    # design tokens — OWNED BY THE PLATFORM LEAD
prisma/
  schema.prisma        # OWNED BY THE PLATFORM LEAD
  seed/
tests/
  unit/ e2e/
```

**Domain logic goes in `src/lib/<domain>/`, not in route handlers or components.** Route handlers
authenticate, authorise, validate input with Zod, call a domain function, and render. This is what
makes the non-negotiable rules testable without a browser.

## 3. Files you may not edit

Single-writer files. Ask the platform lead; do not edit directly, even for a one-line change:

- `prisma/schema.prisma` and everything in `prisma/migrations/`
- `package.json`
- `src/styles/tokens.css` and `src/components/ui/**`
- `src/lib/db.ts`, `src/lib/research/aggregate.ts`
- this file, and `README.md`

Everything else: if it is inside your assigned feature area, it is yours.

## 4. How to write things here

- **Plain English in every piece of UI copy.** Write for someone reading on a phone, at 2am, newly
  diagnosed and frightened. Short sentences. No jargon, no cheeriness, no euphemism.
- **Never make a health claim.** "Your pain score over time", not "your pain is improving".
- **Prefer simple readable code over clever abstraction.** Someone will audit this.
- **Write the test with the feature**, especially for anything in section 1. A rule without a test is
  a rule we do not have.
- **Accessibility is part of "done"**: keyboard reachable, visible focus, labelled controls, 4.5:1
  contrast, sensible heading order, no colour-only meaning. Mobile-first, 375px up.
- **Append to `DECISIONS.md`** when you make a notable call. Never rewrite existing entries.
- **British English** in all user-facing copy.

## 5. Commands

```bash
npm run dev            # development server
npm run build          # production build (must pass before you report done)
npm run lint           # eslint, including jsx-a11y
npm run typecheck      # tsc --noEmit
npm run test           # vitest unit tests
npm run test:e2e       # playwright
npm run db:migrate     # prisma migrate dev
npm run db:seed        # fictional demo data
npm run db:studio      # prisma studio
npm run verify         # typecheck + lint + test + build — run before reporting done
```

## 6. Reporting done

You are done when `npm run verify` passes, your feature's acceptance criteria in the brief are met and
tested, and you have written a short summary of what you built, what you assumed, and what you
deliberately left out. Do not report done on a red build. If you are blocked, say so with specifics —
guessing is worse than waiting.

## 7. Running tests in parallel

Each workstream has its own test database so that two suites running at once do not truncate
each other's fixtures. Use the env file for your area:

```bash
TEST_ENV=.env.test.stories npm test      # stories
TEST_ENV=.env.test.charities npm test    # charity giving
TEST_ENV=.env.test.auth npm test         # auth, onboarding, consent
TEST_ENV=.env.test.tracking npm test     # questionnaires, daily log, treatments
TEST_ENV=.env.test.scheduling npm test   # check-ins and reminders
TEST_ENV=.env.test.dashboard npm test    # personal dashboard
TEST_ENV=.env.test.safety npm test       # red flags and signposting
TEST_ENV=.env.test.admin npm test        # admin and research view
TEST_ENV=.env.test.rights npm test       # data rights and hardening
```

## 8. Auth is already built

Do not build your own. `src/lib/auth/` is platform-owned and provides:

```ts
getCurrentUser(): Promise<CurrentUser | null>   // may be null
requireUser(returnTo?): Promise<CurrentUser>    // or redirect to sign in
requireAdult(returnTo?): Promise<CurrentUser>   // 18+ confirmed, or to onboarding
requireEditor(): Promise<CurrentUser>           // 401 if signed out, 403 if not allowed
requireAdmin(): Promise<CurrentUser>
recordAudit(actorId, action, params)            // every admin and research action
hashPassword(password) / verifyPassword(hash, password) / passwordProblem(password)
```

Call a guard at the top of **every** server component, server action and route handler in a
protected area. Never rely on the caller having done it.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 9. Two traps that have already cost us time

**`"use server"` files may only export async functions.** Exporting a plain object or a
constant from one fails at build time with a message that names a page rather than the file —
"Failed to collect page data for /admin/…" — and sends you looking in the wrong place. Put
shared form-state types and constants in a normal module next to the actions, not in the
actions file.

**Our type scale is named, not numbered** (`text-body`, `text-small`). tailwind-merge treats
anything after `text-` that it does not recognise as a font size as a *colour*, so an
unregistered size token silently deletes your text colour — this shipped white button text as
dark ink on dark green, at 1.33:1, across the whole product before it was caught. Any new size
token in `src/styles/tokens.css` must also be named in `src/lib/cn.ts`.
`tests/unit/design-system.test.ts` fails if the two drift apart.
