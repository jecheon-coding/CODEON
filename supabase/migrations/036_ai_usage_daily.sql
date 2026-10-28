-- AI(Gemini) 호출 사용량 제한 — 로그인만 하면 /api/tutor, /api/comprehension/question,
-- /api/comprehension/evaluate를 무제한 호출할 수 있어 악용 시 AI 비용이 그대로
-- 새어나갈 수 있던 문제를 막기 위한 일일 사용량 집계 테이블 + 원자적 증가 함수.

CREATE TABLE IF NOT EXISTS ai_usage_daily (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  endpoint   TEXT NOT NULL,
  count      INT  NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, usage_date, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_daily_date ON ai_usage_daily (usage_date);

-- 동시 요청에도 정확히 집계되도록 DB 쪽에서 원자적으로 증가시키고 증가 후 값을 반환한다.
CREATE OR REPLACE FUNCTION increment_ai_usage(p_user_id UUID, p_endpoint TEXT)
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE new_count INT;
BEGIN
  INSERT INTO ai_usage_daily (user_id, usage_date, endpoint, count)
  VALUES (p_user_id, CURRENT_DATE, p_endpoint, 1)
  ON CONFLICT (user_id, usage_date, endpoint)
  DO UPDATE SET count = ai_usage_daily.count + 1
  RETURNING count INTO new_count;
  RETURN new_count;
END;
$$;
