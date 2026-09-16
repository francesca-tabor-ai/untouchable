# Project Brief: UnTouchable

> **Nobody is untouchable. Nobody is alone.**
>
> This document is the build brief for Claude Code. Read it fully before writing any code.
> Work milestone by milestone (see Section 10). Stop at the end of each milestone, summarise
> what was built, and wait for confirmation before continuing.

---

## 1. What we're building

UnTouchable is a web platform that starts with the health stories of well-known people and grows into a patient outcomes network.

1. **Celebrity health stories hub (first feature).** Public figures who have openly shared their own health conditions, or those of loved ones, show that nobody is untouchable. Stories are accurate, sourced and respectful, and they link people to support.
2. **Charity giving.** Every condition and story connects to verified UK charities. Users can donate through trusted donation platforms and follow the causes that matter to them.
3. **Outcome tracking.** People living with conditions track symptoms, treatments and outcomes in a structured, scientifically useful way. Over time, the pooled, consented and anonymised data becomes real-world evidence about what actually helps.

**Business model**
- **Free for patients and visitors.**
- **Paid for by organisations that benefit from better outcomes** (later phases): researchers, pharma real-world evidence studies, clinical trial recruitment, clinics, and employers or insurers paying for measurable improvement.
- **We never sell health products or run paid placements.** Independence of the stories and evidence is the core asset.
- **Donations go to charities, not to UnTouchable.** They are not a revenue stream.

This brief covers the **MVP**: the public stories hub, charity giving, the patient tracking app, and a basic privacy-safe research view.

---

## 2. Principles (apply to every decision)

1. **Accuracy and respect for public figures.** Only publish what people have chosen to share publicly themselves, with sources. No speculation or gossip.
2. **Evidence over opinion.** Use structured, repeatable measures, not star ratings or free-text reviews.
3. **Longitudinal by design.** Record a baseline, then check in at fixed intervals. Every data point has a timestamp and context.
4. **Consent is granular and revocable.** Each data use has its own opt-in. Withdrawing consent takes effect immediately.
5. **Privacy by default.** Collect the minimum. Health data is UK GDPR special category data. Host in the UK.
6. **Giving without pressure.** Donation prompts are gentle, optional and never shown at vulnerable moments.
7. **Not a medical device, not medical advice.** The app records and displays information. It must not diagnose, recommend treatments or generate individual clinical insights.
8. **Complements clinical care.** The copy always encourages people to keep working with their GP and clinicians.
9. **Accessible and calm.** WCAG 2.2 AA, mobile-first, plain English, low effort to use.

---

## 3. Users

| Role | Description |
|---|---|
| **Visitor** | Not logged in. Browses stories, condition pages and charities. Can donate via hand-off. |
| **Patient** | An adult (18+) with an account. Saves stories, follows charities, tracks their own health data. |
| **Editor** | Internal. Drafts and reviews public figure stories and charity listings. |
| **Researcher/Admin** | Internal. Views aggregate data only, never identifiable records. Manages questionnaires. |
| **Supporter** (later phase) | A relative or carer who logs on a patient's behalf, with permission. |

---

## 4. MVP scope

### In scope
1. **Celebrity health stories hub** (public, no login needed)
2. Condition pages that bring together stories, charities and general signposting
3. **Charity directory and donation hand-off**
4. Account creation, login and age confirmation (18+)
5. Granular consent capture with versioning
6. Onboarding: select conditions, select symptoms to track, add current treatments
7. Configurable questionnaire engine (validated-instrument ready)
8. Baseline assessment, then scheduled follow-up check-ins
9. Daily quick symptom log (under 30 seconds)
10. Treatment/medication course logging
11. Personal dashboard: symptom trends with treatment changes marked
12. Safety signposting and side-effect reporting link-out
13. Admin: editorial workflow, charity management, questionnaire management, aggregate analytics with privacy thresholds, audited CSV export
14. Data rights: download my data, withdraw consent, delete my account

### Out of scope for MVP (design so these can be added later)
- Processing donation payments in-app (MVP hands off to external donation platforms; the app never holds donated funds)
- User-created fundraisers, donation round-ups, or pledging a share of company revenue
- User-submitted stories and community forums
- Supporter/carer accounts
- Clinical trial matching
- Wearable integrations
- Employer/insurer dashboards
- AI-generated insights of any kind
- Native mobile apps (build a responsive web app / PWA instead)

---

## 5. Feature 1: Celebrity health stories hub

### 5.1 Content
- **Public figure profile:** name, short neutral bio, image (only if licensed, otherwise initials or neutral illustration), and the conditions they have spoken about.
- **Story:** a sourced summary of a public figure's health disclosure. Fields: condition tags, disclosure type (own health / a loved one's health), summary written in our own words, key moments (diagnosis, treatment, recovery or living with it), charities the person has publicly supported (sourced), and one or more source links.
- **Community stories:** editorial stories from non-famous people, published only with their written permission. Same structure; can be anonymous.
- **Browsing:** home feed, filter by condition, search by name or condition, related stories, and "you're not alone" condition pages.
- Logged-in users can save stories and follow conditions.

### 5.2 Editorial rules (enforce in the data model and admin workflow)
- **Self-disclosure only.** Publish only health information the person has shared publicly themselves (interview, their own social media, book, podcast, official statement), or that their family or estate has shared publicly after their death. No rumours, speculation or unsourced tabloid claims.
- **Sources required.** Every story needs at least one primary source link with its title, publisher and date. A story cannot be published without one.
- **Own words.** Summaries are written in our own words. Direct quotes are optional, must be short (maximum 25 words), attributed and linked, with at most one quote per source.
- **No implied endorsement.** Show a clear disclaimer on every public figure page: *"[Name] is not affiliated with and has not endorsed UnTouchable."* Never use public figures' names or images in advertising.
- **No content about minors' health.**
- **Two-step publishing.** An editor drafts, and a second editor verifies the sources before publishing. Record who did what, and when.
- **Corrections and takedowns.** Provide a public "request a correction or removal" form for public figures, their representatives, or anyone else. Requests create an admin task. Stories can be set to `retracted`, which hides them immediately.
- **Periodic review.** Flag stories for re-review after 12 months.
- **Sensitive topics.** Stories involving suicide, self-harm or eating disorders follow Samaritans' media guidelines: no method details, a content note at the top, and support signposting at the bottom.
- **Images.** Store licence details for every image. Unlicensed images cannot be uploaded to published stories.

### 5.3 Seed data
- **Use clearly fictional placeholder public figures and stories only.** Do not generate content about real people. Real stories will be added by the editorial team through the admin, with verified sources.

### 5.4 Acceptance criteria
- A visitor can browse, filter and search stories on mobile without logging in.
- A story with no source, or with only one editor's approval, cannot be published (tested).
- Retracting a story removes it from all public pages immediately (tested).
- Every public figure page shows the no-endorsement disclaimer.
- Sensitive-topic stories show the content note and signposting.

---

## 6. Feature 2: Charity giving

### 6.1 Charity directory
- **Listing fields:** name, registered charity number, regulator (Charity Commission for England and Wales, OSCR, or CCNI), website, donation page URL, condition tags, short description in our own words, logo (only with permission), and verification date.
- **Verification.** An editor checks each charity against the relevant official register before listing it. Store who verified it and when. Charities not re-verified within 12 months are flagged.
- **Permission flag** for using the charity's name and logo. Without it, show the name as text only.

### 6.2 Where charities appear
- On condition pages
- On story pages, including charities the public figure has publicly supported (with a source)
- In a "Causes I follow" section for logged-in users

### 6.3 Donating
- A **Donate** button hands the user off to the charity's own donation page or a regulated donation platform (e.g. JustGiving or Enthuse), opened in a new tab. UnTouchable never takes or holds payment in the MVP. Gift Aid is handled by the charity or platform.
- Record anonymous referral clicks (charity, originating page, timestamp) so we can report how much support we drive.
- Logged-in users can optionally note a donation they made, for their own record.
- Design a `DonationProvider` interface so confirmed-donation tracking via platform APIs or webhooks can be added later.

### 6.4 Giving without pressure (required)
- Never show donation prompts on safety/red-flag screens, during onboarding, or directly after a check-in with high symptom scores.
- No guilt-based or urgent copy ("only 2 hours left", "don't let them down").
- Donating never unlocks features or changes how the app treats a user.
- Following a condition-specific charity can reveal health information, so treat follows and donation notes as sensitive. **Never share them with charities or anyone else** unless the user explicitly chooses to.

### 6.5 Future (do not build yet)
- User fundraisers and challenges
- Round-up giving
- Pledging a share of UnTouchable revenue to charity. This needs formal agreements with charities and the legally required statements for commercial participators under the Charities Act 1992, so get legal advice first.
- Charity partner dashboards (aggregate, anonymised referral data only)

### 6.6 Acceptance criteria
- An unverified charity cannot be shown publicly (tested).
- Donate hand-off works on mobile and logs a referral without any personal data.
- Donation prompts are suppressed in all the contexts listed in 6.4 (tested).

---

## 7. Feature 3 onwards: Outcome tracking

### 7.1 Auth and onboarding
- Email and password (or magic link) sign-up. Users must confirm they are 18 or over.
- Onboarding flow: welcome → consent → conditions → symptoms → current treatments → baseline assessment.
- Users can pause onboarding and resume later.
- **Done when:** a new user can complete onboarding end to end on a mobile viewport, and every step is saved.

### 7.2 Consent
Separate opt-ins, each stored as its own record with the consent text version and a timestamp:

| Purpose | Required? |
|---|---|
| `core_tracking`: store and display my data to me | Required for tracking features |
| `research_anonymised`: include my anonymised data in aggregate research | Optional |
| `commercial_research`: include my anonymised data in studies funded by companies | Optional, off by default |
| `contact_for_studies`: contact me about specific studies I may want to join | Optional, off by default |
| `marketing_email`: news and charity campaign emails | Optional, off by default |

- Users can view and change consents anytime in Settings.
- Withdrawing a consent immediately excludes that user from the relevant queries, exports and emails.
- **Done when:** the aggregate query layer filters on active consents, and tests prove a withdrawn user disappears from results.

### 7.3 Questionnaire engine
- Questionnaires are defined as data (JSON/DB), not hard-coded. Supported item types: Likert scale, 0–10 numeric scale, single choice, multiple choice, yes/no, date, and short free text.
- Each questionnaire has a version. Responses are always linked to the exact version answered.
- Support scoring rules defined per questionnaire (sum, mean, custom mapping).
- **Licensing note:** validated instruments such as EQ-5D and PROMIS have licence terms. For MVP, seed a **placeholder generic wellbeing questionnaire** and design the engine so licensed instruments can be loaded later without code changes.
- **Done when:** an admin can create a new questionnaire version without code changes, and scores are computed correctly (unit tested).

### 7.4 Scheduled check-ins
- Baseline assessment at onboarding.
- Follow-up schedule relative to a **treatment start date**: 2 weeks, 3 months, 6 months, then every 6 months. The schedule is configurable per questionnaire.
- General check-in every 4 weeks, even with no treatment change.
- Email reminders (use a pluggable provider; log to console in dev). Users control reminder frequency.
- Missed check-ins are recorded as missed, not silently dropped.
- **Done when:** creating a treatment course generates the correct future check-ins, and reminders fire in a test harness.

### 7.5 Daily quick log
- One screen: 0–10 slider for each symptom the user chose, an optional short note, and an optional "anything unusual today?" tag list (e.g. poor sleep, illness, stress, missed dose).
- Must be completable in under 30 seconds. One log per day, editable that day.
- **Done when:** a user can log and edit today's entry and see it on the dashboard.

### 7.6 Treatment/medication logging
- Fields: name, standardised code (nullable), dose, frequency, route, start date, end date, reason for stopping (not working / side effects / cost / advice from clinician / other), and adherence self-rating.
- Covers prescription medicines, over-the-counter medicines, supplements, devices and non-drug interventions (e.g. physiotherapy, meditation).
- **Coding:** the schema should support dm+d codes for medicines and SNOMED CT codes for conditions. For MVP, seed a small sample lookup list. Full dm+d import is a later task (it requires an NHS TRUD account).
- **Done when:** a user can add, edit and stop a treatment course, and it appears as a marker on their dashboard timeline.

### 7.7 Personal dashboard
- Line chart of each tracked symptom over time, with treatment start/stop markers.
- Questionnaire score history.
- Date range filter (1 month, 3 months, 6 months, all).
- Saved stories and followed charities.
- **Show data only. No interpretation, recommendations or "this treatment worked" statements.**
- "Download a summary to share with my GP" (a simple printable page).
- **Done when:** the dashboard renders correctly with seeded demo data on mobile and desktop.

### 7.8 Safety
- Persistent footer: "UnTouchable does not give medical advice. If you're worried about your health, contact your GP or NHS 111. In an emergency, call 999."
- Configurable "red flag" rules per questionnaire item (e.g. a very high symptom score, or answers indicating distress). When triggered, show a supportive signposting screen with NHS 111, 999 and Samaritans (116 123). Log that the screen was shown. No donation prompts on this screen.
- After any logged side effect, show a link to the MHRA Yellow Card scheme (https://yellowcard.mhra.gov.uk).
- **Done when:** red-flag rules are tested and cannot be skipped silently.

### 7.9 Admin / research view
- Role-based access (editor, admin). Admins never see names, emails or free-text notes in analytics.
- **Editorial tools:** story drafting, source verification, two-step publishing, takedown queue, and review reminders.
- **Charity tools:** listing, verification, permission flags, and referral click reports.
- **Aggregate views:** outcome score trajectories by condition and treatment, stop reasons, and check-in completion rates.
- **Privacy threshold:** suppress any group with fewer than **10** users (make this configurable).
- CSV export of aggregate data only. Every export is recorded in an audit log with who, when, the query parameters and the consent purpose.
- **Done when:** tests prove small groups are suppressed and every export creates an audit record.

### 7.10 Data rights
- Download all my data (JSON and CSV), including saved stories, followed charities and donation notes.
- Delete my account: removes identifiable data within the app. Aggregate exports already made are unaffected, and the user is told this in the UI.
- **Done when:** deletion removes all rows linked to the user (tested).

---

## 8. Data model (starting point; refine as needed)

```
# Accounts & consent
User(id, email, password_hash|null, created_at, deleted_at|null,
     role: patient|editor|admin)
Profile(user_id, display_name, year_of_birth, sex|null, region|null)
ConsentRecord(id, user_id, purpose, granted: bool, consent_text_version, created_at)

# Stories hub
Condition(id, name, slug, snomed_code|null, summary, is_sensitive_topic: bool)
PublicFigure(id, name, slug, short_bio, image_url|null, image_licence|null,
             is_deceased: bool)
Story(id, type: public_figure|community, public_figure_id|null,
      disclosure_type: own|loved_one, title, slug, summary, key_moments_json,
      quote|null, quote_source_id|null, content_note|null,
      community_permission_confirmed: bool|null,
      status: draft|in_review|published|retracted,
      drafted_by, verified_by|null, published_at|null, last_reviewed_at|null)
StoryCondition(story_id, condition_id)
Source(id, story_id, url, title, publisher, published_date,
       source_type: interview|own_social|book|podcast|statement|article)
SavedStory(user_id, story_id, created_at)
TakedownRequest(id, story_id, requester_name, requester_email, relationship,
                reason, status: open|actioned|declined, created_at, resolved_at|null)

# Charities & giving
Charity(id, name, slug, registered_number, regulator: CCEW|OSCR|CCNI,
        website_url, donation_url, description, logo_url|null,
        logo_permission: bool, verified_by|null, verified_at|null, active: bool)
CharityCondition(charity_id, condition_id)
StoryCharity(story_id, charity_id, source_id|null)   # source required for public-figure support claims
CharityFollow(user_id, charity_id, created_at)
DonationReferral(id, charity_id, origin_page, created_at)   # no user_id, anonymous
DonationNote(id, user_id, charity_id, amount|null, donated_on, note|null)

# Tracking
UserCondition(id, user_id, condition_id, diagnosed_year|null, self_reported: bool)
Symptom(id, name, condition_ids[])
UserSymptom(id, user_id, symptom_id, active: bool)
Intervention(id, name, type: rx|otc|supplement|device|non_drug, dmd_code|null)
TreatmentCourse(id, user_id, intervention_id, dose, frequency, route,
                start_date, end_date|null, stop_reason|null, adherence_rating|null)
Questionnaire(id, key, title, licence_note)
QuestionnaireVersion(id, questionnaire_id, version, items_json, scoring_json,
                     red_flag_rules_json, schedule_json, published_at)
ScheduledCheckIn(id, user_id, questionnaire_version_id, treatment_course_id|null,
                 due_at, status: pending|completed|missed)
Response(id, user_id, questionnaire_version_id, check_in_id|null,
         answers_json, score|null, completed_at)
DailyLog(id, user_id, date, symptom_scores_json, tags[], note|null)
SideEffectReport(id, user_id, treatment_course_id, description, severity, created_at)

# Safety & audit
SafetyEvent(id, user_id, rule_key, shown_at)
AuditLog(id, actor_id, action, params_json, created_at)
```

Rules:
- Every table has `created_at` and `updated_at`.
- Free-text fields (`note`, `description`) are **never** included in research exports.
- Store `year_of_birth`, not full date of birth.
- `DonationReferral` must never store user identifiers, IP addresses or health context.

---

## 9. Tech stack and security

### Tech stack (suggested; ask before changing)
- **Framework:** Next.js (App Router) + TypeScript. Public story and charity pages should be server-rendered for SEO.
- **Styling:** Tailwind CSS, accessible component primitives (e.g. Radix / shadcn/ui)
- **Database:** PostgreSQL via Prisma. Production target is a UK-region host (e.g. AWS eu-west-2 or Supabase London).
- **Auth:** Auth.js (NextAuth) or Supabase Auth
- **Charts:** Recharts
- **Email:** pluggable provider interface (console logger in dev)
- **Background jobs:** a simple scheduled job runner for reminders, missed check-ins, and review/verification expiry flags
- **Testing:** Vitest (unit), Playwright (end to end)
- **Tooling:** ESLint, Prettier, `.env.example`, seed script with **fictional** demo data only

### Security and privacy requirements
- All secrets in environment variables. Never commit secrets.
- HTTPS everywhere. Rely on the database host for encryption at rest.
- Role checks enforced server-side on every route and query, not only in the UI.
- Aggregate queries go through a single module that applies consent filtering and small-group suppression. No analytics query may bypass it.
- Log access to admin/research endpoints in `AuditLog`.
- No third-party analytics or tracking scripts on logged-in pages. Public pages may use privacy-friendly, cookieless analytics only.
- External donation links use `rel="noopener noreferrer"` and pass no user data.
- No real patient data or real public figure content in seeds, tests or fixtures.

---

## 10. Build plan

Complete one milestone at a time. At the end of each: run tests, summarise changes, list any decisions or assumptions made, and wait for approval.

| # | Milestone | Output |
|---|---|---|
| 0 | Scaffold | Repo structure, stack set up, lint/test tooling, DB connection, README, `.env.example`, UnTouchable branding placeholders |
| 1 | **Celebrity stories hub** | Section 5: public pages, condition pages, search/filter, editorial admin with two-step publishing, takedown form, safety footer and sensitive-topic handling |
| 2 | **Charity giving** | Section 6: directory, verification, story/condition links, donate hand-off, referral tracking, no-pressure rules |
| 3 | Auth, onboarding and consent | 7.1, 7.2, save stories, follow charities |
| 4 | Questionnaire engine and baseline | 7.3, seeded placeholder questionnaire |
| 5 | Daily log and treatment logging | 7.5, 7.6 |
| 6 | Scheduling and reminders | 7.4 |
| 7 | Personal dashboard | 7.7 with seeded demo data |
| 8 | Safety features | 7.8 red-flag rules and side-effect link-out |
| 9 | Admin and research view | 7.9, audit log |
| 10 | Data rights and hardening | 7.10, accessibility pass, security review, end-to-end tests of core journeys |

---

## 11. Future phases (do not build yet; keep the architecture open to them)

- User-submitted stories with moderation
- Community spaces with moderation
- Fundraisers, round-up giving, and a revenue-share charity pledge (after legal advice)
- Charity partner dashboards
- Supporter/carer accounts with delegated permissions
- Clinical trial matching (consent: `contact_for_studies`)
- Wearable data (sleep, heart rate, steps)
- Licensed validated instruments (EQ-5D, PROMIS) and full dm+d/SNOMED import
- Outcomes-based dashboards for employers and clinics
- Patient value-sharing (data dividend or community fund)
- Research partner portal inside a trusted research environment

---

## 12. Open questions (flag rather than guess)

- Trademark and domain availability for "UnTouchable"
- Visual identity and tone of voice
- Which conditions to launch with (recommend 1–3 for focus)
- Which donation platform(s) to partner with
- Magic link vs password for auth
- Hosting provider choice
- Wording of consent text, disclaimers and takedown policy (will need legal review before launch)

---

## 13. How to work with me

- Ask before adding major dependencies or changing the stack.
- Prefer simple, readable code over clever abstractions.
- Write tests alongside features, especially for publishing rules, retraction, charity verification, donation-prompt suppression, consent filtering, suppression, scoring and red-flag rules.
- Keep a `DECISIONS.md` log of notable choices and why they were made.
- Use plain English in all UI copy. Never make health claims in the UI.
- Never write content about real public figures. Use fictional placeholders only.
