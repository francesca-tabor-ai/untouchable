# UnTouchable

> **Nobody is untouchable. Nobody is alone.**

UnTouchable starts with the health stories of well-known people — who chose to share them — and grows
into a patient outcomes network. Three things, in one place:

1. **Stories.** Public figures who have spoken openly about their own health, or a loved one's.
   Accurate, sourced, respectful, and always connected to somewhere to turn for help.
2. **Giving.** Every condition and story links to verified UK charities. We hand off to the charity's
   own donation page; we never hold your money and we take nothing from it.
3. **Outcomes.** People living with a condition track symptoms, treatments and outcomes in a
   structured way. Pooled, consented and anonymised, that becomes real evidence about what helps.

Free for patients and visitors, always. Funded later by the organisations that benefit from better
outcomes — researchers, studies, clinics — never by selling health products or advertising.

**UnTouchable does not give medical advice and is not a medical device.** It records and displays
information. It will never tell you what to do about your health.

---

## Getting started

Requires Node 20+ and PostgreSQL 14+.

```bash
cp .env.example .env.local     # then fill in AUTH_SECRET: npx auth secret
createdb untouchable_dev && createdb untouchable_shadow && createdb untouchable_test
npm install
npm run db:migrate
npm run db:seed                # fictional demo data only
npm run dev
```

The seed contains **no real people and no real charities**. Every public figure, story and charity in
development is invented. Real content is added by editors through the admin, with sources verified
against the official registers.

## Documentation

| Document | What it covers |
|---|---|
| [`AGENTS.md`](AGENTS.md) | Engineering contract — read before writing code |
| [`docs/brief/untouchables.md`](docs/brief/untouchables.md) | Product brief and full scope |
| [`DECISIONS.md`](DECISIONS.md) | Notable technical and product decisions, and why |
| [`docs/design-system.md`](docs/design-system.md) | Tokens, type scale, components |
| [`docs/privacy.md`](docs/privacy.md) | Consent model, suppression, export rules |

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind 4 · PostgreSQL via Prisma · Auth.js · Recharts ·
Vitest · Playwright. Production target is a UK-region host.

## Safety

If you are worried about your health, contact your GP or call NHS 111. In an emergency, call 999.
If you are struggling to cope, Samaritans are available day and night on 116 123.
