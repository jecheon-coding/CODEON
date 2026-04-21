-- Phase 1: status column for moderation workflow
ALTER TABLE problems
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published'
  CHECK (status IN ('draft', 'pending', 'published', 'hidden'));

-- Existing community problems → pending for retroactive review
UPDATE problems
  SET status = 'pending'
  WHERE is_community = TRUE AND status = 'published';

-- problem_type: output-only vs input/output
ALTER TABLE problems
  ADD COLUMN IF NOT EXISTS problem_type TEXT NOT NULL DEFAULT 'output'
  CHECK (problem_type IN ('output', 'io'));

-- Change difficulty_score range from 1-5 to 1/2/3 (하/중/상)
ALTER TABLE problem_ratings
  DROP CONSTRAINT IF EXISTS problem_ratings_difficulty_score_check;

ALTER TABLE problem_ratings
  ADD CONSTRAINT problem_ratings_difficulty_score_check
  CHECK (difficulty_score IN (1, 2, 3));
