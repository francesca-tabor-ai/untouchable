-- Close a hole in figure_image_requires_licence.
--
-- That constraint asked only whether *a* licence existed, not whether it belonged to the
-- image. So once a figure had one licensed photograph, the URL could be swapped for any
-- other — and the old credit stayed attached to it. A press photograph went in that way and
-- came out falsely attributed to a named photographer under a Creative Commons licence he
-- had never granted for it. That is worse than an uncredited image: it is a false statement
-- about someone's work, published under our name.
--
-- Two rules now, either of which alone would have stopped it.

-- 1. Images are served from our own origin, never hot-linked. A remote URL cannot be
--    licensed by us, and loading one would tell that server the IP address of everyone
--    reading a page about a named person's diagnosis. Same reasoning as the charity logos.
ALTER TABLE "PublicFigure"
  ADD CONSTRAINT "figure_image_is_self_hosted"
  CHECK ("imageUrl" IS NULL OR "imageUrl" LIKE '/%');

-- 2. The image and its licence move together or not at all.
CREATE OR REPLACE FUNCTION assert_image_and_licence_change_together()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."imageUrl" IS DISTINCT FROM OLD."imageUrl"
     AND NEW."imageLicence" IS NOT DISTINCT FROM OLD."imageLicence"
     AND NEW."imageUrl" IS NOT NULL THEN
    RAISE EXCEPTION
      'Changing the photograph for % without changing its licence would leave the previous credit attached to a different image.', OLD."slug"
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER figure_image_licence_moves_with_image
  BEFORE UPDATE OF "imageUrl", "imageLicence" ON "PublicFigure"
  FOR EACH ROW EXECUTE FUNCTION assert_image_and_licence_change_together();
