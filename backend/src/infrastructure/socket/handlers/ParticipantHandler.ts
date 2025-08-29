/**
 * 参加者向けWebSocketイベントハンドラー
 * プレゼンテーション参加、リアルタイム同期、参加者管理を処理
 */

import { TypedSocket, TypedNamespace, BaseHandler } from './BaseHandler';
import { WebSocketLoggingMiddleware, LogLevel } from '../middleware/LoggingMiddleware';
import { WebSocketAuthMiddleware } from '../middleware/AuthMiddleware';
import { JoinPresentationRealtimeUseCase, JoinPresentationRealtimeRequestDto } from '@/application/useCases/participant/JoinPresentationRealtime';
import { IPresentationRepository } from '@/domain/repositories/IPresentationRepository';
import { PresentationId } from '@/types/common';

/**
 * 参加者イベント用のインターフェース
 */
interface JoinPresentationEventData {
  accessCode: string;
  participantName?: string;
}

interface LeavePresentationEventData {
  sessionId?: string;
}

interface SubmitResponseEventData {
  slideId: string;
  responseType: 'multiple_choice' | 'word_cloud' | 'free_text';
  response: string | string[];
}

/**
 * 参加者WebSocketハンドラー
 */
export class ParticipantHandler extends BaseHandler {
  private joinPresentationUseCase: JoinPresentationRealtimeUseCase;
  private presentationRepository: IPresentationRepository;
  
  // セッション管理用のマップ
  private sessionSocketMap: Map<string, string> = new Map(); // sessionId -> socketId
  private socketSessionMap: Map<string, string> = new Map(); // socketId -> sessionId

  constructor(
    namespace: TypedNamespace,
    presentationRepository: IPresentationRepository
  ) {
    super(namespace);
    this.presentationRepository = presentationRepository;
    this.joinPresentationUseCase = new JoinPresentationRealtimeUseCase(presentationRepository);
  }

  /**
   * ハンドラーの初期化
   */
  public initialize(): void {
    this.namespace.on('connection', (socket: TypedSocket) => {
      this.handleConnection(socket);
    });

    console.log('📱 ParticipantHandler初期化完了');
    
    // 定期的に非アクティブな参加者をクリーンアップ
    this.startCleanupTimer();
  }

  /**
   * ソケット接続処理
   */
  public handleConnection(socket: TypedSocket): void {
    WebSocketLoggingMiddleware.logCustomEvent(socket, LogLevel.INFO, 'participant_connected');

    // プレゼンテーション参加イベント
    socket.on('join:presentation', async (data: JoinPresentationEventData, callback) => {
      await this.handleJoinPresentation(socket, data, callback);
    });

    // プレゼンテーション離脱イベント
    socket.on('leave:presentation', (data: LeavePresentationEventData) => {
      this.handleLeavePresentation(socket, data);
    });

    // レスポンス送信イベント（将来の拡張用）
    socket.on('submit:response', async (data: SubmitResponseEventData, callback) => {
      await this.handleSubmitResponse(socket, data, callback);
    });

    // 接続断処理
    socket.on('disconnect', (reason) => {
      this.handleDisconnect(socket, reason);
    });

    // エラーハンドリング
    socket.on('error', (error) => {
      this.handleError(socket, error, 'participant_socket_error');
    });
  }

  /**
   * プレゼンテーション参加処理
   */
  private async handleJoinPresentation(
    socket: TypedSocket,
    data: JoinPresentationEventData,
    callback: (response: any) => void
  ): Promise<void> {
    try {
      WebSocketLoggingMiddleware.logCustomEvent(
        socket,
        LogLevel.INFO,
        'join_presentation_request',
        { accessCode: data.accessCode }
      );

      // 既に参加している場合は先に退出処理
      const existingSessionId = this.socketSessionMap.get(socket.id);
      if (existingSessionId) {
        this.handleLeavePresentation(socket, { sessionId: existingSessionId });
      }

      // 参加処理実行
      const request: JoinPresentationRealtimeRequestDto = {
        accessCode: data.accessCode,
        participantName: data.participantName,
        socketId: socket.id,
      };

      const response = await this.joinPresentationUseCase.execute(request);

      if (response.success) {
        // セッション管理マップを更新
        this.sessionSocketMap.set(response.sessionId, socket.id);
        this.socketSessionMap.set(socket.id, response.sessionId);

        // プレゼンテーションルームに参加
        this.joinPresentationRoom(socket, response.presentation.id);

        // 参加者参加イベントを他の参加者とプレゼンターに通知
        this.broadcastParticipantJoined(response.presentation.id, {
          sessionId: response.sessionId,
          name: response.participant.name,
          isAnonymous: response.participant.isAnonymous,
          joinedAt: response.participant.joinedAt,
          participantCount: response.presentation.participantCount,
        });

        WebSocketLoggingMiddleware.logCustomEvent(
          socket,
          LogLevel.INFO,
          'join_presentation_success',
          {
            presentationId: response.presentation.id,
            participantName: response.participant.name,
            sessionId: response.sessionId,
          }
        );
      } else {
        WebSocketLoggingMiddleware.logCustomEvent(
          socket,
          LogLevel.WARN,
          'join_presentation_failed',
          { error: response.error }
        );
      }

      // レスポンスを送信
      this.sendSuccessResponse(callback, response);

    } catch (error) {
      console.error('❌ プレゼンテーション参加エラー:', error);
      
      WebSocketLoggingMiddleware.logCustomEvent(
        socket,
        LogLevel.ERROR,
        'join_presentation_error',
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );

      this.sendErrorResponse(callback, 'プレゼンテーションへの参加中にエラーが発生しました。', {
        success: false,
        sessionId: '',
        presentation: {
          id: '',
          title: '',
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
      });
    }
  }

  /**
   * プレゼンテーション離脱処理
   */
  private handleLeavePresentation(
    socket: TypedSocket,
    data: LeavePresentationEventData
  ): void {
    try {
      const sessionId = data.sessionId || this.socketSessionMap.get(socket.id);
      
      if (!sessionId) {
        WebSocketLoggingMiddleware.logCustomEvent(
          socket,
          LogLevel.WARN,
          'leave_presentation_no_session'
        );
        return;
      }

      // 参加者情報を取得
      const participant = this.joinPresentationUseCase.getParticipant(sessionId);
      
      if (participant) {
        // プレゼンテーションルームから退出
        this.leavePresentationRoom(socket, participant.presentationId);

        // 参加者を削除
        const leftParticipant = this.joinPresentationUseCase.leavePresentation(sessionId);
        
        if (leftParticipant) {
          // 参加者離脱イベントを他の参加者とプレゼンターに通知
          this.broadcastParticipantLeft(leftParticipant.presentationId, {
            sessionId: leftParticipant.sessionId,
            name: leftParticipant.participantName,
            participantCount: this.joinPresentationUseCase.getPresentationParticipantCount(leftParticipant.presentationId),
          });

          WebSocketLoggingMiddleware.logCustomEvent(
            socket,
            LogLevel.INFO,
            'leave_presentation_success',
            {
              presentationId: leftParticipant.presentationId,
              participantName: leftParticipant.participantName,
              sessionId: leftParticipant.sessionId,
            }
          );
        }
      }

      // セッション管理マップをクリーンアップ
      this.sessionSocketMap.delete(sessionId);
      this.socketSessionMap.delete(socket.id);

    } catch (error) {
      console.error('❌ プレゼンテーション離脱エラー:', error);
      WebSocketLoggingMiddleware.logCustomEvent(
        socket,
        LogLevel.ERROR,
        'leave_presentation_error',
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * レスポンス送信処理（将来の拡張用）
   */
  private async handleSubmitResponse(
    socket: TypedSocket,
    data: SubmitResponseEventData,
    callback: (response: any) => void
  ): Promise<void> {
    try {
      const sessionId = this.socketSessionMap.get(socket.id);
      
      if (!sessionId) {
        this.sendErrorResponse(callback, 'プレゼンテーションに参加していません。');
        return;
      }

      // 参加者のアクティビティを更新
      this.joinPresentationUseCase.updateParticipantActivity(sessionId);

      // 将来的にレスポンス処理ロジックを実装予定
      WebSocketLoggingMiddleware.logCustomEvent(
        socket,
        LogLevel.INFO,
        'response_submitted',
        {
          sessionId,
          slideId: data.slideId,
          responseType: data.responseType,
        }
      );

      this.sendSuccessResponse(callback, {
        success: true,
        message: 'レスポンスが送信されました。',
      });

    } catch (error) {
      console.error('❌ レスポンス送信エラー:', error);
      WebSocketLoggingMiddleware.logCustomEvent(
        socket,
        LogLevel.ERROR,
        'submit_response_error',
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );

      this.sendErrorResponse(callback, 'レスポンスの送信中にエラーが発生しました。');
    }
  }

  /**
   * 接続断処理
   */
  protected handleDisconnect(socket: TypedSocket, reason: string): void {
    const sessionId = this.socketSessionMap.get(socket.id);
    
    if (sessionId) {
      // 離脱処理を実行
      this.handleLeavePresentation(socket, { sessionId });
    }

    WebSocketLoggingMiddleware.logCustomEvent(
      socket,
      LogLevel.INFO,
      'participant_disconnected',
      { reason, sessionId }
    );

    super.handleDisconnect(socket, reason);
  }

  /**
   * 参加者参加通知をブロードキャスト
   */
  private broadcastParticipantJoined(
    presentationId: PresentationId,
    participantData: {
      sessionId: string;
      name: string;
      isAnonymous: boolean;
      joinedAt: string;
      participantCount: number;
    }
  ): void {
    // 同じプレゼンテーションの参加者に通知
    this.namespace.to(this.getPresentationRoomName(presentationId)).emit('participant:joined', {
      participant: participantData,
      timestamp: new Date().toISOString(),
    });

    // プレゼンターに通知（プレゼンター用の名前空間経由でブロードキャスト）
    const presenterNS = this.namespace.server.of('/presenter');
    presenterNS.to(this.getPresenterRoomName(presentationId)).emit('participant:joined', {
      participant: participantData,
      timestamp: new Date().toISOString(),
    });

    console.log(`📢 参加者参加通知をブロードキャスト: ${participantData.name} -> ${presentationId}`);
  }

  /**
   * 参加者離脱通知をブロードキャスト
   */
  private broadcastParticipantLeft(
    presentationId: PresentationId,
    participantData: {
      sessionId: string;
      name: string;
      participantCount: number;
    }
  ): void {
    // 同じプレゼンテーションの参加者に通知
    this.namespace.to(this.getPresentationRoomName(presentationId)).emit('participant:left', {
      participant: participantData,
      timestamp: new Date().toISOString(),
    });

    // プレゼンターに通知
    const presenterNS = this.namespace.server.of('/presenter');
    presenterNS.to(this.getPresenterRoomName(presentationId)).emit('participant:left', {
      participant: participantData,
      timestamp: new Date().toISOString(),
    });

    console.log(`📢 参加者離脱通知をブロードキャスト: ${participantData.name} -> ${presentationId}`);
  }

  /**
   * スライド変更通知をプレゼンテーション参加者にブロードキャスト
   */
  public broadcastSlideChanged(
    presentationId: PresentationId,
    slideData: {
      slideIndex: number;
      slideId?: string;
      title?: string;
      timestamp: string;
    }
  ): void {
    this.namespace.to(this.getPresentationRoomName(presentationId)).emit('slide:changed', slideData);
    console.log(`📢 スライド変更通知をブロードキャスト: スライド${slideData.slideIndex} -> ${presentationId}`);
  }

  /**
   * プレゼンテーション開始通知をブロードキャスト
   */
  public broadcastPresentationStarted(
    presentationId: PresentationId,
    presentationData: {
      title: string;
      currentSlideIndex: number;
      timestamp: string;
    }
  ): void {
    this.namespace.to(this.getPresentationRoomName(presentationId)).emit('presentation:started', presentationData);
    console.log(`📢 プレゼンテーション開始通知をブロードキャスト: ${presentationData.title} -> ${presentationId}`);
  }

  /**
   * プレゼンテーション終了通知をブロードキャスト
   */
  public broadcastPresentationStopped(
    presentationId: PresentationId,
    presentationData: {
      title: string;
      timestamp: string;
    }
  ): void {
    this.namespace.to(this.getPresentationRoomName(presentationId)).emit('presentation:stopped', presentationData);
    console.log(`📢 プレゼンテーション終了通知をブロードキャスト: ${presentationData.title} -> ${presentationId}`);
  }

  /**
   * プレゼンテーション参加者数の取得
   */
  public getPresentationParticipantCount(presentationId: PresentationId): number {
    return this.joinPresentationUseCase.getPresentationParticipantCount(presentationId);
  }

  /**
   * プレゼンテーション参加者一覧の取得
   */
  public getPresentationParticipants(presentationId: PresentationId) {
    return this.joinPresentationUseCase.getPresentationParticipants(presentationId);
  }

  /**
   * 非アクティブ参加者の定期クリーンアップを開始
   */
  private startCleanupTimer(): void {
    const cleanupInterval = 5 * 60 * 1000; // 5分間隔
    
    setInterval(() => {
      const inactiveParticipants = this.joinPresentationUseCase.cleanupInactiveParticipants(30); // 30分非アクティブ
      
      // 非アクティブな参加者の離脱通知を送信
      for (const participant of inactiveParticipants) {
        this.broadcastParticipantLeft(participant.presentationId, {
          sessionId: participant.sessionId,
          name: participant.participantName,
          participantCount: this.joinPresentationUseCase.getPresentationParticipantCount(participant.presentationId),
        });

        // セッション管理マップもクリーンアップ
        this.sessionSocketMap.delete(participant.sessionId);
        this.socketSessionMap.delete(participant.socketId);
      }
    }, cleanupInterval);
  }
}