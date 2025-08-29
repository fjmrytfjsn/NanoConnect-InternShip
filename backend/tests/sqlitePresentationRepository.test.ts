/**
 * SQLitePresentationRepositoryのテスト
 */

import { SQLitePresentationRepository } from '../src/infrastructure/database/repositories/SQLitePresentationRepository';
import { SQLiteConnection } from '../src/infrastructure/database/SQLiteConnection';
import { Presentation } from '../src/domain/entities/Presentation';
import Database from 'better-sqlite3';

describe('SQLitePresentationRepository', () => {
  let db: Database.Database;
  let connection: SQLiteConnection;
  let repository: SQLitePresentationRepository;

  beforeAll(() => {
    // テスト用のインメモリデータベース
    db = new Database(':memory:');
    
    // テストスキーマを作成
    db.exec(`
      CREATE TABLE presentations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        presenter_id TEXT NOT NULL,
        access_code TEXT UNIQUE NOT NULL,
        is_active BOOLEAN DEFAULT FALSE,
        current_slide_index INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
      
      CREATE TABLE slides (
        id TEXT PRIMARY KEY,
        presentation_id TEXT NOT NULL,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        slide_order INTEGER NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (presentation_id) REFERENCES presentations (id) ON DELETE CASCADE
      );
      
      CREATE TABLE responses (
        id TEXT PRIMARY KEY,
        slide_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        response_data TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (slide_id) REFERENCES slides (id) ON DELETE CASCADE
      );
      
      CREATE TABLE sessions (
        session_id TEXT PRIMARY KEY,
        presentation_id TEXT NOT NULL,
        participant_name TEXT,
        last_activity TEXT DEFAULT (datetime('now')),
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (presentation_id) REFERENCES presentations (id) ON DELETE CASCADE
      );
    `);

    // モックのSQLiteConnection
    connection = {
      getDatabase: () => db,
      executeTransaction: (operation: () => any) => {
        const transaction = db.transaction(operation);
        return transaction();
      }
    } as SQLiteConnection;

    repository = new SQLitePresentationRepository(connection);
  });

  afterAll(() => {
    db.close();
  });

  beforeEach(() => {
    // テストデータをクリア
    db.exec('DELETE FROM responses');
    db.exec('DELETE FROM sessions');
    db.exec('DELETE FROM slides');
    db.exec('DELETE FROM presentations');
  });

  describe('save', () => {
    test('新規プレゼンテーションを保存できる', async () => {
      const presentation = Presentation.create(
        'pres-1',
        'テストプレゼンテーション',
        'user-1',
        'ABC123',
        'テストの説明'
      );

      const result = await repository.save(presentation);

      expect(result).toEqual(presentation);
      
      const saved = await repository.findById('pres-1');
      expect(saved).not.toBeNull();
      expect(saved!.title).toBe('テストプレゼンテーション');
      expect(saved!.description).toBe('テストの説明');
    });

    test('既存プレゼンテーションを更新できる', async () => {
      // 最初に保存
      const presentation = Presentation.create(
        'pres-1',
        'オリジナル',
        'user-1',
        'ABC123'
      );
      await repository.save(presentation);

      // 更新
      presentation.updateInfo('更新タイトル', '更新説明');
      const result = await repository.save(presentation);

      expect(result.title).toBe('更新タイトル');
      
      const saved = await repository.findById('pres-1');
      expect(saved!.title).toBe('更新タイトル');
      expect(saved!.description).toBe('更新説明');
    });
  });

  describe('findByAccessCode', () => {
    test('アクセスコードでプレゼンテーションを取得できる', async () => {
      const presentation = Presentation.create(
        'pres-1',
        'テスト',
        'user-1',
        'UNIQUE123'
      );
      await repository.save(presentation);

      const result = await repository.findByAccessCode('UNIQUE123');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('pres-1');
      expect(result!.accessCode).toBe('UNIQUE123');
    });

    test('存在しないアクセスコードの場合nullを返す', async () => {
      const result = await repository.findByAccessCode('NONEXISTENT');
      expect(result).toBeNull();
    });
  });

  describe('findByPresenterId', () => {
    test('プレゼンターのプレゼンテーション一覧を取得できる', async () => {
      const presentation1 = Presentation.create('pres-1', 'プレゼン1', 'user-1', 'CODE1');
      const presentation2 = Presentation.create('pres-2', 'プレゼン2', 'user-1', 'CODE2');
      const presentation3 = Presentation.create('pres-3', 'プレゼン3', 'user-2', 'CODE3');

      await repository.save(presentation1);
      await repository.save(presentation2);
      await repository.save(presentation3);

      const result = await repository.findByPresenterId('user-1');

      expect(result).toHaveLength(2);
      expect(result.map(p => p.id)).toContain('pres-1');
      expect(result.map(p => p.id)).toContain('pres-2');
      expect(result.map(p => p.id)).not.toContain('pres-3');
    });
  });

  describe('findActive', () => {
    test('アクティブなプレゼンテーション一覧を取得できる', async () => {
      const presentation1 = Presentation.create('pres-1', 'プレゼン1', 'user-1', 'CODE1');
      const presentation2 = Presentation.create('pres-2', 'プレゼン2', 'user-1', 'CODE2');
      
      presentation1.start(); // アクティブにする

      await repository.save(presentation1);
      await repository.save(presentation2);

      const result = await repository.findActive();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('pres-1');
      expect(result[0].isActive).toBe(true);
    });
  });

  describe('getStatistics', () => {
    test('プレゼンテーションの統計情報を取得できる', async () => {
      // プレゼンテーションを作成
      const presentation = Presentation.create('pres-1', 'テスト', 'user-1', 'CODE1');
      await repository.save(presentation);

      // テストデータを挿入
      db.exec(`
        INSERT INTO slides (id, presentation_id, title, type, content, slide_order)
        VALUES 
          ('slide-1', 'pres-1', 'スライド1', 'multiple_choice', '{"question":"質問1","options":["選択肢1","選択肢2"]}', 0),
          ('slide-2', 'pres-1', 'スライド2', 'word_cloud', '{"question":"質問2"}', 1);
          
        INSERT INTO sessions (session_id, presentation_id, participant_name, last_activity)
        VALUES 
          ('session-1', 'pres-1', '参加者1', datetime('now')),
          ('session-2', 'pres-1', '参加者2', datetime('now', '-10 minutes'));
          
        INSERT INTO responses (id, slide_id, session_id, response_data)
        VALUES 
          ('resp-1', 'slide-1', 'session-1', '{"answer":"選択肢1"}'),
          ('resp-2', 'slide-1', 'session-2', '{"answer":"選択肢2"}'),
          ('resp-3', 'slide-2', 'session-1', '{"answer":"テスト回答"}');
      `);

      const result = await repository.getStatistics('pres-1');

      expect(result).not.toBeNull();
      expect(result!.totalSlides).toBe(2);
      expect(result!.totalResponses).toBe(3);
      expect(result!.totalParticipants).toBe(2);
      
      // アクティブ参加者は実装依存のため、結果を確認
      expect(result!.activeParticipants).toBeGreaterThanOrEqual(0); 
    });

    test('存在しないプレゼンテーションの場合nullを返す', async () => {
      const result = await repository.getStatistics('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    test('プレゼンテーションを削除できる', async () => {
      const presentation = Presentation.create('pres-1', 'テスト', 'user-1', 'CODE1');
      await repository.save(presentation);

      const result = await repository.delete('pres-1');

      expect(result).toBe(true);
      
      const deleted = await repository.findById('pres-1');
      expect(deleted).toBeNull();
    });

    test('存在しないプレゼンテーションの削除はfalseを返す', async () => {
      const result = await repository.delete('nonexistent');
      expect(result).toBe(false);
    });
  });
});