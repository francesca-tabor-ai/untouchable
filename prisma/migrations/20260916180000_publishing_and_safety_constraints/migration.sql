-- Editorial integrity, enforced by the database.
--
-- These rules protect real, named human beings from having something inaccurate published
-- about their health. Application code can be bypassed by a script, a console session, or a
-- future refactor that forgets. The database cannot.
--
-- Brief section 5.2.

-- 1. A published story needs a second pair of eyes, and they must belong to someone else.
ALTER TABLE "Story"
  ADD CONSTRAINT "story_published_requires_second_editor"
  CHECK (
    "status" <> 'published'
    OR ("verifiedById" IS NOT NULL AND "verifiedById" <> "draftedById")
  );

-- 2. A public figure story must be about a public figure; a community story must not
--    borrow one, and must carry written permission before it is published.
ALTER TABLE "Story"
  ADD CONSTRAINT "story_type_matches_subject"
  CHECK (
    ("type" = 'public_figure' AND "publicFigureId" IS NOT NULL)
    OR ("type" = 'community' AND "publicFigureId" IS NULL)
  );

ALTER TABLE "Story"
  ADD CONSTRAINT "community_story_published_requires_permission"
  CHECK (
    "status" <> 'published'
    OR "type" <> 'community'
    OR "communityPermissionConfirmed" = true
  );

-- 3. An image we do not have a licence for cannot be stored at all.
ALTER TABLE "PublicFigure"
  ADD CONSTRAINT "figure_image_requires_licence"
  CHECK ("imageUrl" IS NULL OR "imageLicence" IS NOT NULL);

-- 4. A quote must name where it came from, and stay short. Twenty-five words is the limit
--    in the brief; we count word boundaries generously and reject anything clearly over.
ALTER TABLE "Story"
  ADD CONSTRAINT "quote_requires_source"
  CHECK ("quote" IS NULL OR "quoteSourceId" IS NOT NULL);

ALTER TABLE "Story"
  ADD CONSTRAINT "quote_length_limit"
  CHECK ("quote" IS NULL OR array_length(regexp_split_to_array(btrim("quote"), '\s+'), 1) <= 25);

-- 5. A published story must have at least one source, and the last source of a published
--    story cannot be removed. A CHECK constraint cannot see another table, so this is a
--    pair of triggers.
CREATE OR REPLACE FUNCTION assert_published_story_has_source()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."status" = 'published'
     AND NOT EXISTS (SELECT 1 FROM "Source" WHERE "storyId" = NEW."id") THEN
    RAISE EXCEPTION
      'A story cannot be published without at least one source (story %)', NEW."id"
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER story_publish_requires_source
  BEFORE INSERT OR UPDATE OF "status" ON "Story"
  FOR EACH ROW EXECUTE FUNCTION assert_published_story_has_source();

CREATE OR REPLACE FUNCTION assert_source_not_last_of_published()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "Story"
    WHERE "id" = OLD."storyId"
      AND "status" = 'published'
  ) AND (SELECT count(*) FROM "Source" WHERE "storyId" = OLD."storyId") <= 1 THEN
    RAISE EXCEPTION
      'Cannot remove the only source of a published story (story %). Retract it first.', OLD."storyId"
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER source_delete_protects_published
  BEFORE DELETE ON "Source"
  FOR EACH ROW EXECUTE FUNCTION assert_source_not_last_of_published();

-- 6. A charity is publicly visible only once an editor has checked it against the official
--    register. Verification means a named person on a date — never one without the other.
ALTER TABLE "Charity"
  ADD CONSTRAINT "charity_verification_is_complete"
  CHECK (
    ("verifiedAt" IS NULL AND "verifiedById" IS NULL)
    OR ("verifiedAt" IS NOT NULL AND "verifiedById" IS NOT NULL)
  );

-- 7. Scores that must stay inside their scale.
ALTER TABLE "TreatmentCourse"
  ADD CONSTRAINT "adherence_rating_range"
  CHECK ("adherenceRating" IS NULL OR ("adherenceRating" BETWEEN 0 AND 10));

ALTER TABLE "SideEffectReport"
  ADD CONSTRAINT "side_effect_severity_range"
  CHECK ("severity" BETWEEN 1 AND 5);

ALTER TABLE "TreatmentCourse"
  ADD CONSTRAINT "treatment_ends_after_it_starts"
  CHECK ("endDate" IS NULL OR "endDate" >= "startDate");

-- 8. We store a year of birth, never a full date, and never a year that would make the
--    person a child. Age confirmation is 18+.
ALTER TABLE "Profile"
  ADD CONSTRAINT "year_of_birth_plausible"
  CHECK ("yearOfBirth" IS NULL OR ("yearOfBirth" BETWEEN 1900 AND (EXTRACT(YEAR FROM now())::int - 18)));
