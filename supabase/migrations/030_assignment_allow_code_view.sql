-- 과제에 제출 코드 보기 허용 여부 컬럼 추가 (기본값: 허용)
ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS allow_code_view BOOLEAN NOT NULL DEFAULT true;
