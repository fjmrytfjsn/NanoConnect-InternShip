/**
 * スライドユースケース統合テスト
 * スライドCRUD操作の完全なテスト
 */

import { SQLiteSlideRepository } from '../src/infrastructure/database/repositories/SQLiteSlideRepository';
import { SQLitePresentationRepository } from '../src/infrastructure/database/repositories/SQLitePresentationRepository';
import { SQLiteConnection } from '../src/infrastructure/database/SQLiteConnection';
import { CreateSlideUseCase } from '../src/application/useCases/slide/CreateSlideUseCase';
import { GetSlideUseCase } from '../src/application/useCases/slide/GetSlideUseCase';
import { UpdateSlideUseCase } from '../src/application/useCases/slide/UpdateSlideUseCase';
import { DeleteSlideUseCase } from '../src/application/useCases/slide/DeleteSlideUseCase';
import { ReorderSlidesUseCase } from '../src/application/useCases/slide/ReorderSlidesUseCase';
import { Presentation } from '../src/domain/entities/Presentation';
import { AccessCode } from '../src/domain/valueObjects/AccessCode';
import Database from 'better-sqlite3';

describe('スライドユースケース統合テスト', () => {
  let db: Database.Database;
  let slideRepository: SQLiteSlideRepository;
  let presentationRepository: SQLitePresentationRepository;
  let createSlideUseCase: CreateSlideUseCase;
  let getSlideUseCase: GetSlideUseCase;
  let updateSlideUseCase: UpdateSlideUseCase;
  let deleteSlideUseCase: DeleteSlideUseCase;
  let reorderSlidesUseCase: ReorderSlidesUseCase;
  let testPresentationId: string;

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
        FOREIGN KEY (presentation_id) REFERENCES presentations(id) ON DELETE CASCADE
      );
    `);

    // カスタム接続オブジェクトを作成
    const customConnection = {
      getDatabase: () => db,
      healthCheck: () => ({ status: 'healthy' })
    } as SQLiteConnection;
    
    slideRepository = new SQLiteSlideRepository(customConnection);
    presentationRepository = new SQLitePresentationRepository(customConnection);
    
    createSlideUseCase = new CreateSlideUseCase(slideRepository, presentationRepository);
    getSlideUseCase = new GetSlideUseCase(slideRepository, presentationRepository);
    updateSlideUseCase = new UpdateSlideUseCase(slideRepository, presentationRepository);
    deleteSlideUseCase = new DeleteSlideUseCase(slideRepository, presentationRepository);
    reorderSlidesUseCase = new ReorderSlidesUseCase(slideRepository, presentationRepository);
  });

  beforeEach(async () => {
    // テストデータをクリア
    db.exec('DELETE FROM slides');
    db.exec('DELETE FROM presentations');

    // テスト用プレゼンテーションを作成
    const testPresentation = Presentation.create(
      'test-presenter-1',
      'テスト用プレゼンテーション',
      'テスト用プレゼンテーションの説明',
      AccessCode.generate().value
    );
    await presentationRepository.save(testPresentation);
    testPresentationId = testPresentation.id;
  });

  afterAll(() => {
    db.close();
  });

  describe('CreateSlideUseCase', () => {
    it('多肢選択式スライドを正常に作成できる', async () => {
      const requestDto = {
        presentationId: testPresentationId,
        title: 'テスト多肢選択スライド',
        type: 'multiple_choice' as const,
        content: {
          question: 'どちらが好きですか？',
          options: ['選択肢A', '選択肢B', '選択肢C'],
          settings: {
            allowMultiple: false,
            showResults: true
          }
        },
        order: 0
      };

      const result = await createSlideUseCase.execute(requestDto);

      expect(result.success).toBe(true);
      expect(result.slide.title).toBe('テスト多肢選択スライド');
      expect(result.slide.type).toBe('multiple_choice');
      expect(result.slide.content.options).toEqual(['選択肢A', '選択肢B', '選択肢C']);
    });

    it('ワードクラウドスライドを正常に作成できる', async () => {
      const requestDto = {
        presentationId: testPresentationId,
        title: 'テストワードクラウドスライド',
        type: 'word_cloud' as const,
        content: {
          question: '今日の気持ちを一言で表してください',
          settings: {
            maxWords: 50
          }
        },
        order: 0
      };

      const result = await createSlideUseCase.execute(requestDto);

      expect(result.success).toBe(true);
      expect(result.slide.title).toBe('テストワードクラウドスライド');
      expect(result.slide.type).toBe('word_cloud');
    });

    it('存在しないプレゼンテーションIDでエラーが発生する', async () => {
      const requestDto = {
        presentationId: 'non-existent-presentation',
        title: 'テストスライド',
        type: 'multiple_choice' as const,
        content: {
          question: 'テスト質問',
          options: ['A', 'B']
        },
        order: 0
      };

      const result = await createSlideUseCase.execute(requestDto);

      expect(result.success).toBe(false);
      expect(result.message).toContain('プレゼンテーションが見つかりません');
    });

    it('多肢選択式で選択肢が不足している場合エラーが発生する', async () => {
      const requestDto = {
        presentationId: testPresentationId,
        title: 'テストスライド',
        type: 'multiple_choice' as const,
        content: {
          question: 'テスト質問',
          options: ['A'] // 1つだけ
        },
        order: 0
      };

      const result = await createSlideUseCase.execute(requestDto);

      expect(result.success).toBe(false);
      expect(result.message).toContain('2つ以上の選択肢が必要');
    });
  });

  describe('GetSlideUseCase', () => {
    let testSlideId: string;

    beforeEach(async () => {
      // テスト用スライドを作成
      const createResult = await createSlideUseCase.execute({
        presentationId: testPresentationId,
        title: 'テスト取得スライド',
        type: 'multiple_choice',
        content: {
          question: 'テスト質問',
          options: ['A', 'B']
        },
        order: 0
      });
      testSlideId = createResult.slide.id;
    });

    it('スライドIDでスライドを取得できる', async () => {
      const result = await getSlideUseCase.getSlideById({ slideId: testSlideId });

      expect(result.success).toBe(true);
      expect(result.data.id).toBe(testSlideId);
      expect(result.data.title).toBe('テスト取得スライド');
    });

    it('プレゼンテーションIDでスライド一覧を取得できる', async () => {
      // 複数スライドを作成
      await createSlideUseCase.execute({
        presentationId: testPresentationId,
        title: '2番目のスライド',
        type: 'word_cloud',
        content: { question: '2番目の質問' },
        order: 1
      });

      const result = await getSlideUseCase.getSlidesByPresentationId({ 
        presentationId: testPresentationId 
      });

      expect(result.success).toBe(true);
      expect(result.data.length).toBe(2);
      expect(result.data[0].order).toBe(0);
      expect(result.data[1].order).toBe(1);
    });

    it('存在しないスライドIDでエラーが発生する', async () => {
      const result = await getSlideUseCase.getSlideById({ slideId: 'non-existent-slide' });

      expect(result.success).toBe(false);
      expect(result.message).toContain('スライドが見つかりません');
    });
  });

  describe('UpdateSlideUseCase', () => {
    let testSlideId: string;

    beforeEach(async () => {
      const createResult = await createSlideUseCase.execute({
        presentationId: testPresentationId,
        title: '更新前タイトル',
        type: 'multiple_choice',
        content: {
          question: '更新前質問',
          options: ['A', 'B']
        },
        order: 0
      });
      testSlideId = createResult.slide.id;
    });

    it('スライドのタイトルを更新できる', async () => {
      const result = await updateSlideUseCase.execute({
        slideId: testSlideId,
        title: '更新後タイトル'
      });

      expect(result.success).toBe(true);

      // 更新確認
      const updatedSlide = await getSlideUseCase.getSlideById({ slideId: testSlideId });
      expect(updatedSlide.data.title).toBe('更新後タイトル');
    });

    it('存在しないスライドIDでエラーが発生する', async () => {
      const result = await updateSlideUseCase.execute({
        slideId: 'non-existent-slide',
        title: '新しいタイトル'
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('スライドが見つかりません');
    });
  });

  describe('DeleteSlideUseCase', () => {
    let testSlideId1: string;

    beforeEach(async () => {
      // 2つのスライドを作成（削除制限テスト用）
      const result1 = await createSlideUseCase.execute({
        presentationId: testPresentationId,
        title: 'スライド1',
        type: 'multiple_choice',
        content: { question: '質問1', options: ['A', 'B'] },
        order: 0
      });
      await createSlideUseCase.execute({
        presentationId: testPresentationId,
        title: 'スライド2',
        type: 'multiple_choice',
        content: { question: '質問2', options: ['C', 'D'] },
        order: 1
      });
      testSlideId1 = result1.slide.id;
    });

    it('スライドを正常に削除できる', async () => {
      const result = await deleteSlideUseCase.execute({ slideId: testSlideId1 });

      expect(result.success).toBe(true);

      // 削除確認
      const deletedSlide = await getSlideUseCase.getSlideById({ slideId: testSlideId1 });
      expect(deletedSlide.success).toBe(false);
    });

    it('存在しないスライドIDでエラーが発生する', async () => {
      const result = await deleteSlideUseCase.execute({ slideId: 'non-existent-slide' });

      expect(result.success).toBe(false);
      expect(result.message).toContain('スライドが見つかりません');
    });
  });

  describe('ReorderSlidesUseCase', () => {
    let testSlideIds: string[];

    beforeEach(async () => {
      // 3つのスライドを作成
      const results = await Promise.all([
        createSlideUseCase.execute({
          presentationId: testPresentationId,
          title: 'スライド0',
          type: 'multiple_choice',
          content: { question: '質問0', options: ['A', 'B'] },
          order: 0
        }),
        createSlideUseCase.execute({
          presentationId: testPresentationId,
          title: 'スライド1',
          type: 'multiple_choice',
          content: { question: '質問1', options: ['C', 'D'] },
          order: 1
        }),
        createSlideUseCase.execute({
          presentationId: testPresentationId,
          title: 'スライド2',
          type: 'multiple_choice',
          content: { question: '質問2', options: ['E', 'F'] },
          order: 2
        })
      ]);
      testSlideIds = results.map(r => r.slide.id);
    });

    it('スライドの順序を正常に変更できる', async () => {
      // 順序を逆にする
      const result = await reorderSlidesUseCase.execute({
        presentationId: testPresentationId,
        slideOrders: [
          { slideId: testSlideIds[2], order: 0 },
          { slideId: testSlideIds[1], order: 1 },
          { slideId: testSlideIds[0], order: 2 }
        ]
      });

      expect(result.success).toBe(true);

      // 順序変更確認
      const slides = await getSlideUseCase.getSlidesByPresentationId({ 
        presentationId: testPresentationId 
      });
      expect(slides.data[0].title).toBe('スライド2');
      expect(slides.data[1].title).toBe('スライド1');
      expect(slides.data[2].title).toBe('スライド0');
    });

    it('重複する順序でエラーが発生する', async () => {
      const result = await reorderSlidesUseCase.execute({
        presentationId: testPresentationId,
        slideOrders: [
          { slideId: testSlideIds[0], order: 0 },
          { slideId: testSlideIds[1], order: 0 }, // 重複
          { slideId: testSlideIds[2], order: 2 }
        ]
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('重複する順序');
    });
  });
});