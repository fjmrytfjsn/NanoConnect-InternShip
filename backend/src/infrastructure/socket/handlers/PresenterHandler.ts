/**
 * プレゼンター向けSocket.IOハンドラー
 * プレゼンテーション制御のリアルタイム機能を提供
 */

import { BaseHandler, TypedSocket, TypedNamespace } from './BaseHandler';
import { WebSocketAuthMiddleware, AuthenticatedSocket } from '../middleware/AuthMiddleware';
import { ControlPresentationRealtimeUseCase } from '@/application/useCases/presentation/ControlPresentationRealtimeUseCase';
import { SocketManager } from '../SocketManager';
import { PresentationId } from '@/types/common';

/**
 * WebSocketイベント用のデータ型定義
 */
export interface ControlStartData {
  presentationId: PresentationId;
}

export interface ControlStopData {
  presentationId: PresentationId;
}

export interface ControlGoToSlideData {
  presentationId: PresentationId;
  slideIndex: number;
}

export interface ControlNextSlideData {
  presentationId: PresentationId;
}

export interface ControlPrevSlideData {
  presentationId: PresentationId;
}

/**
 * WebSocketレスポンス用のデータ型定義
 */
export interface ControlResponse {
  success: boolean;
  message: string;
  presentationId: PresentationId;
  currentSlideIndex?: number;
  totalSlides?: number;
  isActive?: boolean;
}

/**
 * プレゼンテーション状態ブロードキャスト用データ
 */
export interface PresentationStateData {
  presentationId: PresentationId;
  isActive: boolean;
  currentSlideIndex: number;
  totalSlides: number;
}

/**
 * 参加者数更新ブロードキャスト用データ
 */
export interface ParticipantCountData {
  presentationId: PresentationId;
  count: number;
}

/**
 * プレゼンター向けSocket.IOハンドラー
 */
export class PresenterHandler extends BaseHandler {
  private controlUseCase: ControlPresentationRealtimeUseCase;
  private socketManager: SocketManager;

  constructor(
    namespace: TypedNamespace,
    controlUseCase: ControlPresentationRealtimeUseCase,
    socketManager: SocketManager
  ) {
    super(namespace);
    this.controlUseCase = controlUseCase;
    this.socketManager = socketManager;
  }

  /**
   * ハンドラーの初期化
   */
  public initialize(): void {
    // プレゼンター認証ミドルウェアを適用
    this.namespace.use(WebSocketAuthMiddleware.createAuthMiddleware());
    this.namespace.use(WebSocketAuthMiddleware.requirePresenterRole());

    // 接続時の処理を設定
    this.namespace.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    console.log('🎯 プレゼンターハンドラーが初期化されました');
  }

  /**
   * ソケット接続時の処理
   */
  public handleConnection(socket: TypedSocket): void {
    const authSocket = socket as AuthenticatedSocket;
    const { userId, username } = authSocket.data;

    console.log(`🎯 プレゼンター接続: ${username} (ID: ${userId}, Socket: ${socket.id})`);

    // プレゼンテーション制御イベントのハンドラー登録
    this.registerControlEventHandlers(socket);

    // 参加者管理イベントのハンドラー登録  
    this.registerParticipantManagementHandlers(socket);

    // 切断処理
    socket.on('disconnect', (reason) => {
      this.handlePresenterDisconnect(socket, reason);
    });
  }

  /**
   * プレゼンテーション制御イベントハンドラーの登録
   */
  private registerControlEventHandlers(socket: TypedSocket): void {
    const authSocket = socket as AuthenticatedSocket;

    // プレゼンテーション開始
    socket.on('control:start', async (data: ControlStartData, callback) => {
      try {
        const result = await this.controlUseCase.startPresentation({
          presentationId: data.presentationId,
          presenterId: authSocket.data.userId,
        });

        const response: ControlResponse = {
          success: result.success,
          message: result.message,
          presentationId: data.presentationId,
          currentSlideIndex: result.currentSlideIndex,
          totalSlides: result.totalSlides,
          isActive: result.isActive,
        };

        this.sendSuccessResponse(callback, response);

        // 成功時は参加者にブロードキャスト
        if (result.success) {
          await this.broadcastPresentationStart(data.presentationId);
          console.log(`🚀 プレゼンテーション開始: ${data.presentationId}`);
        }
      } catch (error) {
        this.handleError(socket, error as Error, 'プレゼンテーション開始');
        this.sendErrorResponse(callback, 'プレゼンテーション開始中にエラーが発生しました', {
          presentationId: data.presentationId,
        });
      }
    });

    // プレゼンテーション停止
    socket.on('control:stop', async (data: ControlStopData, callback) => {
      try {
        const result = await this.controlUseCase.stopPresentation({
          presentationId: data.presentationId,
          presenterId: authSocket.data.userId,
        });

        const response: ControlResponse = {
          success: result.success,
          message: result.message,
          presentationId: data.presentationId,
          currentSlideIndex: result.currentSlideIndex,
          totalSlides: result.totalSlides,
          isActive: result.isActive,
        };

        this.sendSuccessResponse(callback, response);

        // 成功時は参加者にブロードキャスト
        if (result.success) {
          await this.broadcastPresentationStop(data.presentationId);
          console.log(`⏹️ プレゼンテーション停止: ${data.presentationId}`);
        }
      } catch (error) {
        this.handleError(socket, error as Error, 'プレゼンテーション停止');
        this.sendErrorResponse(callback, 'プレゼンテーション停止中にエラーが発生しました', {
          presentationId: data.presentationId,
        });
      }
    });

    // 次のスライドへ移動
    socket.on('control:next-slide', async (data: ControlNextSlideData, callback) => {
      try {
        const result = await this.controlUseCase.nextSlide({
          presentationId: data.presentationId,
          presenterId: authSocket.data.userId,
        });

        const response: ControlResponse = {
          success: result.success,
          message: result.message,
          presentationId: data.presentationId,
          currentSlideIndex: result.currentSlideIndex,
          totalSlides: result.totalSlides,
          isActive: result.isActive,
        };

        this.sendSuccessResponse(callback, response);

        // 成功時は参加者にスライド変更をブロードキャスト
        if (result.success && result.currentSlideIndex !== undefined) {
          await this.broadcastSlideChange(data.presentationId, result.currentSlideIndex);
          console.log(`➡️ 次のスライドへ移動: ${data.presentationId}, スライド: ${result.currentSlideIndex}`);
        }
      } catch (error) {
        this.handleError(socket, error as Error, '次のスライドへ移動');
        this.sendErrorResponse(callback, '次のスライドへ移動中にエラーが発生しました', {
          presentationId: data.presentationId,
        });
      }
    });

    // 前のスライドへ移動
    socket.on('control:prev-slide', async (data: ControlPrevSlideData, callback) => {
      try {
        const result = await this.controlUseCase.prevSlide({
          presentationId: data.presentationId,
          presenterId: authSocket.data.userId,
        });

        const response: ControlResponse = {
          success: result.success,
          message: result.message,
          presentationId: data.presentationId,
          currentSlideIndex: result.currentSlideIndex,
          totalSlides: result.totalSlides,
          isActive: result.isActive,
        };

        this.sendSuccessResponse(callback, response);

        // 成功時は参加者にスライド変更をブロードキャスト
        if (result.success && result.currentSlideIndex !== undefined) {
          await this.broadcastSlideChange(data.presentationId, result.currentSlideIndex);
          console.log(`⬅️ 前のスライドへ移動: ${data.presentationId}, スライド: ${result.currentSlideIndex}`);
        }
      } catch (error) {
        this.handleError(socket, error as Error, '前のスライドへ移動');
        this.sendErrorResponse(callback, '前のスライドへ移動中にエラーが発生しました', {
          presentationId: data.presentationId,
        });
      }
    });

    // 指定スライドへ移動
    socket.on('control:goto-slide', async (data: ControlGoToSlideData, callback) => {
      try {
        const result = await this.controlUseCase.goToSlide({
          presentationId: data.presentationId,
          presenterId: authSocket.data.userId,
          slideIndex: data.slideIndex,
        });

        const response: ControlResponse = {
          success: result.success,
          message: result.message,
          presentationId: data.presentationId,
          currentSlideIndex: result.currentSlideIndex,
          totalSlides: result.totalSlides,
          isActive: result.isActive,
        };

        this.sendSuccessResponse(callback, response);

        // 成功時は参加者にスライド変更をブロードキャスト
        if (result.success && result.currentSlideIndex !== undefined) {
          await this.broadcastSlideChange(data.presentationId, result.currentSlideIndex);
          console.log(`🎯 指定スライドへ移動: ${data.presentationId}, スライド: ${result.currentSlideIndex}`);
        }
      } catch (error) {
        this.handleError(socket, error as Error, '指定スライドへ移動');
        this.sendErrorResponse(callback, '指定スライドへ移動中にエラーが発生しました', {
          presentationId: data.presentationId,
        });
      }
    });
  }

  /**
   * 参加者管理イベントハンドラーの登録
   */
  private registerParticipantManagementHandlers(socket: TypedSocket): void {
    // プレゼンテーション参加者数リクエスト
    socket.on('get:participant-count', async (data: { presentationId: PresentationId }, callback) => {
      try {
        const count = await this.socketManager.getPresentationParticipantCount(data.presentationId);
        
        const response = {
          success: true,
          presentationId: data.presentationId,
          count,
        };

        this.sendSuccessResponse(callback, response);
      } catch (error) {
        this.handleError(socket, error as Error, '参加者数取得');
        this.sendErrorResponse(callback, '参加者数取得中にエラーが発生しました', {
          presentationId: data.presentationId,
        });
      }
    });
  }

  /**
   * プレゼンテーション開始をブロードキャスト
   */
  private async broadcastPresentationStart(presentationId: PresentationId): Promise<void> {
    const broadcastData = {
      presentationId,
      timestamp: new Date().toISOString(),
    };

    // 参加者にブロードキャスト
    this.socketManager.broadcastToPresentationParticipants(
      presentationId,
      'presentation:started',
      broadcastData
    );

    // プレゼンターにも通知（他のプレゼンターセッション用）
    this.socketManager.broadcastToPresentationPresenters(
      presentationId,
      'presentation:started',
      broadcastData
    );
  }

  /**
   * プレゼンテーション停止をブロードキャスト
   */
  private async broadcastPresentationStop(presentationId: PresentationId): Promise<void> {
    const broadcastData = {
      presentationId,
      timestamp: new Date().toISOString(),
    };

    // 参加者にブロードキャスト
    this.socketManager.broadcastToPresentationParticipants(
      presentationId,
      'presentation:stopped',
      broadcastData
    );

    // プレゼンターにも通知
    this.socketManager.broadcastToPresentationPresenters(
      presentationId,
      'presentation:stopped',
      broadcastData
    );
  }

  /**
   * スライド変更をブロードキャスト
   */
  private async broadcastSlideChange(presentationId: PresentationId, slideIndex: number): Promise<void> {
    const broadcastData = {
      presentationId,
      slideIndex,
      timestamp: new Date().toISOString(),
    };

    // 参加者にブロードキャスト
    this.socketManager.broadcastToPresentationParticipants(
      presentationId,
      'slide:changed',
      broadcastData
    );

    // プレゼンターにも通知（他のプレゼンターセッション用）
    this.socketManager.broadcastToPresentationPresenters(
      presentationId,
      'slide:changed',
      broadcastData
    );
  }

  /**
   * 参加者数変更をプレゼンターにブロードキャスト
   */
  public async broadcastParticipantCountChange(presentationId: PresentationId): Promise<void> {
    const count = await this.socketManager.getPresentationParticipantCount(presentationId);
    
    const broadcastData: ParticipantCountData = {
      presentationId,
      count,
    };

    this.socketManager.broadcastToPresentationPresenters(
      presentationId,
      'participant:count-changed',
      broadcastData
    );
  }

  /**
   * プレゼンター切断処理
   */
  private handlePresenterDisconnect(socket: TypedSocket, reason: string): void {
    const authSocket = socket as AuthenticatedSocket;
    const { userId, username } = authSocket.data;

    console.log(`🔌 プレゼンター切断: ${username} (ID: ${userId}, Socket: ${socket.id}), 理由: ${reason}`);
    
    // 必要に応じてプレゼンター専用ルームからの退出処理
    // 現在は自動的に行われるため、追加の処理は不要
  }
}