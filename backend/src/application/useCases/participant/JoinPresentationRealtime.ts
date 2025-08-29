/**
 * リアルタイムプレゼンテーション参加ユースケース
 * WebSocket経由でのプレゼンテーション参加機能を提供
 */

import { JoinPresentationUseCase } from './JoinPresentationUseCase';
import { IPresentationRepository } from '@/domain/repositories/IPresentationRepository';
import { SessionId } from '@/domain/valueObjects/SessionId';
import {
  JoinPresentationRequestDto,
  JoinPresentationResponseDto,
} from '../../dtos/participant/JoinPresentationDto';

/**
 * リアルタイム参加リクエスト（WebSocket専用）
 */
export interface JoinPresentationRealtimeRequest extends JoinPresentationRequestDto {
  sessionId?: string;
  socketId: string;
}

/**
 * リアルタイム参加レスポンス
 */
export interface JoinPresentationRealtimeResponse extends JoinPresentationResponseDto {
  // WebSocket固有の追加情報があれば拡張
}

/**
 * リアルタイムプレゼンテーション参加ユースケース
 */
export class JoinPresentationRealtime {
  private baseJoinUseCase: JoinPresentationUseCase;
  private activeSessions = new Map<string, {
    sessionId: string;
    presentationId: string;
    socketId: string;
    joinedAt: Date;
    lastActivity: Date;
  }>();

  constructor(presentationRepository: IPresentationRepository) {
    this.baseJoinUseCase = new JoinPresentationUseCase(presentationRepository);
  }

  /**
   * リアルタイムプレゼンテーション参加を実行
   */
  async execute(request: JoinPresentationRealtimeRequest): Promise<JoinPresentationRealtimeResponse> {
    try {
      console.log(`🔄 リアルタイム参加処理開始: AccessCode=${request.accessCode}, Socket=${request.socketId}`);

      // 重複参加チェック
      if (this.isAlreadyParticipating(request.socketId)) {
        return {
          success: false,
          sessionId: '',
          presentation: {
            id: '',
            title: '',
            isActive: false,
            currentSlideIndex: 0,
          },
          message: '既にプレゼンテーションに参加しています。',
        };
      }

      // 既存のセッションIDがある場合の検証
      if (request.sessionId) {
        const existingSession = this.findSessionById(request.sessionId);
        if (existingSession) {
          // セッションが既に存在する場合は再接続として処理
          return this.handleReconnection(request, existingSession);
        }
      }

      // ベースユースケースでプレゼンテーション参加を実行
      const baseRequest: JoinPresentationRequestDto = {
        accessCode: request.accessCode,
        clientIpAddress: request.clientIpAddress,
        userAgent: request.userAgent,
      };

      const result = await this.baseJoinUseCase.execute(baseRequest);

      if (!result.success) {
        console.log(`❌ 参加失敗: ${result.message}`);
        return result as JoinPresentationRealtimeResponse;
      }

      // セッション情報を記録
      const sessionInfo = {
        sessionId: result.sessionId,
        presentationId: result.presentation.id,
        socketId: request.socketId,
        joinedAt: new Date(),
        lastActivity: new Date(),
      };

      this.activeSessions.set(result.sessionId, sessionInfo);

      // 同一プレゼンテーションの重複参加チェック
      const duplicateCount = this.countDuplicateParticipation(
        result.presentation.id,
        request.socketId
      );

      if (duplicateCount > 0) {
        console.warn(`⚠️ 重複参加の可能性: PresentationId=${result.presentation.id}, Count=${duplicateCount + 1}`);
      }

      console.log(`✅ リアルタイム参加成功: Session=${result.sessionId}, Presentation=${result.presentation.id}`);

      return {
        ...result,
        // WebSocket固有の拡張情報があれば追加
      } as JoinPresentationRealtimeResponse;

    } catch (error) {
      console.error('❌ リアルタイム参加エラー:', error);

      return {
        success: false,
        sessionId: '',
        presentation: {
          id: '',
          title: '',
          isActive: false,
          currentSlideIndex: 0,
        },
        message: error instanceof Error 
          ? error.message 
          : 'リアルタイム参加中にエラーが発生しました。',
      };
    }
  }

  /**
   * セッションの終了（離脱時の処理）
   */
  public terminateSession(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      console.warn(`⚠️ 終了対象のセッションが見つかりません: ${sessionId}`);
      return false;
    }

    this.activeSessions.delete(sessionId);
    console.log(`🗑️ セッション終了: ${sessionId} (Presentation: ${session.presentationId})`);
    
    return true;
  }

  /**
   * セッションのアクティビティ更新
   */
  public updateSessionActivity(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
    }
  }

  /**
   * 特定プレゼンテーションの参加セッション数を取得
   */
  public getPresentationSessionCount(presentationId: string): number {
    return Array.from(this.activeSessions.values())
      .filter(session => session.presentationId === presentationId)
      .length;
  }

  /**
   * 全アクティブセッションの取得
   */
  public getActiveSessions(): Map<string, {
    sessionId: string;
    presentationId: string;
    socketId: string;
    joinedAt: Date;
    lastActivity: Date;
  }> {
    return new Map(this.activeSessions);
  }

  /**
   * 非アクティブセッションのクリーンアップ
   */
  public cleanupInactiveSessions(maxInactiveMinutes: number = 30): number {
    const now = Date.now();
    const maxInactiveTime = maxInactiveMinutes * 60 * 1000;
    let cleanedCount = 0;

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (now - session.lastActivity.getTime() > maxInactiveTime) {
        this.activeSessions.delete(sessionId);
        cleanedCount++;
        console.log(`🧹 非アクティブセッションをクリーンアップ: ${sessionId}`);
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 クリーンアップ完了: ${cleanedCount}件のセッションを削除`);
    }

    return cleanedCount;
  }

  /**
   * 重複参加チェック
   */
  private isAlreadyParticipating(socketId: string): boolean {
    return Array.from(this.activeSessions.values())
      .some(session => session.socketId === socketId);
  }

  /**
   * セッションIDによる検索
   */
  private findSessionById(sessionId: string): {
    sessionId: string;
    presentationId: string;
    socketId: string;
    joinedAt: Date;
    lastActivity: Date;
  } | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * 再接続処理
   */
  private async handleReconnection(
    request: JoinPresentationRealtimeRequest,
    existingSession: {
      sessionId: string;
      presentationId: string;
      socketId: string;
      joinedAt: Date;
      lastActivity: Date;
    }
  ): Promise<JoinPresentationRealtimeResponse> {
    console.log(`🔄 セッション再接続: ${request.sessionId} (Old Socket: ${existingSession.socketId}, New Socket: ${request.socketId})`);

    // ソケットIDを更新
    existingSession.socketId = request.socketId;
    existingSession.lastActivity = new Date();

    // プレゼンテーション情報を再取得（最新状態を返すため）
    const baseRequest: JoinPresentationRequestDto = {
      accessCode: request.accessCode,
      clientIpAddress: request.clientIpAddress,
      userAgent: request.userAgent,
    };

    const result = await this.baseJoinUseCase.execute(baseRequest);

    if (!result.success) {
      // 再接続先のプレゼンテーションが無効になった場合はセッションを削除
      this.activeSessions.delete(existingSession.sessionId);
      return result as JoinPresentationRealtimeResponse;
    }

    console.log(`✅ セッション再接続成功: ${existingSession.sessionId}`);

    return {
      ...result,
      sessionId: existingSession.sessionId, // 既存のセッションIDを維持
    } as JoinPresentationRealtimeResponse;
  }

  /**
   * 同一プレゼンテーションの重複参加数をカウント
   */
  private countDuplicateParticipation(presentationId: string, currentSocketId: string): number {
    return Array.from(this.activeSessions.values())
      .filter(session => 
        session.presentationId === presentationId && 
        session.socketId !== currentSocketId
      ).length;
  }
}