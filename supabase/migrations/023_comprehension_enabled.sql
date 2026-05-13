-- 중 난이도 문제에서 이해 확인 활성화 여부
-- 상: 무조건 표시 / 하: 무조건 숨김 / 중: 이 컬럼으로 제어
ALTER TABLE problems
  ADD COLUMN IF NOT EXISTS comprehension_enabled BOOLEAN DEFAULT NULL;
