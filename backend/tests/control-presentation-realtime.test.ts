/**
 * プレゼンテーション制御ユースケースのテスト
 * リアルタイム制御機能のビジネスロジックをテスト
 */

import { ControlPresentationRealtimeUseCase } from '../src/application/useCases/presentation/ControlPresentationRealtimeUseCase';
import { SQLiteConnection } from '../src/infrastructure/database/SQLiteConnection';
import { SQLitePresentationRepository } from '../src/infrastructure/database/repositories/SQLitePresentationRepository';
import { SQLiteSlideRepository } from '../src/infrastructure/database/repositories/SQLiteSlideRepository';
import { Presentation } from '../src/domain/entities/Presentation';
import { Slide } from '../src/domain/entities/Slide';
import { SlideType } from '../src/domain/valueObjects/SlideType';

describe('プレゼンテーション制御ユースケーステスト', () => {
  let useCase: ControlPresentationRealtimeUseCase;
  let presentationRepository: SQLitePresentationRepository;
  let slideRepository: SQLiteSlideRepository;
  let database: SQLiteConnection;

  const testPresentationId = 'test-presentation-id';
  const testPresenterId = 'test-presenter-id';
  const otherUserId = 'other-user-id';

  beforeEach(async () => {
    // データベースの初期化（インメモリ）
    database = SQLiteConnection.getInstance();
    await database.initialize();

    // リポジトリの初期化
    presentationRepository = new SQLitePresentationRepository(database);
    slideRepository = new SQLiteSlideRepository(database);

    // ユースケースの初期化
    useCase = new ControlPresentationRealtimeUseCase(presentationRepository, slideRepository);

    // テスト用データのセットアップ
    await setupTestData();
  });

  afterEach(async () => {
    await database.close();
  });

  /**
   * テスト用データのセットアップ
   */
  async function setupTestData(): Promise<void> {
    // テスト用プレゼンテーション作成
    const presentation = Presentation.create(
      testPresentationId,
      'テストプレゼンテーション',
      testPresenterId,
      'ABC123'
    );
    await presentationRepository.save(presentation);

    // テスト用スライド作成
    const slide1 = Slide.create(
      'slide-1',
      testPresentationId,
      SlideType.MULTIPLE_CHOICE,
      'スライド1',
      '質問1',
      0,
      ['選択肢1', '選択肢2']
    );
    const slide2 = Slide.create(
      'slide-2',
      testPresentationId,
      SlideType.WORD_CLOUD,
      'スライド2',
      '質問2',
      1
    );
    const slide3 = Slide.create(
      'slide-3',
      testPresentationId,
      SlideType.OPEN_TEXT,
      'スライド3',
      '質問3',
      2
    );

    await slideRepository.save(slide1);
    await slideRepository.save(slide2);
    await slideRepository.save(slide3);
  }

  describe('プレゼンテーション開始', () => {
    test('プレゼンテーションを正常に開始できる', async () => {
      const result = await useCase.startPresentation({
        presentationId: testPresentationId,
        presenterId: testPresenterId,
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('プレゼンテーションを開始しました');
      expect(result.presentationId).toBe(testPresentationId);
      expect(result.currentSlideIndex).toBe(0);
      expect(result.totalSlides).toBe(3);
      expect(result.isActive).toBe(true);

      // データベースで状態確認
      const presentation = await presentationRepository.findById(testPresentationId);
      expect(presentation?.isActive).toBe(true);
      expect(presentation?.currentSlideIndex).toBe(0);
    });

    test('存在しないプレゼンテーションで失敗する', async () => {
      const result = await useCase.startPresentation({
        presentationId: 'non-existent-id',
        presenterId: testPresenterId,
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('プレゼンテーションが見つかりません');
      expect(result.presentationId).toBe('non-existent-id');
    });

    test('権限のないユーザーで失敗する', async () => {
      const result = await useCase.startPresentation({
        presentationId: testPresentationId,
        presenterId: otherUserId,
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('このプレゼンテーションを制御する権限がありません');
      expect(result.presentationId).toBe(testPresentationId);
    });

    test('スライドが存在しない場合に失敗する', async () => {
      // スライドなしのプレゼンテーション作成
      const emptyPresentationId = 'empty-presentation-id';
      const emptyPresentation = Presentation.create(
        emptyPresentationId,
        '空のプレゼンテーション',
        testPresenterId,
        'DEF456'
      );
      await presentationRepository.save(emptyPresentation);

      const result = await useCase.startPresentation({
        presentationId: emptyPresentationId,
        presenterId: testPresenterId,
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('スライドが存在しないため、プレゼンテーションを開始できません');
      expect(result.presentationId).toBe(emptyPresentationId);
    });
  });

  describe('プレゼンテーション停止', () => {
    test('プレゼンテーションを正常に停止できる', async () => {
      // まず開始
      await useCase.startPresentation({
        presentationId: testPresentationId,
        presenterId: testPresenterId,
      });

      // 停止
      const result = await useCase.stopPresentation({
        presentationId: testPresentationId,
        presenterId: testPresenterId,
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('プレゼンテーションを停止しました');
      expect(result.presentationId).toBe(testPresentationId);
      expect(result.isActive).toBe(false);

      // データベースで状態確認
      const presentation = await presentationRepository.findById(testPresentationId);
      expect(presentation?.isActive).toBe(false);
    });

    test('存在しないプレゼンテーションで失敗する', async () => {
      const result = await useCase.stopPresentation({
        presentationId: 'non-existent-id',
        presenterId: testPresenterId,
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('プレゼンテーションが見つかりません');
    });

    test('権限のないユーザーで失敗する', async () => {
      const result = await useCase.stopPresentation({
        presentationId: testPresentationId,
        presenterId: otherUserId,
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('このプレゼンテーションを制御する権限がありません');
    });
  });

  describe('スライド移動', () => {
    test('指定スライドに正常に移動できる', async () => {
      const result = await useCase.goToSlide({
        presentationId: testPresentationId,
        presenterId: testPresenterId,
        slideIndex: 2,
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('スライド 3 に移動しました');
      expect(result.currentSlideIndex).toBe(2);
      expect(result.totalSlides).toBe(3);

      // データベースで確認
      const presentation = await presentationRepository.findById(testPresentationId);
      expect(presentation?.currentSlideIndex).toBe(2);
    });

    test('無効なスライドインデックスで失敗する', async () => {
      const result = await useCase.goToSlide({
        presentationId: testPresentationId,
        presenterId: testPresenterId,
        slideIndex: 99,
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('無効なスライド番号です (範囲: 0-2)');
      expect(result.totalSlides).toBe(3);
    });

    test('負のスライドインデックスで失敗する', async () => {
      const result = await useCase.goToSlide({
        presentationId: testPresentationId,
        presenterId: testPresenterId,
        slideIndex: -1,
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('無効なスライド番号です (範囲: 0-2)');
    });

    test('次のスライドに正常に移動できる', async () => {
      const result = await useCase.nextSlide({
        presentationId: testPresentationId,
        presenterId: testPresenterId,
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('スライド 2 に移動しました');
      expect(result.currentSlideIndex).toBe(1);
      expect(result.totalSlides).toBe(3);
    });

    test('最後のスライドで次に移動を試行すると失敗する', async () => {
      // 最後のスライドに移動
      await useCase.goToSlide({
        presentationId: testPresentationId,
        presenterId: testPresenterId,
        slideIndex: 2,
      });

      // 次のスライドに移動を試行
      const result = await useCase.nextSlide({
        presentationId: testPresentationId,
        presenterId: testPresenterId,
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('最後のスライドです');
      expect(result.currentSlideIndex).toBe(2);
    });

    test('前のスライドに正常に移動できる', async () => {
      // まず2番目のスライドに移動
      await useCase.goToSlide({
        presentationId: testPresentationId,
        presenterId: testPresenterId,
        slideIndex: 1,
      });

      // 前のスライドに移動
      const result = await useCase.prevSlide({
        presentationId: testPresentationId,
        presenterId: testPresenterId,
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('スライド 1 に移動しました');
      expect(result.currentSlideIndex).toBe(0);
      expect(result.totalSlides).toBe(3);
    });

    test('最初のスライドで前に移動を試行すると失敗する', async () => {
      const result = await useCase.prevSlide({
        presentationId: testPresentationId,
        presenterId: testPresenterId,
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('最初のスライドです');
      expect(result.currentSlideIndex).toBe(0);
    });
  });

  describe('プレゼンテーション状態取得', () => {
    test('プレゼンテーション状態を正常に取得できる', async () => {
      // プレゼンテーションを開始してスライドを移動
      await useCase.startPresentation({
        presentationId: testPresentationId,
        presenterId: testPresenterId,
      });
      await useCase.goToSlide({
        presentationId: testPresentationId,
        presenterId: testPresenterId,
        slideIndex: 1,
      });

      const state = await useCase.getPresentationState(testPresentationId, testPresenterId);

      expect(state).not.toBeNull();
      expect(state?.presentationId).toBe(testPresentationId);
      expect(state?.isActive).toBe(true);
      expect(state?.currentSlideIndex).toBe(1);
      expect(state?.totalSlides).toBe(3);
      expect(state?.title).toBe('テストプレゼンテーション');
    });

    test('存在しないプレゼンテーションでnullを返す', async () => {
      const state = await useCase.getPresentationState('non-existent-id', testPresenterId);
      expect(state).toBeNull();
    });

    test('権限のないユーザーでnullを返す', async () => {
      const state = await useCase.getPresentationState(testPresentationId, otherUserId);
      expect(state).toBeNull();
    });
  });

  describe('権限チェック', () => {
    test('すべての操作で権限チェックが正しく動作する', async () => {
      const unauthorizedRequests = [
        () => useCase.startPresentation({
          presentationId: testPresentationId,
          presenterId: otherUserId,
        }),
        () => useCase.stopPresentation({
          presentationId: testPresentationId,
          presenterId: otherUserId,
        }),
        () => useCase.goToSlide({
          presentationId: testPresentationId,
          presenterId: otherUserId,
          slideIndex: 1,
        }),
        () => useCase.nextSlide({
          presentationId: testPresentationId,
          presenterId: otherUserId,
        }),
        () => useCase.prevSlide({
          presentationId: testPresentationId,
          presenterId: otherUserId,
        }),
      ];

      for (const request of unauthorizedRequests) {
        const result = await request();
        expect(result.success).toBe(false);
        expect(result.message).toBe('このプレゼンテーションを制御する権限がありません');
      }
    });
  });
});