-- problems 테이블에 표시 순서 컬럼 추가
ALTER TABLE problems
  ADD COLUMN IF NOT EXISTS display_order INT;

-- 기존 문제: 코스별로 id 순서대로 display_order 초기화
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY category ORDER BY id) AS rn
  FROM problems
)
UPDATE problems
SET display_order = ranked.rn
FROM ranked
WHERE problems.id = ranked.id
  AND problems.display_order IS NULL;
