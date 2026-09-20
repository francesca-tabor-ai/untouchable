-- Match support signposting to the topic.
--
-- Support was hard-wired: crisis contacts on everything, plus a substance block when a
-- flagged *medicine* was linked to the story. So an addiction story without a medicine
-- showed no FRANK, and a story about childhood sexual abuse would have offered Samaritans
-- and nothing else. Both are the same failure — the page knowing what it is about and not
-- using it.
ALTER TABLE "Condition" ADD COLUMN "supportTopic" TEXT;
