-- Fix timestamp variable resolution in durable authentication throttling.

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
  v_now TIMESTAMPTZ := clock_timestamp();
BEGIN
  IF length(p_key_hash) <> 64 OR p_limit < 1 OR p_window_seconds < 1 OR p_block_seconds < 1 THEN
    RAISE EXCEPTION 'Invalid rate limit parameters';
  END IF;

  INSERT INTO security_rate_limits (key_hash, attempts, window_started_at, updated_at)
  VALUES (p_key_hash, 0, v_now, v_now)
  ON CONFLICT (key_hash) DO NOTHING;

  SELECT * INTO current_row
  FROM security_rate_limits
  WHERE key_hash = p_key_hash
  FOR UPDATE;

  IF current_row.blocked_until IS NOT NULL AND current_row.blocked_until > v_now THEN
    RETURN QUERY SELECT FALSE,
      GREATEST(1, CEIL(EXTRACT(EPOCH FROM (current_row.blocked_until - v_now)))::INTEGER),
      current_row.attempts;
    RETURN;
  END IF;

  IF v_now - current_row.window_started_at >= make_interval(secs => p_window_seconds) THEN
    current_row.attempts := 0;
    current_row.window_started_at := v_now;
    current_row.blocked_until := NULL;
  END IF;

  current_row.attempts := current_row.attempts + 1;
  IF current_row.attempts > p_limit THEN
    current_row.blocked_until := v_now + make_interval(secs => p_block_seconds);
  END IF;

  UPDATE security_rate_limits
  SET attempts = current_row.attempts,
      window_started_at = current_row.window_started_at,
      blocked_until = current_row.blocked_until,
      updated_at = v_now
  WHERE key_hash = p_key_hash;

  RETURN QUERY SELECT
    current_row.blocked_until IS NULL,
    CASE WHEN current_row.blocked_until IS NULL THEN 0 ELSE p_block_seconds END,
    current_row.attempts;
END;
$$;

REVOKE ALL ON FUNCTION consume_security_rate_limit(TEXT, INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION consume_security_rate_limit(TEXT, INTEGER, INTEGER, INTEGER) TO service_role;

-- Event triggers invoke this function internally; browser-facing roles do not need execute access.
REVOKE ALL ON FUNCTION rls_auto_enable() FROM PUBLIC, anon, authenticated;
