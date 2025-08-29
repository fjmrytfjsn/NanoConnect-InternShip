/**
 * プレゼンテーションリアルタイム参加ユースケース
 * WebSocket接続を通じた参加者のプレゼンテーション参加機能を提供
 */

import { IPresentationRepository } from '@/domain/repositories/IPresentationRepository';
import { AccessCode } from '@/domain/valueObjects/AccessCode';
import { SessionId } from '@/domain/valueObjects/SessionId';
import { PresentationId } from '@/types/common';

/**
 * リアルタイム参加リクエストDTO
 */
export interface JoinPresentationRealtimeRequestDto {
  accessCode: string;
  participantName?: string;
  socketId: string;
}

/**
 * リアルタイム参加レスポンスDTO
 */
export interface JoinPresentationRealtimeResponseDto {
  success: boolean;
  sessionId: string;
  presentation: {
    id: PresentationId;
    title: string;
    description?: string;
    isActive: boolean;
    currentSlideIndex: number;
    totalSlides: number;
    participantCount: number;
  };
  participant: {
    sessionId: string;
    name: string;
    isAnonymous: boolean;
    joinedAt: string;
  };
  message?: string;
  error?: string;
}

/**
 * 参加者情報
 */
export interface ParticipantInfo {
  sessionId: string;
  socketId: string;
  presentationId: PresentationId;
  participantName: string;
  isAnonymous: boolean;
  joinedAt: Date;
  lastActivity: Date;
}

export class JoinPresentationRealtimeUseCase {
  private readonly participants: Map<string, ParticipantInfo> = new Map();

  constructor(private readonly presentationRepository: IPresentationRepository) {}

  async execute(request: JoinPresentationRealtimeRequestDto): Promise<JoinPresentationRealtimeResponseDto> {
    try {
      // アクセスコードの検証
      const accessCode = AccessCode.from(request.accessCode);

      // アクセスコードでプレゼンテーションを検索
      const presentation = await this.presentationRepository.findByAccessCode(
        accessCode.toString()
      );

      if (!presentation) {
        return this.createErrorResponse('アクセスコードが無効です。正しいコードを入力してください。');
      }

      // プレゼンテーションがアクティブかチェック
      if (!presentation.isActive) {
        return this.createErrorResponse(
          'このプレゼンテーションは現在アクティブではありません。',
          presentation.id,
          presentation.title,
          presentation.description
        );
      }

      // アクセスコードの有効期限チェック
      if (!presentation.isAccessCodeValid()) {
        return this.createErrorResponse(
          'アクセスコードの有効期限が切れています。新しいコードを取得してください。',
          presentation.id,
          presentation.title,
          presentation.description
        );
      }

      // 重複参加チェック（同じソケットIDでの複数参加を防ぐ）
      const existingParticipant = this.findParticipantBySocketId(request.socketId);
      if (existingParticipant) {
        // 既存の参加情報を削除してから新しい参加を処理
        this.removeParticipant(existingParticipant.sessionId);
      }

      // セッションIDを生成
      const sessionId = SessionId.generate();
      const participantName = request.participantName || this.generateAnonymousName();

      // 参加者情報を作成・保存
      const participantInfo: ParticipantInfo = {
        sessionId: sessionId.toString(),
        socketId: request.socketId,
        presentationId: presentation.id,
        participantName,
        isAnonymous: !request.participantName,
        joinedAt: new Date(),
        lastActivity: new Date(),
      };

      this.participants.set(sessionId.toString(), participantInfo);

      // プレゼンテーション統計情報を取得
      const statistics = await this.presentationRepository.getStatistics(presentation.id);

      // 成功レスポンス
      return {
        success: true,
        sessionId: sessionId.toString(),
        presentation: {
          id: presentation.id,
          title: presentation.title,
          description: presentation.description,
          isActive: presentation.isActive,
          currentSlideIndex: presentation.currentSlideIndex,
          totalSlides: statistics?.totalSlides || 0,
          participantCount: this.getPresentationParticipantCount(presentation.id) + 1, // 今参加した分を含む
        },
        participant: {
          sessionId: sessionId.toString(),
          name: participantName,
          isAnonymous: !request.participantName,
          joinedAt: participantInfo.joinedAt.toISOString(),
        },
        message: 'プレゼンテーションに正常に参加しました。',
      };
    } catch (error) {
      console.error('❌ リアルタイムプレゼンテーション参加エラー:', error);
      return this.createErrorResponse(
        error instanceof Error
          ? error.message
          : 'プレゼンテーションへの参加中にエラーが発生しました。'
      );
    }
  }

  /**
   * 参加者の退出処理
   */
  leavePresentation(sessionId: string): ParticipantInfo | null {
    const participant = this.participants.get(sessionId);
    if (participant) {
      this.participants.delete(sessionId);
      console.log(`👋 参加者退出: ${participant.participantName} (${sessionId})`);
      return participant;
    }
    return null;
  }

  /**
   * ソケットIDによる参加者退出処理
   */
  leavePresentationBySocketId(socketId: string): ParticipantInfo | null {
    const participant = this.findParticipantBySocketId(socketId);
    if (participant) {
      return this.leavePresentation(participant.sessionId);
    }
    return null;
  }

  /**
   * 参加者情報の取得
   */
  getParticipant(sessionId: string): ParticipantInfo | undefined {
    return this.participants.get(sessionId);
  }

  /**
   * プレゼンテーション参加者一覧の取得
   */
  getPresentationParticipants(presentationId: PresentationId): ParticipantInfo[] {
    return Array.from(this.participants.values()).filter(
      p => p.presentationId === presentationId
    );
  }

  /**
   * プレゼンテーション参加者数の取得
   */
  getPresentationParticipantCount(presentationId: PresentationId): number {
    return this.getPresentationParticipants(presentationId).length;
  }

  /**
   * 参加者のアクティビティを更新
   */
  updateParticipantActivity(sessionId: string): void {
    const participant = this.participants.get(sessionId);
    if (participant) {
      participant.lastActivity = new Date();
    }
  }

  /**
   * 非アクティブな参加者のクリーンアップ
   */
  cleanupInactiveParticipants(maxInactiveMinutes: number = 30): ParticipantInfo[] {
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - maxInactiveMinutes);
    
    const inactiveParticipants: ParticipantInfo[] = [];
    
    for (const [sessionId, participant] of this.participants.entries()) {
      if (participant.lastActivity < cutoffTime) {
        inactiveParticipants.push(participant);
        this.participants.delete(sessionId);
      }
    }

    if (inactiveParticipants.length > 0) {
      console.log(`🧹 非アクティブな参加者をクリーンアップしました: ${inactiveParticipants.length}人`);
    }

    return inactiveParticipants;
  }

  /**
   * エラーレスポンスの作成
   */
  private createErrorResponse(
    message: string,
    presentationId?: PresentationId,
    title?: string,
    description?: string
  ): JoinPresentationRealtimeResponseDto {
    return {
      success: false,
      sessionId: '',
      presentation: {
        id: presentationId || '',
        title: title || '',
        description,
        isActive: false,
        currentSlideIndex: 0,
        totalSlides: 0,
        participantCount: 0,
      },
      participant: {
        sessionId: '',
        name: '',
        isAnonymous: true,
        joinedAt: '',
      },
      error: message,
    };
  }

  /**
   * ソケットIDで参加者を検索
   */
  private findParticipantBySocketId(socketId: string): ParticipantInfo | undefined {
    return Array.from(this.participants.values()).find(p => p.socketId === socketId);
  }

  /**
   * 参加者を削除
   */
  private removeParticipant(sessionId: string): void {
    this.participants.delete(sessionId);
  }

  /**
   * 匿名参加者名を生成
   */
  private generateAnonymousName(): string {
    const adjectives = ['賢い', '元気な', '優しい', '明るい', '静かな', '勇敢な', '面白い', '親切な'];
    const animals = ['ライオン', 'ウサギ', '象', 'パンダ', 'キツネ', 'フクロウ', 'イルカ', 'ペンギン'];
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const animal = animals[Math.floor(Math.random() * animals.length)];
    const number = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    
    return `${adjective}${animal}${number}`;
  }
}