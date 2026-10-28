-- 학부모 월간 총평 "임시저장" 상태 추가
-- 기존에는 "저장"과 "임시저장" 버튼이 완전히 동일하게 동작해, 임시저장이라는
-- 개념이 실제로는 존재하지 않았다. 기본값 FALSE이므로 기존 총평은 전부
-- "최종 저장됨" 상태로 취급되어 학부모 화면 동작에 변화가 없다.

ALTER TABLE teacher_feedback ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT FALSE;
