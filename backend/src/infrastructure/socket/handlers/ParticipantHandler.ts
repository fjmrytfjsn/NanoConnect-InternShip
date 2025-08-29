/**
 * 参加者向けWebSocketハンドラー
 * 参加者のプレゼンテーション参加、離脱、リアルタイム同期機能を提供
 */

import { BaseHandler, TypedSocket, TypedNamespace } from './BaseHandler';
import { WebSocketAuthMiddleware } from '../middleware/AuthMiddleware';
import { WebSocketLoggingMiddleware, LogLevel } from '../middleware/LoggingMiddleware';
import { PresentationId } from '@/types/common';
import { JoinPresentationRealtime } from '@/application/useCases/participant/JoinPresentationRealtime';

/**
 * プレゼンテーション参加リクエスト
 */
export interface JoinPresentationRequest {
  accessCode: string;
  sessionId?: string;
}

/**
 * プレゼンテーション参加レスポンス
 */
export interface JoinPresentationResponse {
  success: boolean;
  presentationId?: string;
  sessionId: string;
  presentation?: {
    id: string;
    title: string;
    description?: string;
    isActive: boolean;
    currentSlideIndex: number;
  };
  message?: string;
  error?: string;
}

/**
 * プレゼンテーション離脱リクエスト
 */
export interface LeavePresentationRequest {
  presentationId: string;
  sessionId: string;
}

/**
 * 参加者セッション情報
 */
interface ParticipantSession {
  sessionId: string;
  presentationId: PresentationId;
  joinedAt: Date;
  lastActivity: Date;
  clientInfo?: {
    ipAddress?: string;
    userAgent?: string;
  };
}

/**
 * 参加者向けWebSocketハンドラー
 */
export class ParticipantHandler extends BaseHandler {
  private joinPresentationUseCase: JoinPresentationRealtime;
  private participantSessions = new Map<string, ParticipantSession>(); // socketId -> session

  constructor(
    namespace: TypedNamespace,
    joinPresentationUseCase: JoinPresentationRealtime
  ) {
    super(namespace);
    this.joinPresentationUseCase = joinPresentationUseCase;
  }

  /**
   * ハンドラー初期化
   */
  public initialize(): void {
    console.log('🎯 参加者ハンドラーを初期化しています...');
    
    // セッションクリーンアップ（15分間隔）
    setInterval(() => {
      this.cleanupInactiveSessions();
    }, 15 * 60 * 1000);

    console.log('✅ 参加者ハンドラー初期化完了');
  }

  /**
   * ソケット接続時の処理
   */
  public handleConnection(socket: TypedSocket): void {
    console.log(`👋 参加者ソケット接続: ${socket.id}`);

    // イベントハンドラーの登録
    this.registerEventHandlers(socket);

    // 接続ログ
    WebSocketLoggingMiddleware.logCustomEvent(
      socket,
      LogLevel.INFO,
      'participant_connected',
      {
        socketId: socket.id,
        timestamp: new Date().toISOString(),
      }
    );

    // 切断時の処理
    socket.on('disconnect', (reason) => {
      this.handleSocketDisconnect(socket, reason);
    });
  }

  /**
   * イベントハンドラーの登録
   */
  private registerEventHandlers(socket: TypedSocket): void {
    // プレゼンテーション参加
    socket.on('join:presentation', (data: JoinPresentationRequest, callback) => {
      this.handleJoinPresentation(socket, data, callback);
    });

    // プレゼンテーション離脱
    socket.on('leave:presentation', (data: LeavePresentationRequest) => {
      this.handleLeavePresentation(socket, data);
    });
  }

  /**
   * プレゼンテーション参加処理
   */
  private async handleJoinPresentation(
    socket: TypedSocket,
    request: JoinPresentationRequest,
    callback?: (response: JoinPresentationResponse) => void
  ): Promise<void> {
    try {
      console.log(`🚀 プレゼンテーション参加要求: Socket ${socket.id}, AccessCode: ${request.accessCode}`);

      WebSocketLoggingMiddleware.logCustomEvent(
        socket,
        LogLevel.INFO,
        'join_presentation_attempt',
        {
          accessCode: request.accessCode,
          sessionId: request.sessionId,
        }
      );

      // 重複参加チェック
      if (this.participantSessions.has(socket.id)) {
        const error = '既にプレゼンテーションに参加しています';
        this.sendErrorResponse(callback, error);
        return;
      }

      // アクセスコード検証とプレゼンテーション取得
      const joinResult = await this.joinPresentationUseCase.execute({
        accessCode: request.accessCode,
        sessionId: request.sessionId,
        socketId: socket.id,
      });

      if (!joinResult.success) {
        this.sendErrorResponse(callback, joinResult.message || '参加に失敗しました');
        
        WebSocketLoggingMiddleware.logCustomEvent(
          socket,
          LogLevel.WARN,
          'join_presentation_failed',
          {
            accessCode: request.accessCode,
            reason: joinResult.message,
          }
        );
        return;
      }

      // セッション情報を記録
      const session: ParticipantSession = {
        sessionId: joinResult.sessionId,
        presentationId: joinResult.presentation!.id as PresentationId,
        joinedAt: new Date(),
        lastActivity: new Date(),
        clientInfo: {
          ipAddress: socket.handshake.address,
          userAgent: socket.handshake.headers['user-agent'],
        },
      };

      this.participantSessions.set(socket.id, session);

      // プレゼンテーションルームに参加
      this.joinPresentationRoom(socket, session.presentationId);

      // 成功レスポンス
      const response: JoinPresentationResponse = {
        success: true,
        presentationId: joinResult.presentation!.id,
        sessionId: joinResult.sessionId,
        presentation: joinResult.presentation,
        message: '参加に成功しました',
      };

      this.sendSuccessResponse(callback, response);

      // プレゼンターに参加通知
      this.notifyPresenterParticipantJoined(session.presentationId, {
        sessionId: session.sessionId,
        joinedAt: session.joinedAt,
      });

      // 他の参加者に参加通知
      this.notifyOtherParticipants(socket, session.presentationId, 'participant:joined', {
        presentationId: session.presentationId,
        participantCount: await this.getPresentationParticipantCount(session.presentationId),
        timestamp: new Date().toISOString(),
      });

      WebSocketLoggingMiddleware.logCustomEvent(
        socket,
        LogLevel.INFO,
        'join_presentation_success',
        {
          presentationId: session.presentationId,
          sessionId: session.sessionId,
        }
      );

      console.log(`✅ 参加者がプレゼンテーションに参加: ${session.presentationId} (Session: ${session.sessionId})`);

    } catch (error) {
      console.error('❌ プレゼンテーション参加エラー:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'サーバーエラーが発生しました';
      this.sendErrorResponse(callback, errorMessage);

      WebSocketLoggingMiddleware.logCustomEvent(
        socket,
        LogLevel.ERROR,
        'join_presentation_error',
        { accessCode: request.accessCode },
        errorMessage
      );

      this.handleError(socket, error as Error, 'プレゼンテーション参加');
    }
  }

  /**
   * プレゼンテーション離脱処理
   */
  private async handleLeavePresentation(
    socket: TypedSocket,
    request: LeavePresentationRequest
  ): Promise<void> {
    try {
      console.log(`👋 プレゼンテーション離脱要求: Socket ${socket.id}, Presentation: ${request.presentationId}`);

      const session = this.participantSessions.get(socket.id);
      if (!session) {
        console.warn(`⚠️ 参加していないセッション: Socket ${socket.id}`);
        return;
      }

      if (session.presentationId !== request.presentationId) {
        console.warn(`⚠️ 異なるプレゼンテーション: 要求=${request.presentationId}, セッション=${session.presentationId}`);
        return;
      }

      await this.leavePresentation(socket, session);

      WebSocketLoggingMiddleware.logCustomEvent(
        socket,
        LogLevel.INFO,
        'leave_presentation_success',
        {
          presentationId: request.presentationId,
          sessionId: request.sessionId,
        }
      );

      console.log(`✅ 参加者がプレゼンテーションを離脱: ${request.presentationId}`);

    } catch (error) {
      console.error('❌ プレゼンテーション離脱エラー:', error);
      
      WebSocketLoggingMiddleware.logCustomEvent(
        socket,
        LogLevel.ERROR,
        'leave_presentation_error',
        { presentationId: request.presentationId },
        error instanceof Error ? error.message : 'Unknown error'
      );

      this.handleError(socket, error as Error, 'プレゼンテーション離脱');
    }
  }

  /**
   * ソケット切断時の処理
   */
  private async handleSocketDisconnect(socket: TypedSocket, reason: string): Promise<void> {
    console.log(`🔌 参加者ソケット切断: ${socket.id} (理由: ${reason})`);

    const session = this.participantSessions.get(socket.id);
    if (session) {
      await this.leavePresentation(socket, session);
    }

    WebSocketLoggingMiddleware.logCustomEvent(
      socket,
      LogLevel.INFO,
      'participant_disconnected',
      {
        reason,
        sessionInfo: session ? {
          presentationId: session.presentationId,
          sessionId: session.sessionId,
          duration: Date.now() - session.joinedAt.getTime(),
        } : null,
      }
    );

    this.handleDisconnect(socket, reason);
  }

  /**
   * プレゼンテーション離脱処理（共通）
   */
  private async leavePresentation(socket: TypedSocket, session: ParticipantSession): Promise<void> {
    // プレゼンテーションルームから離脱
    this.leavePresentationRoom(socket, session.presentationId);

    // プレゼンターに離脱通知
    this.notifyPresenterParticipantLeft(session.presentationId, {
      sessionId: session.sessionId,
      leftAt: new Date(),
    });

    // 他の参加者に離脱通知
    this.notifyOtherParticipants(socket, session.presentationId, 'participant:left', {
      presentationId: session.presentationId,
      participantCount: await this.getPresentationParticipantCount(session.presentationId) - 1, // 自分を除く
      timestamp: new Date().toISOString(),
    });

    // セッション削除
    this.participantSessions.delete(socket.id);
  }

  /**
   * プレゼンターに参加者参加通知
   */
  private notifyPresenterParticipantJoined(presentationId: PresentationId, data: any): void {
    const presenterRoomName = this.getPresenterRoomName(presentationId);
    const presenterNS = this.namespace.server.of('/presenter');
    
    presenterNS.to(presenterRoomName).emit('participant:joined', {
      presentationId,
      ...data,
      timestamp: new Date().toISOString(),
    });

    console.log(`📢 プレゼンターに参加通知: ${presenterRoomName}`);
  }

  /**
   * プレゼンターに参加者離脱通知
   */
  private notifyPresenterParticipantLeft(presentationId: PresentationId, data: any): void {
    const presenterRoomName = this.getPresenterRoomName(presentationId);
    const presenterNS = this.namespace.server.of('/presenter');
    
    presenterNS.to(presenterRoomName).emit('participant:left', {
      presentationId,
      ...data,
      timestamp: new Date().toISOString(),
    });

    console.log(`📢 プレゼンターに離脱通知: ${presenterRoomName}`);
  }

  /**
   * 他の参加者に通知
   */
  private notifyOtherParticipants(
    socket: TypedSocket,
    presentationId: PresentationId,
    event: keyof import('./BaseHandler').ServerToClientEvents,
    data: any
  ): void {
    const roomName = this.getPresentationRoomName(presentationId);
    socket.to(roomName).emit(event, data);

    console.log(`📢 参加者に通知: ${event} -> ${roomName}`);
  }

  /**
   * プレゼンテーション参加者数を取得
   */
  private async getPresentationParticipantCount(presentationId: PresentationId): Promise<number> {
    const roomName = this.getPresentationRoomName(presentationId);
    const sockets = await this.namespace.in(roomName).fetchSockets();
    return sockets.length;
  }

  /**
   * 非アクティブセッションのクリーンアップ
   */
  private cleanupInactiveSessions(): void {
    const now = Date.now();
    const maxInactiveTime = 30 * 60 * 1000; // 30分

    for (const [socketId, session] of this.participantSessions.entries()) {
      if (now - session.lastActivity.getTime() > maxInactiveTime) {
        console.log(`🧹 非アクティブセッションをクリーンアップ: ${socketId} (Session: ${session.sessionId})`);
        this.participantSessions.delete(socketId);
      }
    }
  }

  /**
   * スライド変更通知を全参加者に送信
   */
  public notifySlideChanged(presentationId: PresentationId, slideData: any): void {
    const roomName = this.getPresentationRoomName(presentationId);
    
    this.namespace.to(roomName).emit('slide:changed', {
      presentationId,
      ...slideData,
      timestamp: new Date().toISOString(),
    });

    console.log(`📢 スライド変更通知: ${roomName}`);
  }

  /**
   * プレゼンテーション開始通知を全参加者に送信
   */
  public notifyPresentationStarted(presentationId: PresentationId, data: any): void {
    const roomName = this.getPresentationRoomName(presentationId);
    
    this.namespace.to(roomName).emit('presentation:started', {
      presentationId,
      ...data,
      timestamp: new Date().toISOString(),
    });

    console.log(`📢 プレゼンテーション開始通知: ${roomName}`);
  }

  /**
   * プレゼンテーション終了通知を全参加者に送信
   */
  public notifyPresentationStopped(presentationId: PresentationId, data: any): void {
    const roomName = this.getPresentationRoomName(presentationId);
    
    this.namespace.to(roomName).emit('presentation:stopped', {
      presentationId,
      ...data,
      timestamp: new Date().toISOString(),
    });

    console.log(`📢 プレゼンテーション終了通知: ${roomName}`);
  }

  /**
   * 現在の参加者セッション情報を取得
   */
  public getParticipantSessions(): Map<string, ParticipantSession> {
    return new Map(this.participantSessions);
  }

  /**
   * 特定プレゼンテーションの参加者セッション数を取得
   */
  public getPresentationParticipantSessionCount(presentationId: PresentationId): number {
    return Array.from(this.participantSessions.values())
      .filter(session => session.presentationId === presentationId).length;
  }
}