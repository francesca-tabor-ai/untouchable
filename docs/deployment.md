# Deployment

The site is a Next.js app on Vercel with a UK-region PostgreSQL database. Editorial content
does not travel with the code — it is entered by people through the admin — so moving it
between environments uses the export and import scripts.

## One-time setup

1. **Provision the database.** In the Vercel dashboard, add a Postgres store to the project
   and choose a **UK or EU region**. Health data is UK GDPR special category data and should
   not leave the UK without a documented reason. The store sets `DATABASE_URL` automatically.

2. **Set `SHADOW_DATABASE_URL`** to the same value as `DATABASE_URL`. It is only read by
   `prisma migrate dev`, which never runs in production, but the schema names it.

3. The remaining production variables are already set: `AUTH_SECRET`, `AUTH_TRUST_HOST`,
   `PRIVACY_MIN_GROUP_SIZE`, `EMAIL_PROVIDER`.

## Every release

```bash
# Apply migrations to production
DATABASE_URL="<production url>" npx prisma migrate deploy

# Deploy
vercel --prod
```

`npm run build` runs `prisma generate` first, so the client is built for whichever platform
Vercel is running — never committed, because a committed client carries a query engine
binary for the machine that generated it.

## Moving editorial content

```bash
# From the environment that has the content
npx tsx scripts/export-editorial.ts editorial-export.json

# Into the target environment
DATABASE_URL="<target url>" npx tsx scripts/import-editorial.ts editorial-export.json
```

The export contains **no patient data** — no accounts, no consent records, no tracking, no
free text. Only what is already published publicly: conditions, medicines, public figures and
published stories with their sources.

It excludes fictional development stories, identified by their sources: every seeded story
cites `example.test` and a real one cannot.

**Never commit an export.** It describes real, named people. `editorial-export*.json` is
ignored.

## The seed does not run in production

`prisma/seed/` creates editor and admin accounts whose password is written in plain text in a
public repository. It refuses to run unless `ALLOW_DEV_SEED=true`, and refuses outright when
`NODE_ENV=production`. There are no sign-in-capable accounts in production unless somebody
deliberately creates one.

## Still required before this is a responsible public service

These are not deployment steps. They are the things that make it defensible to hold this data
at all, and none of them are done:

- A Data Protection Impact Assessment, reviewed by a DPO
- Legal review of the consent wording, the disclaimers and the takedown policy
- ICO registration and a named data controller
- A real person monitoring the corrections and takedown queue
- A second human editor verifying sources before anything is published
- A password reset flow — there is currently no way to recover an account
- Penetration test
