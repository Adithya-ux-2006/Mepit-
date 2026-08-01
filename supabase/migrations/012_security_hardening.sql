-- Durable, privacy-preserving authentication throttling.

ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_user_id UUID;
CREATE UNIQUE INDEX IF NOT EXISTS users_auth_user_id_unique_idx
  ON users (auth_user_id) WHERE auth_user_id IS NOT NULL;
-- Only HMAC hashes are stored; raw IP addresses and email addresses never enter this table.

CREATE TABLE IF NOT EXISTS security_rate_limits (
  key_hash TEXT PRIMARY KEY CHECK (length(key_hash) = 64),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  blocked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE security_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE security_rate_limits FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION consume_security_rate_limit(
  p_key_hash TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER,
  p_block_seconds INTEGER
)
RETURNS TABLE (allowed BOOLEAN, retry_after_seconds INTEGER, current_attempts INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  current_row security_rate_limits%ROWTYPE;
  current_time TIMESTAMPTZ := clock_timestamp();
BEGIN
  IF length(p_key_hash) <> 64 OR p_limit < 1 OR p_window_seconds < 1 OR p_block_seconds < 1 THEN
    RAISE EXCEPTION 'Invalid rate limit parameters';
  END IF;

  INSERT INTO security_rate_limits (key_hash, attempts, window_started_at, updated_at)
  VALUES (p_key_hash, 0, current_time, current_time)
  ON CONFLICT (key_hash) DO NOTHING;

  SELECT * INTO current_row
  FROM security_rate_limits
  WHERE key_hash = p_key_hash
  FOR UPDATE;

  IF current_row.blocked_until IS NOT NULL AND current_row.blocked_until > current_time THEN
    RETURN QUERY SELECT FALSE,
      GREATEST(1, CEIL(EXTRACT(EPOCH FROM (current_row.blocked_until - current_time)))::INTEGER),
      current_row.attempts;
    RETURN;
  END IF;

  IF current_time - current_row.window_started_at >= make_interval(secs => p_window_seconds) THEN
    current_row.attempts := 0;
    current_row.window_started_at := current_time;
    current_row.blocked_until := NULL;
  END IF;

  current_row.attempts := current_row.attempts + 1;
  IF current_row.attempts > p_limit THEN
    current_row.blocked_until := current_time + make_interval(secs => p_block_seconds);
  END IF;

  UPDATE security_rate_limits
  SET attempts = current_row.attempts,
      window_started_at = current_row.window_started_at,
      blocked_until = current_row.blocked_until,
      updated_at = current_time
  WHERE key_hash = p_key_hash;

  RETURN QUERY SELECT
    current_row.blocked_until IS NULL,
    CASE WHEN current_row.blocked_until IS NULL THEN 0 ELSE p_block_seconds END,
    current_row.attempts;
END;
$$;

CREATE OR REPLACE FUNCTION clear_security_rate_limits(p_key_hashes TEXT[])
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  DELETE FROM security_rate_limits WHERE key_hash = ANY(p_key_hashes);
$$;

REVOKE ALL ON FUNCTION consume_security_rate_limit(TEXT, INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION clear_security_rate_limits(TEXT[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION consume_security_rate_limit(TEXT, INTEGER, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION clear_security_rate_limits(TEXT[]) TO service_role;

CREATE INDEX IF NOT EXISTS security_rate_limits_updated_at_idx
  ON security_rate_limits (updated_at);
