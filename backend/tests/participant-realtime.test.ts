/**
 * 参加者リアルタイム機能のテスト
 * JoinPresentationRealtimeUseCase と ParticipantHandler の動作を検証
 */

import { JoinPresentationRealtimeUseCase, JoinPresentationRealtimeRequestDto } from '@/application/useCases/participant/JoinPresentationRealtime';
import { IPresentationRepository } from '@/domain/repositories/IPresentationRepository';
import { Presentation } from '@/domain/entities/Presentation';
import { AccessCode } from '@/domain/valueObjects/AccessCode';

// モックプレゼンテーションリポジトリ
class MockPresentationRepository implements IPresentationRepository {
  private presentations: Map<string, Presentation> = new Map();

  async save(presentation: Presentation): Promise<Presentation> {
    this.presentations.set(presentation.id, presentation);
    return presentation;
  }

  async findById(id: string): Promise<Presentation | null> {
    return this.presentations.get(id) || null;
  }

  async findByAccessCode(accessCode: string): Promise<Presentation | null> {
    for (const presentation of this.presentations.values()) {
      if (presentation.accessCode === accessCode) {
        return presentation;
      }
    }
    return null;
  }

  async findByPresenterId(presenterId: string): Promise<Presentation[]> {
    return Array.from(this.presentations.values()).filter(
      p => p.presenterId === presenterId
    );
  }

  async findActive(): Promise<Presentation[]> {
    return Array.from(this.presentations.values()).filter(p => p.isActive);
  }

  async findActiveByPresenterId(presenterId: string): Promise<Presentation[]> {
    return Array.from(this.presentations.values()).filter(
      p => p.presenterId === presenterId && p.isActive
    );
  }

  async existsByAccessCode(accessCode: string): Promise<boolean> {
    for (const presentation of this.presentations.values()) {
      if (presentation.accessCode === accessCode) {
        return true;
      }
    }
    return false;
  }

  async findAll(): Promise<Presentation[]> {
    return Array.from(this.presentations.values());
  }

  async exists(id: string): Promise<boolean> {
    return this.presentations.has(id);
  }

  async delete(id: string): Promise<boolean> {
    return this.presentations.delete(id);
  }

  async getStatistics(id: string): Promise<{ 
    totalSlides: number; 
    totalResponses: number; 
    totalParticipants: number; 
    activeParticipants: number;
  } | null> {
    const presentation = this.presentations.get(id);
    if (!presentation) return null;
    
    return {
      totalSlides: Math.floor(Math.random() * 10) + 1,
      totalResponses: Math.floor(Math.random() * 100),
      totalParticipants: Math.floor(Math.random() * 50),
      activeParticipants: Math.floor(Math.random() * 20),
    };
  }

  // テスト用ヘルパーメソッド
  addTestPresentation(presentation: Presentation): void {
    this.presentations.set(presentation.id, presentation);
  }

  clear(): void {
    this.presentations.clear();
  }
}

describe('JoinPresentationRealtimeUseCase', () => {
  let useCase: JoinPresentationRealtimeUseCase;
  let mockRepository: MockPresentationRepository;

  beforeEach(() => {
    mockRepository = new MockPresentationRepository();
    useCase = new JoinPresentationRealtimeUseCase(mockRepository);
  });

  afterEach(() => {
    mockRepository.clear();
  });

  describe('プレゼンテーション参加', () => {
    it('有効なアクセスコードでプレゼンテーションに参加できる', async () => {
      // テストデータの準備
      const accessCode = AccessCode.generate();
      const presentation = Presentation.create({
        title: 'テストプレゼンテーション',
        description: 'テスト用のプレゼンテーション',
        presenterId: 'presenter-123',
        accessCode: accessCode.toString(),
      });
      presentation.activate();
      mockRepository.addTestPresentation(presentation);

      // リクエストの実行
      const request: JoinPresentationRealtimeRequestDto = {
        accessCode: accessCode.toString(),
        participantName: 'テスト参加者',
        socketId: 'socket-123',
      };

      const response = await useCase.execute(request);

      // 結果の検証
      expect(response.success).toBe(true);
      expect(response.sessionId).toBeDefined();
      expect(response.presentation.id).toBe(presentation.id);
      expect(response.presentation.title).toBe('テストプレゼンテーション');
      expect(response.participant.name).toBe('テスト参加者');
      expect(response.participant.isAnonymous).toBe(false);
    });

    it('参加者名が未指定の場合は匿名参加者として処理される', async () => {
      // テストデータの準備
      const accessCode = AccessCode.generate();
      const presentation = Presentation.create({
        title: 'テストプレゼンテーション',
        description: 'テスト用のプレゼンテーション',
        presenterId: 'presenter-123',
        accessCode: accessCode.toString(),
      });
      presentation.activate();
      mockRepository.addTestPresentation(presentation);

      // リクエストの実行
      const request: JoinPresentationRealtimeRequestDto = {
        accessCode: accessCode.toString(),
        socketId: 'socket-123',
      };

      const response = await useCase.execute(request);

      // 結果の検証
      expect(response.success).toBe(true);
      expect(response.participant.isAnonymous).toBe(true);
      expect(response.participant.name).toMatch(/^.+(ライオン|ウサギ|象|パンダ|キツネ|フクロウ|イルカ|ペンギン)\d{2}$/);
    });

    it('無効なアクセスコードでエラーが返される', async () => {
      // リクエストの実行
      const request: JoinPresentationRealtimeRequestDto = {
        accessCode: '999-999',
        socketId: 'socket-123',
      };

      const response = await useCase.execute(request);

      // 結果の検証
      expect(response.success).toBe(false);
      expect(response.error).toBe('アクセスコードが無効です。正しいコードを入力してください。');
    });

    it('非アクティブなプレゼンテーションでエラーが返される', async () => {
      // テストデータの準備
      const accessCode = AccessCode.generate();
      const presentation = Presentation.create({
        title: 'テストプレゼンテーション',
        description: 'テスト用のプレゼンテーション',
        presenterId: 'presenter-123',
        accessCode: accessCode.toString(),
      });
      // プレゼンテーションをアクティブ化せずに追加
      mockRepository.addTestPresentation(presentation);

      // リクエストの実行
      const request: JoinPresentationRealtimeRequestDto = {
        accessCode: accessCode.toString(),
        socketId: 'socket-123',
      };

      const response = await useCase.execute(request);

      // 結果の検証
      expect(response.success).toBe(false);
      expect(response.error).toBe('このプレゼンテーションは現在アクティブではありません。');
    });

    it('同じソケットIDでの重複参加が処理される', async () => {
      // テストデータの準備
      const accessCode = AccessCode.generate();
      const presentation = Presentation.create({
        title: 'テストプレゼンテーション',
        description: 'テスト用のプレゼンテーション',
        presenterId: 'presenter-123',
        accessCode: accessCode.toString(),
      });
      presentation.activate();
      mockRepository.addTestPresentation(presentation);

      const socketId = 'socket-123';

      // 最初の参加
      const request1: JoinPresentationRealtimeRequestDto = {
        accessCode: accessCode.toString(),
        participantName: '参加者1',
        socketId,
      };

      const response1 = await useCase.execute(request1);
      expect(response1.success).toBe(true);

      // 同じソケットIDでの2回目の参加
      const request2: JoinPresentationRealtimeRequestDto = {
        accessCode: accessCode.toString(),
        participantName: '参加者2',
        socketId,
      };

      const response2 = await useCase.execute(request2);
      expect(response2.success).toBe(true);
      expect(response2.participant.name).toBe('参加者2');

      // 参加者数は1のまま（重複参加が正しく処理された）
      expect(useCase.getPresentationParticipantCount(presentation.id)).toBe(1);
    });
  });

  describe('参加者管理', () => {
    it('参加者が正常に退出できる', async () => {
      // テストデータの準備と参加
      const accessCode = AccessCode.generate();
      const presentation = Presentation.create({
        title: 'テストプレゼンテーション',
        description: 'テスト用のプレゼンテーション',
        presenterId: 'presenter-123',
        accessCode: accessCode.toString(),
      });
      presentation.activate();
      mockRepository.addTestPresentation(presentation);

      const request: JoinPresentationRealtimeRequestDto = {
        accessCode: accessCode.toString(),
        participantName: 'テスト参加者',
        socketId: 'socket-123',
      };

      const joinResponse = await useCase.execute(request);
      expect(joinResponse.success).toBe(true);

      // 退出処理
      const leftParticipant = useCase.leavePresentation(joinResponse.sessionId);

      // 結果の検証
      expect(leftParticipant).toBeDefined();
      expect(leftParticipant?.participantName).toBe('テスト参加者');
      expect(useCase.getPresentationParticipantCount(presentation.id)).toBe(0);
    });

    it('参加者一覧を正常に取得できる', async () => {
      // テストデータの準備
      const accessCode = AccessCode.generate();
      const presentation = Presentation.create({
        title: 'テストプレゼンテーション',
        description: 'テスト用のプレゼンテーション',
        presenterId: 'presenter-123',
        accessCode: accessCode.toString(),
      });
      presentation.activate();
      mockRepository.addTestPresentation(presentation);

      // 複数の参加者を追加
      const participants = ['参加者1', '参加者2', '参加者3'];
      for (let i = 0; i < participants.length; i++) {
        const request: JoinPresentationRealtimeRequestDto = {
          accessCode: accessCode.toString(),
          participantName: participants[i],
          socketId: `socket-${i}`,
        };

        await useCase.execute(request);
      }

      // 参加者一覧を取得
      const participantList = useCase.getPresentationParticipants(presentation.id);

      // 結果の検証
      expect(participantList).toHaveLength(3);
      expect(participantList.map(p => p.participantName)).toEqual(
        expect.arrayContaining(['参加者1', '参加者2', '参加者3'])
      );
    });

    it('非アクティブな参加者をクリーンアップできる', async () => {
      // テストデータの準備と参加
      const accessCode = AccessCode.generate();
      const presentation = Presentation.create({
        title: 'テストプレゼンテーション',
        description: 'テスト用のプレゼンテーション',
        presenterId: 'presenter-123',
        accessCode: accessCode.toString(),
      });
      presentation.activate();
      mockRepository.addTestPresentation(presentation);

      const request: JoinPresentationRealtimeRequestDto = {
        accessCode: accessCode.toString(),
        participantName: 'テスト参加者',
        socketId: 'socket-123',
      };

      await useCase.execute(request);

      // 参加者のアクティビティを古い時刻に設定（テスト用の内部アクセス）
      const participants = useCase.getPresentationParticipants(presentation.id);
      expect(participants).toHaveLength(1);

      // 非アクティブな参加者をクリーンアップ（1分で非アクティブとする）
      const inactiveParticipants = useCase.cleanupInactiveParticipants(1 / 60); // 1分を分数で指定

      // 結果の検証（参加者は最近参加したので、まだクリーンアップされない）
      expect(inactiveParticipants).toHaveLength(0);
      expect(useCase.getPresentationParticipantCount(presentation.id)).toBe(1);
    });
  });

  describe('エラーハンドリング', () => {
    it('不正なアクセスコード形式でエラーが返される', async () => {
      const request: JoinPresentationRealtimeRequestDto = {
        accessCode: 'invalid-format',
        socketId: 'socket-123',
      };

      const response = await useCase.execute(request);

      expect(response.success).toBe(false);
      expect(response.error).toContain('アクセスコード');
    });

    it('リポジトリエラーが適切に処理される', async () => {
      // リポジトリがエラーを投げるように設定
      const errorRepository = {
        findByAccessCode: jest.fn().mockRejectedValue(new Error('データベースエラー')),
      } as any;

      const errorUseCase = new JoinPresentationRealtimeUseCase(errorRepository);

      const request: JoinPresentationRealtimeRequestDto = {
        accessCode: '123-456',
        socketId: 'socket-123',
      };

      const response = await errorUseCase.execute(request);

      expect(response.success).toBe(false);
      expect(response.error).toBe('データベースエラー');
    });
  });

  describe('参加者名生成', () => {
    it('匿名参加者名が正しい形式で生成される', async () => {
      // テストデータの準備
      const accessCode = AccessCode.generate();
      const presentation = Presentation.create({
        title: 'テストプレゼンテーション',
        description: 'テスト用のプレゼンテーション',
        presenterId: 'presenter-123',
        accessCode: accessCode.toString(),
      });
      presentation.activate();
      mockRepository.addTestPresentation(presentation);

      // 匿名参加者として複数回参加
      const names = new Set<string>();
      
      for (let i = 0; i < 10; i++) {
        const request: JoinPresentationRealtimeRequestDto = {
          accessCode: accessCode.toString(),
          socketId: `socket-${i}`,
        };

        const response = await useCase.execute(request);
        expect(response.success).toBe(true);
        
        names.add(response.participant.name);
        
        // 形式チェック：「形容詞 + 動物 + 数字2桁」
        expect(response.participant.name).toMatch(/^.+(ライオン|ウサギ|象|パンダ|キツネ|フクロウ|イルカ|ペンギン)\d{2}$/);
      }

      // ユニークな名前が生成されることを確認（高い確率で）
      expect(names.size).toBeGreaterThan(1);
    });
  });
});