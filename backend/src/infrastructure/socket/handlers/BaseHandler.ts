/**
 * Socket.IOハンドラー基盤クラス
 * 全てのSocket.IOイベントハンドラーの基底クラス
 */

import { Socket, Namespace } from 'socket.io';
import { PresentationId } from '@/types/common';

// Socket.IOイベント型定義（sharedから独立）
export interface ServerToClientEvents {
  'presentation:updated': (data: any) => void;
  'presentation:started': (data: any) => void;
  'presentation:stopped': (data: any) => void;
  'slide:changed': (data: any) => void;
  'slide:updated': (data: any) => void;
  'response:received': (data: any) => void;
  'analytics:updated': (data: any) => void;
  'participant:joined': (data: any) => void;
  'participant:left': (data: any) => void;
  error: (data: any) => void;
  notification: (data: any) => void;
}

export interface ClientToServerEvents {
  'join:presentation': (data: any, callback: (response: any) => void) => void;
  'submit:response': (data: any, callback: (response: any) => void) => void;
  'leave:presentation': (data: any) => void;
  'control:start': (data: any) => void;
  'control:stop': (data: any) => void;
  'control:next-slide': (data: any) => void;
  'control:prev-slide': (data: any) => void;
  'control:goto-slide': (data: any) => void;
}

export type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
export type TypedNamespace = Namespace<ClientToServerEvents, ServerToClientEvents>;

/**
 * Socket.IOハンドラーの基盤クラス
 */
export abstract class BaseHandler {
  protected namespace: TypedNamespace;

  constructor(namespace: TypedNamespace) {
    this.namespace = namespace;
  }

  /**
   * ハンドラーの初期化
   */
  public abstract initialize(): void;

  /**
   * ソケット接続時の処理
   */
  public abstract handleConnection(socket: TypedSocket): void;

  /**
   * プレゼンテーションルームに参加
   */
  protected joinPresentationRoom(socket: TypedSocket, presentationId: PresentationId): void {
    const roomName = this.getPresentationRoomName(presentationId);
    socket.join(roomName);
    console.log(`🏠 ソケット ${socket.id} がルーム ${roomName} に参加しました`);
  }

  /**
   * プレゼンテーションルームから退出
   */
  protected leavePresentationRoom(socket: TypedSocket, presentationId: PresentationId): void {
    const roomName = this.getPresentationRoomName(presentationId);
    socket.leave(roomName);
    console.log(`🚪 ソケット ${socket.id} がルーム ${roomName} から退出しました`);
  }

  /**
   * スライドルームに参加
   */
  protected joinSlideRoom(
    socket: TypedSocket,
    presentationId: PresentationId,
    slideIndex: number
  ): void {
    const roomName = this.getSlideRoomName(presentationId, slideIndex);
    socket.join(roomName);
    console.log(`🏠 ソケット ${socket.id} がスライドルーム ${roomName} に参加しました`);
  }

  /**
   * スライドルームから退出
   */
  protected leaveSlideRoom(
    socket: TypedSocket,
    presentationId: PresentationId,
    slideIndex: number
  ): void {
    const roomName = this.getSlideRoomName(presentationId, slideIndex);
    socket.leave(roomName);
    console.log(`🚪 ソケット ${socket.id} がスライドルーム ${roomName} から退出しました`);
  }

  /**
   * プレゼンター専用ルームに参加
   */
  protected joinPresenterRoom(socket: TypedSocket, presentationId: PresentationId): void {
    const roomName = this.getPresenterRoomName(presentationId);
    socket.join(roomName);
    console.log(`🏠 ソケット ${socket.id} がプレゼンタールーム ${roomName} に参加しました`);
  }

  /**
   * プレゼンター専用ルームから退出
   */
  protected leavePresenterRoom(socket: TypedSocket, presentationId: PresentationId): void {
    const roomName = this.getPresenterRoomName(presentationId);
    socket.leave(roomName);
    console.log(`🚪 ソケット ${socket.id} がプレゼンタールーム ${roomName} から退出しました`);
  }

  /**
   * プレゼンテーションルーム名を取得
   */
  protected getPresentationRoomName(presentationId: PresentationId): string {
    return `presentation-${presentationId}`;
  }

  /**
   * スライドルーム名を取得
   */
  protected getSlideRoomName(presentationId: PresentationId, slideIndex: number): string {
    return `slide-${presentationId}-${slideIndex}`;
  }

  /**
   * プレゼンタールーム名を取得
   */
  protected getPresenterRoomName(presentationId: PresentationId): string {
    return `presenter-${presentationId}`;
  }

  /**
   * エラーハンドリングユーティリティ
   */
  protected handleError(socket: TypedSocket, error: Error, context: string): void {
    console.error(`❌ Socket.IOエラー [${context}]:`, error);

    socket.emit('error', {
      code: 'SOCKET_ERROR',
      message: `${context}でエラーが発生しました`,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 成功レスポンスの送信
   */
  protected sendSuccessResponse<T>(callback: ((response: T) => void) | undefined, data: T): void {
    if (callback) {
      callback(data);
    }
  }

  /**
   * エラーレスポンスの送信
   */
  protected sendErrorResponse<T extends { success: boolean; error?: string }>(
    callback: ((response: T) => void) | undefined,
    error: string,
    additionalData?: Partial<T>
  ): void {
    if (callback) {
      const response = {
        success: false,
        error,
        ...additionalData,
      } as T;
      callback(response);
    }
  }

  /**
   * ソケットの切断処理
   */
  protected handleDisconnect(socket: TypedSocket, reason: string): void {
    console.log(
      `🔌 ソケット ${socket.id} が切断されました (名前空間: ${this.namespace.name}): ${reason}`
    );
    // 必要に応じて継承クラスでオーバーライド
  }
}
