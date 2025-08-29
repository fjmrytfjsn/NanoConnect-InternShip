/**
 * ParticipantHandlerのWebSocket統合テスト（基本機能のみ）
 * 参加者のリアルタイムイベント処理の基本動作を検証
 */

import { JoinPresentationRealtimeUseCase } from '../src/application/useCases/participant/JoinPresentationRealtime';
import { IPresentationRepository } from '../src/domain/repositories/IPresentationRepository';
import { Presentation } from '../src/domain/entities/Presentation';
import { AccessCode } from '../src/domain/valueObjects/AccessCode';

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
    return {
      totalSlides: 5,
      totalResponses: 20,
      totalParticipants: 10,
      activeParticipants: 8,
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

describe('ParticipantHandler 基本機能テスト', () => {
  let mockRepository: MockPresentationRepository;
  let useCase: JoinPresentationRealtimeUseCase;
  let testPresentation: Presentation;

  beforeAll(() => {
    mockRepository = new MockPresentationRepository();
    
    // テストプレゼンテーションの準備
    const accessCode = AccessCode.generate();
    testPresentation = Presentation.create(
      'websocket-test-presentation',
      'WebSocketテストプレゼンテーション',
      'presenter-123',
      accessCode.toString(),
      'WebSocket機能のテスト用'
    );
    testPresentation.start();
    mockRepository.addTestPresentation(testPresentation);

    useCase = new JoinPresentationRealtimeUseCase(mockRepository);
  });

  afterAll(() => {
    mockRepository.clear();
  });

  describe('参加者セッション管理', () => {
    it('参加者情報が正しく管理される', async () => {
      const request = {
        accessCode: testPresentation.accessCode,
        participantName: 'セッション管理テスト参加者',
        socketId: 'socket-session-test',
      };

      // 参加処理
      const joinResponse = await useCase.execute(request);
      expect(joinResponse.success).toBe(true);

      // 参加者情報の確認
      const participant = useCase.getParticipant(joinResponse.sessionId);
      expect(participant).toBeDefined();
      expect(participant?.participantName).toBe('セッション管理テスト参加者');
      expect(participant?.socketId).toBe('socket-session-test');
      expect(participant?.presentationId).toBe(testPresentation.id);

      // 退出処理
      const leftParticipant = useCase.leavePresentation(joinResponse.sessionId);
      expect(leftParticipant).toBeDefined();
      expect(leftParticipant?.participantName).toBe('セッション管理テスト参加者');
    });

    it('ソケットIDによる退出処理が正常に動作する', async () => {
      const request = {
        accessCode: testPresentation.accessCode,
        participantName: 'ソケット退出テスト参加者',
        socketId: 'socket-leave-test',
      };

      // 参加処理
      const joinResponse = await useCase.execute(request);
      expect(joinResponse.success).toBe(true);

      // ソケットIDによる退出処理
      const leftParticipant = useCase.leavePresentationBySocketId('socket-leave-test');
      expect(leftParticipant).toBeDefined();
      expect(leftParticipant?.participantName).toBe('ソケット退出テスト参加者');

      // 参加者数が0になることを確認
      const count = useCase.getPresentationParticipantCount(testPresentation.id);
      expect(count).toBe(0);
    });

    it('参加者のアクティビティが更新される', async () => {
      const request = {
        accessCode: testPresentation.accessCode,
        participantName: 'アクティビティテスト参加者',
        socketId: 'socket-activity-test',
      };

      // 参加処理
      const joinResponse = await useCase.execute(request);
      expect(joinResponse.success).toBe(true);

      // 初期のアクティビティ時刻を記録
      const participant = useCase.getParticipant(joinResponse.sessionId);
      const initialActivity = participant?.lastActivity;

      // 少し待つ
      await new Promise(resolve => setTimeout(resolve, 10));

      // アクティビティを更新
      useCase.updateParticipantActivity(joinResponse.sessionId);

      // アクティビティが更新されることを確認
      const updatedParticipant = useCase.getParticipant(joinResponse.sessionId);
      expect(updatedParticipant?.lastActivity.getTime()).toBeGreaterThan(
        initialActivity?.getTime() || 0
      );

      // クリーンアップ
      useCase.leavePresentation(joinResponse.sessionId);
    });

    it('複数参加者の管理が正常に動作する', async () => {
      const participantNames = [
        '複数参加者テスト1',
        '複数参加者テスト2', 
        '複数参加者テスト3'
      ];
      const sessionIds: string[] = [];

      // 複数の参加者を追加
      for (let i = 0; i < participantNames.length; i++) {
        const request = {
          accessCode: testPresentation.accessCode,
          participantName: participantNames[i],
          socketId: `socket-multi-${i}`,
        };

        const response = await useCase.execute(request);
        expect(response.success).toBe(true);
        sessionIds.push(response.sessionId);
      }

      // 参加者数の確認
      expect(useCase.getPresentationParticipantCount(testPresentation.id)).toBe(3);

      // 参加者一覧の確認
      const participants = useCase.getPresentationParticipants(testPresentation.id);
      expect(participants).toHaveLength(3);
      expect(participants.map(p => p.participantName)).toEqual(
        expect.arrayContaining(participantNames)
      );

      // 1人ずつ退出
      for (const sessionId of sessionIds) {
        const leftParticipant = useCase.leavePresentation(sessionId);
        expect(leftParticipant).toBeDefined();
      }

      // 全員退出後の確認
      expect(useCase.getPresentationParticipantCount(testPresentation.id)).toBe(0);
    });
  });

  describe('エラー処理', () => {
    it('存在しないセッションIDでの退出処理はnullを返す', () => {
      const result = useCase.leavePresentation('non-existent-session-id');
      expect(result).toBeNull();
    });

    it('存在しないソケットIDでの退出処理はnullを返す', () => {
      const result = useCase.leavePresentationBySocketId('non-existent-socket-id');
      expect(result).toBeNull();
    });

    it('存在しないセッションIDでのアクティビティ更新は何も起こらない', () => {
      // エラーが発生しないことを確認
      expect(() => {
        useCase.updateParticipantActivity('non-existent-session-id');
      }).not.toThrow();
    });
  });

  describe('匿名参加者名生成', () => {
    it('匿名参加者名が一意性を持つ', async () => {
      const names = new Set<string>();
      const sessionIds: string[] = [];

      // 複数回匿名参加
      for (let i = 0; i < 20; i++) {
        const request = {
          accessCode: testPresentation.accessCode,
          socketId: `socket-anonymous-${i}`,
        };

        const response = await useCase.execute(request);
        expect(response.success).toBe(true);
        
        names.add(response.participant.name);
        sessionIds.push(response.sessionId);
        
        // 形式の確認
        expect(response.participant.name).toMatch(/^.+(ライオン|ウサギ|象|パンダ|キツネ|フクロウ|イルカ|ペンギン)\d{2}$/);
      }

      // 高い確率で異なる名前が生成されることを確認
      expect(names.size).toBeGreaterThanOrEqual(10); // 20回中少なくとも10個は異なる名前

      // クリーンアップ
      for (const sessionId of sessionIds) {
        useCase.leavePresentation(sessionId);
      }
    });
  });
});