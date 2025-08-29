/**
 * SQLiteSlideRepositoryのテスト
 */

import { SQLiteSlideRepository } from '../src/infrastructure/database/repositories/SQLiteSlideRepository';
import { SQLiteConnection } from '../src/infrastructure/database/SQLiteConnection';
import { Slide } from '../src/domain/entities/Slide';
import { SlideType } from '../src/domain/valueObjects/SlideType';
import Database from 'better-sqlite3';

describe('SQLiteSlideRepository', () => {
  let db: Database.Database;
  let connection: SQLiteConnection;
  let repository: SQLiteSlideRepository;

  beforeAll(() => {
    // テスト用のインメモリデータベース
    db = new Database(':memory:');
    
    // テストスキーマを作成
    db.exec(`
      CREATE TABLE slides (
        id TEXT PRIMARY KEY,
        presentation_id TEXT NOT NULL,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        slide_order INTEGER NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
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

    repository = new SQLiteSlideRepository(connection);
  });

  afterAll(() => {
    db.close();
  });

  beforeEach(() => {
    // テストデータをクリア
    db.exec('DELETE FROM slides');
  });

  describe('save', () => {
    test('新規スライドを保存できる', async () => {
      const slide = Slide.create(
        'slide-1',
        'presentation-1',
        SlideType.MULTIPLE_CHOICE,
        'テストスライド',
        'どちらが好きですか？',
        0,
        ['選択肢1', '選択肢2']
      );

      const result = await repository.save(slide);

      expect(result).toEqual(slide);
      
      const saved = await repository.findById('slide-1');
      expect(saved).not.toBeNull();
      expect(saved!.title).toBe('テストスライド');
      expect(saved!.question).toBe('どちらが好きですか？');
      expect(saved!.options).toEqual(['選択肢1', '選択肢2']);
    });

    test('既存スライドを更新できる', async () => {
      // 最初に保存
      const slide = Slide.create(
        'slide-1',
        'presentation-1',
        SlideType.WORD_CLOUD,
        'オリジナル',
        'オリジナル質問',
        0
      );
      await repository.save(slide);

      // 更新
      slide.update('更新タイトル', '更新質問');
      const result = await repository.save(slide);

      expect(result.title).toBe('更新タイトル');
      
      const saved = await repository.findById('slide-1');
      expect(saved!.title).toBe('更新タイトル');
      expect(saved!.question).toBe('更新質問');
    });
  });

  describe('findByPresentationId', () => {
    test('プレゼンテーションIDでスライド一覧を取得できる', async () => {
      const slide1 = Slide.create('slide-1', 'pres-1', SlideType.MULTIPLE_CHOICE, 'スライド1', '質問1', 0, ['A', 'B']);
      const slide2 = Slide.create('slide-2', 'pres-1', SlideType.WORD_CLOUD, 'スライド2', '質問2', 1);
      const slide3 = Slide.create('slide-3', 'pres-2', SlideType.OPEN_TEXT, 'スライド3', '質問3', 0);

      await repository.save(slide1);
      await repository.save(slide2);
      await repository.save(slide3);

      const result = await repository.findByPresentationId('pres-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('slide-1'); // 順序でソートされる
      expect(result[1].id).toBe('slide-2');
    });
  });

  describe('findByPresentationIdAndOrder', () => {
    test('プレゼンテーションIDと順序でスライドを取得できる', async () => {
      const slide = Slide.create('slide-1', 'pres-1', SlideType.WORD_CLOUD, 'テスト', '質問', 2);
      await repository.save(slide);

      const result = await repository.findByPresentationIdAndOrder('pres-1', 2);

      expect(result).not.toBeNull();
      expect(result!.id).toBe('slide-1');
      expect(result!.slideOrder).toBe(2);
    });

    test('存在しない場合はnullを返す', async () => {
      const result = await repository.findByPresentationIdAndOrder('pres-1', 99);
      expect(result).toBeNull();
    });
  });

  describe('getMaxOrderByPresentationId', () => {
    test('プレゼンテーション内の最大順序を取得できる', async () => {
      const slide1 = Slide.create('slide-1', 'pres-1', SlideType.WORD_CLOUD, 'スライド1', '質問1', 0);
      const slide2 = Slide.create('slide-2', 'pres-1', SlideType.WORD_CLOUD, 'スライド2', '質問2', 3);
      const slide3 = Slide.create('slide-3', 'pres-1', SlideType.WORD_CLOUD, 'スライド3', '質問3', 1);

      await repository.save(slide1);
      await repository.save(slide2);
      await repository.save(slide3);

      const result = await repository.getMaxOrderByPresentationId('pres-1');

      expect(result).toBe(3);
    });

    test('スライドが存在しない場合は-1を返す', async () => {
      const result = await repository.getMaxOrderByPresentationId('nonexistent');
      expect(result).toBe(-1);
    });
  });

  describe('updateSlideOrder', () => {
    test('スライドの順序を後ろに移動できる', async () => {
      // 初期スライド作成 (0, 1, 2, 3)
      for (let i = 0; i < 4; i++) {
        const slide = Slide.create(`slide-${i}`, 'pres-1', SlideType.WORD_CLOUD, `スライド${i}`, `質問${i}`, i);
        await repository.save(slide);
      }

      // スライド0を位置3に移動
      await repository.updateSlideOrder('slide-0', 3);

      // 順序確認
      const slides = await repository.findByPresentationId('pres-1');
      const orders = slides.map(s => ({ id: s.id, order: s.slideOrder }));

      expect(orders.find(o => o.id === 'slide-0')?.order).toBe(3);
      expect(orders.find(o => o.id === 'slide-1')?.order).toBe(0); // 前に詰められる
      expect(orders.find(o => o.id === 'slide-2')?.order).toBe(1);
      expect(orders.find(o => o.id === 'slide-3')?.order).toBe(2);
    });

    test('スライドの順序を前に移動できる', async () => {
      // 初期スライド作成 (0, 1, 2, 3)
      for (let i = 0; i < 4; i++) {
        const slide = Slide.create(`slide-${i}`, 'pres-1', SlideType.WORD_CLOUD, `スライド${i}`, `質問${i}`, i);
        await repository.save(slide);
      }

      // スライド3を位置1に移動
      await repository.updateSlideOrder('slide-3', 1);

      // 順序確認
      const slides = await repository.findByPresentationId('pres-1');
      const orders = slides.map(s => ({ id: s.id, order: s.slideOrder }));

      expect(orders.find(o => o.id === 'slide-0')?.order).toBe(0);
      expect(orders.find(o => o.id === 'slide-1')?.order).toBe(2); // 後ろにずれる
      expect(orders.find(o => o.id === 'slide-2')?.order).toBe(3);
      expect(orders.find(o => o.id === 'slide-3')?.order).toBe(1);
    });
  });

  describe('updateSlidesOrder', () => {
    test('複数スライドの順序を一括更新できる', async () => {
      // 初期スライド作成
      for (let i = 0; i < 3; i++) {
        const slide = Slide.create(`slide-${i}`, 'pres-1', SlideType.WORD_CLOUD, `スライド${i}`, `質問${i}`, i);
        await repository.save(slide);
      }

      // 順序を入れ替え
      await repository.updateSlidesOrder([
        { slideId: 'slide-0', order: 2 },
        { slideId: 'slide-1', order: 0 },
        { slideId: 'slide-2', order: 1 }
      ]);

      // 順序確認
      const slides = await repository.findByPresentationId('pres-1');
      const orders = slides.map(s => ({ id: s.id, order: s.slideOrder }));

      expect(orders.find(o => o.id === 'slide-0')?.order).toBe(2);
      expect(orders.find(o => o.id === 'slide-1')?.order).toBe(0);
      expect(orders.find(o => o.id === 'slide-2')?.order).toBe(1);
    });
  });

  describe('countByPresentationId', () => {
    test('プレゼンテーション内のスライド数を取得できる', async () => {
      for (let i = 0; i < 3; i++) {
        const slide = Slide.create(`slide-${i}`, 'pres-1', SlideType.WORD_CLOUD, `スライド${i}`, `質問${i}`, i);
        await repository.save(slide);
      }

      const result = await repository.countByPresentationId('pres-1');
      expect(result).toBe(3);
    });

    test('スライドが存在しない場合は0を返す', async () => {
      const result = await repository.countByPresentationId('nonexistent');
      expect(result).toBe(0);
    });
  });

  describe('deleteByPresentationId', () => {
    test('プレゼンテーションのすべてのスライドを削除できる', async () => {
      // 2つのプレゼンテーションのスライドを作成
      const slide1 = Slide.create('slide-1', 'pres-1', SlideType.WORD_CLOUD, 'スライド1', '質問1', 0);
      const slide2 = Slide.create('slide-2', 'pres-1', SlideType.WORD_CLOUD, 'スライド2', '質問2', 1);
      const slide3 = Slide.create('slide-3', 'pres-2', SlideType.WORD_CLOUD, 'スライド3', '質問3', 0);

      await repository.save(slide1);
      await repository.save(slide2);
      await repository.save(slide3);

      const deletedCount = await repository.deleteByPresentationId('pres-1');

      expect(deletedCount).toBe(2);
      
      // pres-1のスライドが削除されていることを確認
      const remainingSlides = await repository.findByPresentationId('pres-1');
      expect(remainingSlides).toHaveLength(0);
      
      // pres-2のスライドは残っていることを確認
      const pres2Slides = await repository.findByPresentationId('pres-2');
      expect(pres2Slides).toHaveLength(1);
    });
  });
});