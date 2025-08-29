-- 003_create_slides.sql
-- スライドテーブルの作成

CREATE TABLE slides (
  id TEXT PRIMARY KEY,
  presentation_id TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('multiple_choice', 'word_cloud', 'open_text')),
  content TEXT NOT NULL, -- JSON文字列
  slide_order INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (presentation_id) REFERENCES presentations (id) ON DELETE CASCADE
);

-- インデックスの作成
CREATE INDEX idx_slides_presentation_id ON slides(presentation_id);
CREATE INDEX idx_slides_order ON slides(presentation_id, slide_order);
CREATE INDEX idx_slides_type ON slides(type);
CREATE INDEX idx_slides_created_at ON slides(created_at);

-- 複合ユニーク制約（同一プレゼンテーション内でのスライド順序の重複を防ぐ）
CREATE UNIQUE INDEX idx_slides_presentation_order ON slides(presentation_id, slide_order);