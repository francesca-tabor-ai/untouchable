-- A story can need support contacts that its condition does not imply.
--
-- Sensitivity has lived on the condition, so a story about a ruptured brain aneurysm could
-- not carry suicide signposting without marking brain aneurysms a sensitive topic for every
-- reader who has one. An editor's only options were to publish the passage with no
-- signposting, or to cut it. Both are wrong; the second is what actually happened.
ALTER TABLE "Story" ADD COLUMN "needsSupportSignposting" BOOLEAN NOT NULL DEFAULT false;
