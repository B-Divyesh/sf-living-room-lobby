CREATE TABLE IF NOT EXISTS demo_workspaces (
  id TEXT PRIMARY KEY NOT NULL,
  state_json TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS demo_workspaces_expires_at_idx ON demo_workspaces(expires_at);
