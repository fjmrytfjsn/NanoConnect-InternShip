-- 005_create_sessions.sql
-- セッションテーブルの作成（参加者管理）

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  presentation_id TEXT NOT NULL,
  participant_name TEXT,
  ip_address TEXT,
  user_agent TEXT,
  joined_at TEXT DEFAULT (datetime('now')),
  last_activity TEXT DEFAULT (datetime('now')),
  is_active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (presentation_id) REFERENCES presentations (id) ON DELETE CASCADE
);

-- インデックスの作成
CREATE INDEX idx_sessions_presentation_id ON sessions(presentation_id);
CREATE INDEX idx_sessions_is_active ON sessions(is_active);
CREATE INDEX idx_sessions_last_activity ON sessions(last_activity);
CREATE INDEX idx_sessions_joined_at ON sessions(joined_at);