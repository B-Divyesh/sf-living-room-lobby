CREATE TABLE IF NOT EXISTS rate_limits (
  bucket TEXT NOT NULL,
  client TEXT NOT NULL,
  window_started INTEGER NOT NULL,
  request_count INTEGER NOT NULL,
  PRIMARY KEY (bucket, client)
);

CREATE INDEX IF NOT EXISTS rate_limits_window_started_idx ON rate_limits(window_started);
