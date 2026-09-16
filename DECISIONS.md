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
