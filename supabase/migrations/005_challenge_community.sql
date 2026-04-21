-- ──────────────────────────────────────────────────────────────────────────────
-- Migration 005: 도전 문제 커뮤니티 기능
--   - problems 테이블에 author / community / like_count / solve_count 컬럼 추가
--   - problem_likes, problem_ratings, problem_reactions 테이블 신규 생성
--   - 트리거: like_count / solve_count / community_difficulty_avg 자동 동기화
-- ──────────────────────────────────────────────────────────────────────────────

-- 1. problems 테이블 확장 ───────────────────────────────────────────────────────
ALTER TABLE problems
  ADD COLUMN IF NOT EXISTS author_user_id           UUID        REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_community             BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS like_count               INT         NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS solve_count              INT         NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS community_difficulty_avg NUMERIC(3,2);

-- author_user_id = NULL  → 관리자(공식) 문제
-- is_community  = TRUE   → 학생이 직접 만든 문제

-- 2. 좋아요 테이블 ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS problem_likes (
  problem_id  TEXT        NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (problem_id, user_id)
);

-- 3. 난이도 평가 테이블 (정답 제출 후에만 허용 — API 레이어에서 강제) ────────
CREATE TABLE IF NOT EXISTS problem_ratings (
  problem_id       TEXT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  difficulty_score INT  NOT NULL CHECK (difficulty_score BETWEEN 1 AND 5),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (problem_id, user_id)
);

-- 4. 반응 태그 테이블 ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS problem_reactions (
  problem_id    TEXT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  reaction_type TEXT NOT NULL
    CHECK (reaction_type IN ('재밌어요', '설명이 좋아요', '창의적이에요', '헷갈려요')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (problem_id, user_id, reaction_type)
);

-- 5. 인덱스 ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_problems_author_user   ON problems (author_user_id);
CREATE INDEX IF NOT EXISTS idx_problems_is_community  ON problems (is_community);
CREATE INDEX IF NOT EXISTS idx_problems_like_count    ON problems (like_count DESC);
CREATE INDEX IF NOT EXISTS idx_problem_likes_problem  ON problem_likes (problem_id);
CREATE INDEX IF NOT EXISTS idx_problem_likes_user     ON problem_likes (user_id);
CREATE INDEX IF NOT EXISTS idx_problem_ratings_problem ON problem_ratings (problem_id);
CREATE INDEX IF NOT EXISTS idx_problem_reactions_problem ON problem_reactions (problem_id);

-- 6. RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE problem_likes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE problem_ratings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE problem_reactions ENABLE ROW LEVEL SECURITY;

-- problem_likes
CREATE POLICY "read likes"   ON problem_likes FOR SELECT USING (true);
CREATE POLICY "self like"    ON problem_likes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "self unlike"  ON problem_likes FOR DELETE USING  (user_id = auth.uid());

-- problem_ratings
CREATE POLICY "read ratings"       ON problem_ratings FOR SELECT USING (true);
CREATE POLICY "self rate"          ON problem_ratings FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "self update rate"   ON problem_ratings FOR UPDATE USING (user_id = auth.uid());

-- problem_reactions
CREATE POLICY "read reactions"  ON problem_reactions FOR SELECT USING (true);
CREATE POLICY "self react"      ON problem_reactions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "self unreact"    ON problem_reactions FOR DELETE USING  (user_id = auth.uid());

-- 7. 트리거: like_count 동기화 ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION sync_problem_like_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE problems SET like_count = like_count + 1 WHERE id = NEW.problem_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE problems SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.problem_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_like_count
  AFTER INSERT OR DELETE ON problem_likes
  FOR EACH ROW EXECUTE FUNCTION sync_problem_like_count();

-- 8. 트리거: solve_count 동기화 (고유 정답자 수) ──────────────────────────────
CREATE OR REPLACE FUNCTION sync_problem_solve_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_correct = TRUE THEN
    UPDATE problems SET solve_count = (
      SELECT COUNT(DISTINCT user_id)
      FROM submissions
      WHERE problem_id = NEW.problem_id AND is_correct = TRUE
    ) WHERE id = NEW.problem_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_solve_count
  AFTER INSERT ON submissions
  FOR EACH ROW EXECUTE FUNCTION sync_problem_solve_count();

-- 9. 트리거: community_difficulty_avg 동기화 ──────────────────────────────────
CREATE OR REPLACE FUNCTION sync_difficulty_avg()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE target_id TEXT;
BEGIN
  target_id := COALESCE(NEW.problem_id, OLD.problem_id);
  UPDATE problems SET community_difficulty_avg = (
    SELECT AVG(difficulty_score)::NUMERIC(3,2)
    FROM problem_ratings
    WHERE problem_id = target_id
  ) WHERE id = target_id;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_difficulty_avg
  AFTER INSERT OR UPDATE OR DELETE ON problem_ratings
  FOR EACH ROW EXECUTE FUNCTION sync_difficulty_avg();
