/**
 * プレゼンター用WebSocketハンドラー
 * プレゼンテーション制御のリアルタイム機能を提供
 */

import { BaseHandler, TypedSocket, TypedNamespace } from './BaseHandler';
import { WebSocketAuthMiddleware } from '../middleware/AuthMiddleware';
import { WebSocketLoggingMiddleware, LogLevel } from '../middleware/LoggingMiddleware';
import { ControlPresentationRealtimeUseCase, IRealtimeBroadcaster } from '@/application/useCases/presentation/ControlPresentationRealtime';
import { IPresentationRepository } from '@/domain/repositories/IPresentationRepository';
import { ISlideRepository } from '@/domain/repositories/ISlideRepository';
import { PresentationId, UserId } from '@/types/common';
import {
  StartPresentationEvent,
  StopPresentationEvent,
  NextSlideEvent,
  PrevSlideEvent,
  GotoSlideEvent,
} from 'shared/types/socket';

/**
 * SocketManagerアダプター（循環依存を避けるため）
 */
export class SocketManagerAdapter implements IRealtimeBroadcaster {
  constructor(private socketManager: any) {}

  broadcastToPresentationParticipants<K extends string>(
    presentationId: PresentationId,
    event: K,
    data: any
  ): void {
    this.socketManager.broadcastToPresentationParticipants(presentationId, event, data);
  }

  broadcastToPresentationPresenters<K extends string>(
    presentationId: PresentationId,
    event: K,
    data: any
  ): void {
    this.socketManager.broadcastToPresentationPresenters(presentationId, event, data);
  }

  async getPresentationParticipantCount(presentationId: PresentationId): Promise<number> {
    return this.socketManager.getPresentationParticipantCount(presentationId);
  }
}

/**
 * プレゼンター用WebSocketハンドラー
 */
export class PresenterHandler extends BaseHandler {
  private controlUseCase: ControlPresentationRealtimeUseCase;

  constructor(
    namespace: TypedNamespace,
    presentationRepository: IPresentationRepository,
    slideRepository: ISlideRepository,
    socketManagerAdapter: SocketManagerAdapter
  ) {
    super(namespace);
    
    this.controlUseCase = new ControlPresentationRealtimeUseCase(
      presentationRepository,
      slideRepository,
      socketManagerAdapter
    );
  }

  /**
   * ハンドラーの初期化
   */
  public initialize(): void {
    console.log('📡 PresenterHandler初期化完了');
  }

  /**
   * ソケット接続時の処理
   */
  public handleConnection(socket: TypedSocket): void {
    console.log(`🎯 プレゼンター接続: ${socket.id}`);

    // イベントハンドラーを設定
    this.setupEventHandlers(socket);

    // 切断処理
    socket.on('disconnect', (reason) => {
      this.handlePresenterDisconnect(socket, reason);
    });
  }

  /**
   * プレゼンター用イベントハンドラーの設定
   */
  private setupEventHandlers(socket: TypedSocket): void {
    // プレゼンテーション制御イベント
    socket.on('control:start', (data: StartPresentationEvent) => {
      this.handleStartPresentation(socket, data);
    });

    socket.on('control:stop', (data: StopPresentationEvent) => {
      this.handleStopPresentation(socket, data);
    });

    // スライド制御イベント
    socket.on('control:next-slide', (data: NextSlideEvent) => {
      this.handleNextSlide(socket, data);
    });

    socket.on('control:prev-slide', (data: PrevSlideEvent) => {
      this.handlePrevSlide(socket, data);
    });

    socket.on('control:goto-slide', (data: GotoSlideEvent) => {
      this.handleGotoSlide(socket, data);
    });
  }

  /**
   * プレゼンテーション開始処理
   */
  private async handleStartPresentation(socket: TypedSocket, data: StartPresentationEvent): Promise<void> {
    try {
      WebSocketLoggingMiddleware.logCustomEvent(
        socket,
        LogLevel.INFO,
        'presentation_start_request',
        { presentationId: data.presentationId }
      );

      // 認証情報を取得
      const authData = WebSocketAuthMiddleware.getAuthData(socket);
      if (!authData) {
        this.handleError(socket, new Error('認証情報が見つかりません'), 'プレゼンテーション開始');
        return;
      }

      // バリデーション
      if (!data.presentationId) {
        this.handleError(socket, new Error('プレゼンテーションIDが必要です'), 'プレゼンテーション開始');
        return;
      }

      // プレゼンテーション開始処理
      const result = await this.controlUseCase.startPresentation(
        data.presentationId,
        authData.userId as UserId
      );

      if (!result.success) {
        socket.emit('error', {
          code: 'PRESENTATION_START_FAILED',
          message: result.message || 'プレゼンテーションの開始に失敗しました',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // プレゼンター専用Roomに参加
      this.joinPresenterRoom(socket, data.presentationId);

      WebSocketLoggingMiddleware.logCustomEvent(
        socket,
        LogLevel.INFO,
        'presentation_started',
        { presentationId: data.presentationId }
      );

      console.log(`✅ プレゼンテーション開始成功: ${data.presentationId} by ${authData.username}`);
    } catch (error) {
      this.handleError(socket, error as Error, 'プレゼンテーション開始');
    }
  }

  /**
   * プレゼンテーション停止処理
   */
  private async handleStopPresentation(socket: TypedSocket, data: StopPresentationEvent): Promise<void> {
    try {
      WebSocketLoggingMiddleware.logCustomEvent(
        socket,
        LogLevel.INFO,
        'presentation_stop_request',
        { presentationId: data.presentationId }
      );

      // 認証情報を取得
      const authData = WebSocketAuthMiddleware.getAuthData(socket);
      if (!authData) {
        this.handleError(socket, new Error('認証情報が見つかりません'), 'プレゼンテーション停止');
        return;
      }

      // バリデーション
      if (!data.presentationId) {
        this.handleError(socket, new Error('プレゼンテーションIDが必要です'), 'プレゼンテーション停止');
        return;
      }

      // プレゼンテーション停止処理
      const result = await this.controlUseCase.stopPresentation(
        data.presentationId,
        authData.userId as UserId
      );

      if (!result.success) {
        socket.emit('error', {
          code: 'PRESENTATION_STOP_FAILED',
          message: result.message || 'プレゼンテーションの停止に失敗しました',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // プレゼンター専用Roomから退出
      this.leavePresenterRoom(socket, data.presentationId);

      WebSocketLoggingMiddleware.logCustomEvent(
        socket,
        LogLevel.INFO,
        'presentation_stopped',
        { presentationId: data.presentationId }
      );

      console.log(`⏹️ プレゼンテーション停止成功: ${data.presentationId} by ${authData.username}`);
    } catch (error) {
      this.handleError(socket, error as Error, 'プレゼンテーション停止');
    }
  }

  /**
   * 次のスライド処理
   */
  private async handleNextSlide(socket: TypedSocket, data: NextSlideEvent): Promise<void> {
    try {
      WebSocketLoggingMiddleware.logCustomEvent(
        socket,
        LogLevel.INFO,
        'next_slide_request',
        { presentationId: data.presentationId }
      );

      // 認証情報を取得
      const authData = WebSocketAuthMiddleware.getAuthData(socket);
      if (!authData) {
        this.handleError(socket, new Error('認証情報が見つかりません'), '次のスライド');
        return;
      }

      // バリデーション
      if (!data.presentationId) {
        this.handleError(socket, new Error('プレゼンテーションIDが必要です'), '次のスライド');
        return;
      }

      // 次のスライドに移動
      const result = await this.controlUseCase.nextSlide(
        data.presentationId,
        authData.userId as UserId
      );

      if (!result.success) {
        socket.emit('error', {
          code: 'SLIDE_CHANGE_FAILED',
          message: result.message || '次のスライドへの移動に失敗しました',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      WebSocketLoggingMiddleware.logCustomEvent(
        socket,
        LogLevel.INFO,
        'next_slide_success',
        { presentationId: data.presentationId }
      );

      console.log(`▶️ 次のスライド成功: ${data.presentationId} by ${authData.username}`);
    } catch (error) {
      this.handleError(socket, error as Error, '次のスライド');
    }
  }

  /**
   * 前のスライド処理
   */
  private async handlePrevSlide(socket: TypedSocket, data: PrevSlideEvent): Promise<void> {
    try {
      WebSocketLoggingMiddleware.logCustomEvent(
        socket,
        LogLevel.INFO,
        'prev_slide_request',
        { presentationId: data.presentationId }
      );

      // 認証情報を取得
      const authData = WebSocketAuthMiddleware.getAuthData(socket);
      if (!authData) {
        this.handleError(socket, new Error('認証情報が見つかりません'), '前のスライド');
        return;
      }

      // バリデーション
      if (!data.presentationId) {
        this.handleError(socket, new Error('プレゼンテーションIDが必要です'), '前のスライド');
        return;
      }

      // 前のスライドに移動
      const result = await this.controlUseCase.prevSlide(
        data.presentationId,
        authData.userId as UserId
      );

      if (!result.success) {
        socket.emit('error', {
          code: 'SLIDE_CHANGE_FAILED',
          message: result.message || '前のスライドへの移動に失敗しました',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      WebSocketLoggingMiddleware.logCustomEvent(
        socket,
        LogLevel.INFO,
        'prev_slide_success',
        { presentationId: data.presentationId }
      );

      console.log(`◀️ 前のスライド成功: ${data.presentationId} by ${authData.username}`);
    } catch (error) {
      this.handleError(socket, error as Error, '前のスライド');
    }
  }

  /**
   * 指定スライドへの移動処理
   */
  private async handleGotoSlide(socket: TypedSocket, data: GotoSlideEvent): Promise<void> {
    try {
      WebSocketLoggingMiddleware.logCustomEvent(
        socket,
        LogLevel.INFO,
        'goto_slide_request',
        { presentationId: data.presentationId, slideIndex: data.slideIndex }
      );

      // 認証情報を取得
      const authData = WebSocketAuthMiddleware.getAuthData(socket);
      if (!authData) {
        this.handleError(socket, new Error('認証情報が見つかりません'), '指定スライド移動');
        return;
      }

      // バリデーション
      if (!data.presentationId) {
        this.handleError(socket, new Error('プレゼンテーションIDが必要です'), '指定スライド移動');
        return;
      }

      if (typeof data.slideIndex !== 'number' || data.slideIndex < 0) {
        this.handleError(socket, new Error('有効なスライドインデックスが必要です'), '指定スライド移動');
        return;
      }

      // 指定スライドに移動
      const result = await this.controlUseCase.gotoSlide(
        data.presentationId,
        data.slideIndex,
        authData.userId as UserId
      );

      if (!result.success) {
        socket.emit('error', {
          code: 'SLIDE_CHANGE_FAILED',
          message: result.message || '指定スライドへの移動に失敗しました',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      WebSocketLoggingMiddleware.logCustomEvent(
        socket,
        LogLevel.INFO,
        'goto_slide_success',
        { presentationId: data.presentationId, slideIndex: data.slideIndex }
      );

      console.log(`🎯 スライド移動成功: ${data.presentationId} -> ${data.slideIndex} by ${authData.username}`);
    } catch (error) {
      this.handleError(socket, error as Error, '指定スライド移動');
    }
  }

  /**
   * プレゼンター切断処理
   */
  private handlePresenterDisconnect(socket: TypedSocket, reason: string): void {
    const authData = WebSocketAuthMiddleware.getAuthData(socket);
    const username = authData?.username || 'Unknown';

    WebSocketLoggingMiddleware.logCustomEvent(
      socket,
      LogLevel.INFO,
      'presenter_disconnect',
      { reason, username }
    );

    console.log(`🔌 プレゼンター切断: ${socket.id} (${username}) - 理由: ${reason}`);

    // 必要に応じて、プレゼンテーションの自動停止処理を実装
    // this.handleAutoStopPresentation(socket);
  }

  /**
   * プレゼンテーション自動停止処理（将来の実装用）
   */
  // private async handleAutoStopPresentation(socket: TypedSocket): Promise<void> {
  //   // プレゼンター切断時の自動停止ロジックを実装
  //   // 現在はコメントアウト（要件に応じて実装）
  // }
}