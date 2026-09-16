# Privacy architecture

How UnTouchable keeps its promises in code, not just in policy. Anyone reviewing this platform —
a DPO, an ethics committee, a researcher, a suspicious user — should be able to read this file and
then find the enforcement in the places it names.

## What we hold

Health data about identifiable people. Under UK GDPR this is **special category data** (Article 9),
lawful for us to process only on the basis of the person's **explicit consent** (Article 9(2)(a)).
That single fact drives everything below.

We deliberately do not collect: full date of birth (year only), postcode or address (coarse region
only), IP addresses against health activity, or anything at all about people under 18.

## Consent

Five separate purposes, each its own opt-in, each stored as its own append-only record with the
version of the wording shown and a timestamp (`ConsentRecord`).

| Purpose | Default | Without it |
|---|---|---|
| `core_tracking` | Must be given to use tracking | No tracking features at all |
| `research_anonymised` | Off | Excluded from every aggregate query and export |
| `commercial_research` | Off | Excluded from company-funded studies specifically |
| `contact_for_studies` | Off | Never contacted about studies |
| `marketing_email` | Off | No campaign email |

Consent is **append-only**. Withdrawing writes a new row with `granted: false`; we never delete the
history, because we must be able to show what someone agreed to and when. The current state is the
most recent row for that (user, purpose) pair.

**Withdrawal is immediate.** There is no batch job, no nightly reconciliation. The next query after
withdrawal already excludes that person, because consent is evaluated at query time rather than
copied onto records — see `src/lib/consent/`.

## The aggregate choke point

Every aggregate figure shown to an admin or researcher, and every CSV export, goes through
**`src/lib/research/aggregate.ts`**. Nothing else may query tracking tables for analysis. That module,
and only that module:

1. Filters to users whose **current** consent covers the stated purpose.
2. Excludes deleted users.
3. Applies **small-group suppression**: any group with fewer than `PRIVACY_MIN_GROUP_SIZE` (default
   10) users is returned as suppressed, never as a number. Suppressed groups are counted so a
   researcher can see that something was withheld without learning what.
4. Writes a `ResearchExport` audit record before any file is produced, and an `AuditLog` entry for
   every analytical read.

This is enforced three ways: the module is the only exported path, an ESLint rule forbids importing
the Prisma client into admin analytics routes, and tests assert that a withdrawn user vanishes from
results and that a group of nine is suppressed.

Suppression is a floor, not a guarantee against every inference attack. Differencing across repeated
queries with slightly different filters remains a known residual risk; the audit log exists partly so
that pattern is visible. Before any external researcher access, this needs a formal DPIA and probably
query budgeting.

## Free text never leaves

Notes, descriptions and free-written reasons are visible only to the person who wrote them, and to
nobody else — not to admins, not in analytics, not in exports. This is enforced by type: export row
types cannot accept those fields, so adding one is a compile error rather than a privacy incident.

Fields carrying this rule are marked `FREE TEXT — never exported` in `prisma/schema.prisma`.

## Donation referrals are anonymous

`DonationReferral` has no user id, no IP address, no session identifier and no URL — only the charity
and the *kind* of page the click came from. We can report how much support we send charities. We
cannot reconstruct who sent it. Charities receive aggregate referral counts and nothing else, ever.

**Following a charity is health data.** A person following a single-condition charity has effectively
disclosed a diagnosis. Follows and donation notes are treated as sensitive and are never shared with
the charity or anyone else.

## Deletion

"Delete my account" removes every row linked to the person: profile, consents, conditions, symptoms,
treatments, logs, responses, check-ins, safety events, saved stories, follows and donation notes.
Cascades are declared in the schema so nothing is left behind by an oversight.

Aggregate exports already produced cannot be recalled — the data in them is anonymised and no longer
attributable. The deletion screen says so plainly, before the person confirms.

## Access and audit

Role checks run server-side on every admin route, action and query. Admins never see names, email
addresses or free text in analytics. Every access to an admin or research endpoint writes an
`AuditLog` entry: who, what, which parameters, when.

## What still needs doing before launch

- Data Protection Impact Assessment, reviewed by a DPO
- Legal review of consent wording, disclaimers and the takedown policy
- ICO registration and a named data controller
- UK-region hosting confirmed and a data processing agreement with the host
- **Close the sign-up enumeration gap.** Sign-in is safe: it does the Argon2 comparison even for
  an unknown address, so response timing reveals nothing. Sign-up cannot be made safe the same
  way — telling someone "that address is already registered" is how registration forms work, and
  here it discloses that a named person has a health account. Fixing it properly means
  email-verification sign-up (always answer "check your inbox", and say what happened in the
  email), which needs a real email provider. Known, tracked, not fudged.
- Penetration test
- Retention schedule (we currently keep data until the person deletes it — defensible, but it has to
  be a decision on the record rather than a default)
