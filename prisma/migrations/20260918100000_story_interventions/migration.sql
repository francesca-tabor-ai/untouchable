-- Medicines become things a story can be about, not just things a patient records.

ALTER TABLE "Intervention"
  ADD COLUMN "slug" TEXT,
  ADD COLUMN "summary" TEXT,
  ADD COLUMN "isSensitiveTopic" BOOLEAN NOT NULL DEFAULT false;

-- Backfill a slug for everything that existed before medicines had pages of their own:
-- lower case, non-alphanumerics collapsed to single hyphens, trimmed.
UPDATE "Intervention"
SET "slug" = trim(both '-' from regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g'));

-- Two interventions may share a name across types (a supplement and a medicine, say), so
-- disambiguate anything that collided rather than failing the migration.
UPDATE "Intervention" i
SET "slug" = i."slug" || '-' || lower(i."type"::text)
WHERE EXISTS (
  SELECT 1 FROM "Intervention" j
  WHERE j."slug" = i."slug" AND j."id" <> i."id"
);

CREATE UNIQUE INDEX "Intervention_slug_key" ON "Intervention"("slug");

CREATE TABLE "StoryIntervention" (
  "storyId" TEXT NOT NULL,
  "interventionId" TEXT NOT NULL,
  "sourceId" TEXT,
  "context" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StoryIntervention_pkey" PRIMARY KEY ("storyId", "interventionId")
);

ALTER TABLE "StoryIntervention"
  ADD CONSTRAINT "StoryIntervention_storyId_fkey"
  FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StoryIntervention"
  ADD CONSTRAINT "StoryIntervention_interventionId_fkey"
  FOREIGN KEY ("interventionId") REFERENCES "Intervention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StoryIntervention"
  ADD CONSTRAINT "StoryIntervention_sourceId_fkey"
  FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- The context line describes how someone came to a medicine. It is not a place for a dose
-- or a regimen, and a short cap is the cheapest way to keep it from becoming one.
ALTER TABLE "StoryIntervention"
  ADD CONSTRAINT "story_intervention_context_is_a_phrase"
  CHECK ("context" IS NULL OR length("context") <= 160);
