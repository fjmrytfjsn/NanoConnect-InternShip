-- 002_create_presentations.sql
-- プレゼンテーションテーブルの作成

CREATE TABLE presentations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  presenter_id TEXT NOT NULL,
  access_code TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  current_slide_index INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (presenter_id) REFERENCES users (id) ON DELETE CASCADE
);

-- インデックスの作成
CREATE INDEX idx_presentations_access_code ON presentations(access_code);
CREATE INDEX idx_presentations_presenter_id ON presentations(presenter_id);
CREATE INDEX idx_presentations_is_active ON presentations(is_active);
CREATE INDEX idx_presentations_created_at ON presentations(created_at);