/**
 * プレゼンテーションAPI統合テスト
 * プレゼンテーションCRUD APIの動作確認
 */

import { CreatePresentationUseCase } from '@/application/useCases/presentation/CreatePresentationUseCase';
import { GetPresentationUseCase } from '@/application/useCases/presentation/GetPresentationUseCase';
import { ListPresentationsUseCase } from '@/application/useCases/presentation/ListPresentationsUseCase';
import { UpdatePresentationUseCase } from '@/application/useCases/presentation/UpdatePresentationUseCase';
import { DeletePresentationUseCase } from '@/application/useCases/presentation/DeletePresentationUseCase';
import { SQLitePresentationRepository } from '@/infrastructure/database/repositories/SQLitePresentationRepository';
import { SQLiteUserRepository } from '@/infrastructure/database/repositories/SQLiteUserRepository';
import { SQLiteConnection } from '@/infrastructure/database/SQLiteConnection';

describe('プレゼンテーション API統合テスト', () => {
  let dbConnection: SQLiteConnection;
  let presentationRepository: SQLitePresentationRepository;
  let userRepository: SQLiteUserRepository;
  let createUseCase: CreatePresentationUseCase;
  let getUseCase: GetPresentationUseCase;
  let listUseCase: ListPresentationsUseCase;
  let updateUseCase: UpdatePresentationUseCase;
  let deleteUseCase: DeletePresentationUseCase;

  beforeEach(async () => {
    // 新しいデータベース接続を作成（テスト用）
    dbConnection = new SQLiteConnection(':memory:');
    await dbConnection.initialize();

    // リポジトリ初期化
    presentationRepository = new SQLitePresentationRepository(dbConnection);
    userRepository = new SQLiteUserRepository();

    // テスト用ユーザーを作成（FOREIGN KEY制約回避）
    const createUserSql = `
      INSERT INTO users (id, username, password_hash, email, created_at, updated_at)
      VALUES ('user1', 'testuser', 'hashedpass', 'test@example.com', datetime('now'), datetime('now'))
    `;
    dbConnection.database.exec(createUserSql);

    // ユースケース初期化
    createUseCase = new CreatePresentationUseCase(presentationRepository, userRepository);
    getUseCase = new GetPresentationUseCase(presentationRepository);
    listUseCase = new ListPresentationsUseCase(presentationRepository);
    updateUseCase = new UpdatePresentationUseCase(presentationRepository);
    deleteUseCase = new DeletePresentationUseCase(presentationRepository);
  });

  afterEach(() => {
    // テストデータのクリーンアップ
    if (dbConnection && dbConnection.database.open) {
      dbConnection.close();
    }
  });

  describe('プレゼンテーション作成', () => {
    test('正常にプレゼンテーションが作成できる', async () => {
      const createDto = {
        title: 'テストプレゼンテーション',
        description: 'これはテスト用のプレゼンテーションです',
        presenterId: 'user1',
      };

      const result = await createUseCase.execute(createDto);

      expect(result).toBeDefined();
      expect(result.title).toBe('テストプレゼンテーション');
      expect(result.description).toBe('これはテスト用のプレゼンテーションです');
      expect(result.presenterId).toBe('user1');
      expect(result.accessCode).toBeDefined();
      expect(result.accessCode).toHaveLength(6);
      expect(result.isActive).toBe(false);
      expect(result.currentSlideIndex).toBe(0);
    });

    test('タイトルが空の場合エラーが発生する', async () => {
      const createDto = {
        title: '',
        presenterId: 'user1',
      };

      await expect(createUseCase.execute(createDto)).rejects.toThrow();
    });

    test('存在しないプレゼンターIDの場合エラーが発生する', async () => {
      // userRepositoryの実装で、nullを返すユーザーIDを使用
      const createDto = {
        title: 'テストプレゼンテーション',
        presenterId: 'nonexistent-user', // 存在しないユーザーID
      };

      await expect(createUseCase.execute(createDto)).rejects.toThrow('プレゼンターが見つかりません');
    });
  });

  describe('プレゼンテーション一覧取得', () => {
    test('プレゼンター用一覧が取得できる', async () => {
      const result = await listUseCase.execute('user1');

      expect(result).toBeDefined();
      expect(Array.isArray(result.presentations)).toBe(true);
      expect(result.total).toBe(result.presentations.length);
    });
  });

  describe('プレゼンテーション取得', () => {
    test('存在しないプレゼンテーションの場合エラーが発生する', async () => {
      await expect(getUseCase.execute('nonexistent', 'user1')).rejects.toThrow(
        'プレゼンテーションが見つかりません'
      );
    });
  });

  describe('プレゼンテーション更新', () => {
    test('存在しないプレゼンテーションの場合エラーが発生する', async () => {
      const updateDto = {
        title: '更新されたタイトル',
      };

      await expect(updateUseCase.execute('nonexistent', 'user1', updateDto)).rejects.toThrow(
        'プレゼンテーションが見つかりません'
      );
    });
  });

  describe('プレゼンテーション削除', () => {
    test('存在しないプレゼンテーションの場合エラーが発生する', async () => {
      await expect(deleteUseCase.execute('nonexistent', 'user1')).rejects.toThrow(
        'プレゼンテーションが見つかりません'
      );
    });
  });
});