-- 학생 개인별 일일 목표 저장
-- NULL = 개인 설정 없음 → 사이트 전체 기본값(site_settings.default_daily_goal) 사용.
-- 기존에는 /goals, /dashboard의 +/- 버튼이 화면에만 반영되고 서버에 저장되지 않아
-- 새로고침하면 사라지는 버그가 있었다.

ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_goal INTEGER
  CHECK (daily_goal IS NULL OR (daily_goal BETWEEN 1 AND 20));
