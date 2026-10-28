-- 커뮤니티(도전) 문제 반려 사유 저장
-- 기존에는 관리자 화면에서 반려 사유를 입력해도 API가 받기만 하고 저장하지 않아
-- 반려당한 학생이 왜 반려됐는지 알 방법이 없었다.

ALTER TABLE problems ADD COLUMN IF NOT EXISTS reject_reason TEXT;
