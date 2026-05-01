-- problems 테이블에 입력 생성기 코드, 정답 코드 컬럼 추가
ALTER TABLE problems
  ADD COLUMN IF NOT EXISTS gen_code text,
  ADD COLUMN IF NOT EXISTS sol_code text;
