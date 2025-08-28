-- 004_create_responses.sql
-- 回答テーブルの作成

CREATE TABLE responses (
  id TEXT PRIMARY KEY,
  slide_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  response_data TEXT NOT NULL, -- JSON文字列
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (slide_id) REFERENCES slides (id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
);

-- インデックスの作成
CREATE INDEX idx_responses_slide_id ON responses(slide_id);
CREATE INDEX idx_responses_session_id ON responses(session_id);
CREATE INDEX idx_responses_created_at ON responses(created_at);

-- 複合ユニーク制約（同一セッションから同一スライドへの重複回答を防ぐ）
CREATE UNIQUE INDEX idx_responses_slide_session ON responses(slide_id, session_id);