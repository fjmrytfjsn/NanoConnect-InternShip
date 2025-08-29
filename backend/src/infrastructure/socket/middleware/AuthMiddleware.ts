/**
 * WebSocket認証ミドルウェア
 * Socket.IO接続時の認証処理を行う
 */

import jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import { UserId } from '@/types/common';
import { config } from '@/config/app';

/**
 * Socket.IO認証用のJWTペイロード
 */
export interface SocketJwtPayload {
  userId: UserId;
  username: string;
  role?: 'presenter' | 'participant';
  iat?: number;
  exp?: number;
}

/**
 * 認証済みソケット情報
 */
export interface AuthenticatedSocketData {
  userId: UserId;
  username: string;
  role: 'presenter' | 'participant';
  sessionId?: string;
}

/**
 * 認証情報を持つSocket型
 */
export interface AuthenticatedSocket extends Socket {
  data: AuthenticatedSocketData;
}

/**
 * WebSocket認証ミドルウェア
 * JWT トークンを使用してSocket.IO接続を認証する
 */
export class WebSocketAuthMiddleware {
  /**
   * Socket.IO認証ミドルウェア関数を作成
   */
  static createAuthMiddleware() {
    return (socket: Socket, next: (err?: ExtendedError) => void) => {
      try {
        // Authorization ヘッダーまたはクエリパラメータからトークンを取得
        let token: string | undefined;

        // Authorizationヘッダーから取得を試行
        const authHeader = socket.handshake.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        }

        // クエリパラメータから取得を試行
        if (!token && socket.handshake.query.token) {
          token = Array.isArray(socket.handshake.query.token)
            ? socket.handshake.query.token[0]
            : socket.handshake.query.token;
        }

        // トークンが見つからない場合
        if (!token) {
          console.warn(`🚫 認証失敗: トークンが提供されていません (Socket ID: ${socket.id})`);
          return next(new Error('認証トークンが必要です'));
        }

        // JWTトークンの検証
        const decoded = jwt.verify(token, config.jwt.secret) as SocketJwtPayload;

        // ソケットデータに認証情報を設定
        socket.data = {
          userId: decoded.userId,
          username: decoded.username,
          role: decoded.role || 'participant',
          sessionId: socket.handshake.query.sessionId as string,
        };

        console.log(
          `✅ Socket.IO認証成功: ${decoded.username} (${decoded.role}) - Socket ID: ${socket.id}`
        );
        next();
      } catch (error) {
        console.error(`🚫 Socket.IO認証エラー (Socket ID: ${socket.id}):`, error);

        if (error instanceof jwt.JsonWebTokenError) {
          return next(new Error('無効な認証トークンです'));
        }

        if (error instanceof jwt.TokenExpiredError) {
          return next(new Error('認証トークンの有効期限が切れています'));
        }

        return next(new Error('認証処理中にエラーが発生しました'));
      }
    };
  }

  /**
   * プレゼンター権限をチェックするミドルウェア
   */
  static requirePresenterRole() {
    return (socket: Socket, next: (err?: ExtendedError) => void) => {
      const authSocket = socket as AuthenticatedSocket;

      if (!authSocket.data || authSocket.data.role !== 'presenter') {
        console.warn(
          `🚫 権限不足: プレゼンター権限が必要 (User: ${authSocket.data?.username}, Socket ID: ${socket.id})`
        );
        return next(new Error('プレゼンター権限が必要です'));
      }

      console.log(
        `✅ プレゼンター権限確認済み: ${authSocket.data.username} - Socket ID: ${socket.id}`
      );
      next();
    };
  }

  /**
   * 参加者権限をチェックするミドルウェア
   */
  static requireParticipantRole() {
    return (socket: Socket, next: (err?: ExtendedError) => void) => {
      const authSocket = socket as AuthenticatedSocket;

      if (!authSocket.data || authSocket.data.role !== 'participant') {
        console.warn(
          `🚫 権限不足: 参加者権限が必要 (User: ${authSocket.data?.username}, Socket ID: ${socket.id})`
        );
        return next(new Error('参加者権限が必要です'));
      }

      console.log(`✅ 参加者権限確認済み: ${authSocket.data.username} - Socket ID: ${socket.id}`);
      next();
    };
  }

  /**
   * 匿名接続を許可するミドルウェア（参加者のみ）
   */
  static allowAnonymousParticipant() {
    return (socket: Socket, next: (err?: ExtendedError) => void) => {
      // 認証済みの場合はそのまま通す
      if (socket.data && (socket.data as AuthenticatedSocketData).userId) {
        return next();
      }

      // 匿名参加者用のデフォルトデータを設定
      const sessionId = socket.handshake.query.sessionId as string;
      if (!sessionId) {
        return next(new Error('セッションIDが必要です'));
      }

      socket.data = {
        userId: `anonymous-${socket.id}` as UserId,
        username: `匿名ユーザー${socket.id.substring(0, 8)}`,
        role: 'participant' as const,
        sessionId,
      };

      console.log(`✅ 匿名参加者として接続許可: ${socket.data.username} - Socket ID: ${socket.id}`);
      next();
    };
  }

  /**
   * ソケットから認証情報を取得するヘルパー
   */
  static getAuthData(socket: Socket): AuthenticatedSocketData | null {
    return (socket as AuthenticatedSocket).data || null;
  }

  /**
   * 認証されているかチェックするヘルパー
   */
  static isAuthenticated(socket: Socket): boolean {
    const authData = this.getAuthData(socket);
    return authData !== null && authData.userId !== undefined;
  }

  /**
   * プレゼンターかチェックするヘルパー
   */
  static isPresenter(socket: Socket): boolean {
    const authData = this.getAuthData(socket);
    return authData !== null && authData.role === 'presenter';
  }

  /**
   * 参加者かチェックするヘルパー
   */
  static isParticipant(socket: Socket): boolean {
    const authData = this.getAuthData(socket);
    return authData !== null && authData.role === 'participant';
  }
}
