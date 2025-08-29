/**
 * WebSocketロギングミドルウェア
 * Socket.IOのイベントやコネクションのログを記録する
 */

import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import { WebSocketAuthMiddleware, AuthenticatedSocketData } from './AuthMiddleware';

/**
 * ログレベル定義
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

/**
 * WebSocketログエントリ
 */
export interface WebSocketLogEntry {
  timestamp: string;
  level: LogLevel;
  socketId: string;
  namespace: string;
  event: string;
  userId?: string;
  username?: string;
  role?: string;
  data?: any;
  error?: string;
  duration?: number;
}

/**
 * WebSocketロギングミドルウェア
 */
export class WebSocketLoggingMiddleware {
  private static logs: WebSocketLogEntry[] = [];
  private static maxLogsInMemory = 1000;

  /**
   * 接続ログミドルウェア
   */
  static createConnectionLogger() {
    return (socket: Socket, next: (err?: ExtendedError) => void) => {
      const authData = WebSocketAuthMiddleware.getAuthData(socket);

      this.logEvent({
        timestamp: new Date().toISOString(),
        level: LogLevel.INFO,
        socketId: socket.id,
        namespace: socket.nsp.name,
        event: 'connection',
        userId: authData?.userId,
        username: authData?.username,
        role: authData?.role,
        data: {
          remoteAddress: socket.conn.remoteAddress,
          userAgent: socket.handshake.headers['user-agent'],
          origin: socket.handshake.headers.origin,
        },
      });

      next();
    };
  }

  /**
   * イベントログミドルウェア
   */
  static attachEventLogger(socket: Socket): void {
    const originalEmit = socket.emit.bind(socket);
    const originalOn = socket.on.bind(socket);
    const originalOnAny = socket.onAny.bind(socket);

    // 送信イベントのログ
    socket.emit = function (event: string, ...args: any[]) {
      const authData = WebSocketAuthMiddleware.getAuthData(socket);

      WebSocketLoggingMiddleware.logEvent({
        timestamp: new Date().toISOString(),
        level: LogLevel.DEBUG,
        socketId: socket.id,
        namespace: socket.nsp.name,
        event: `emit:${event}`,
        userId: authData?.userId,
        username: authData?.username,
        role: authData?.role,
        data: WebSocketLoggingMiddleware.sanitizeLogData(args),
      });

      return originalEmit(event, ...args);
    };

    // 受信イベントのログ（すべてのイベントをキャッチ）
    socket.onAny((event: string, ...args: any[]) => {
      const authData = WebSocketAuthMiddleware.getAuthData(socket);
      const startTime = Date.now();

      WebSocketLoggingMiddleware.logEvent({
        timestamp: new Date().toISOString(),
        level: LogLevel.DEBUG,
        socketId: socket.id,
        namespace: socket.nsp.name,
        event: `receive:${event}`,
        userId: authData?.userId,
        username: authData?.username,
        role: authData?.role,
        data: WebSocketLoggingMiddleware.sanitizeLogData(args),
      });

      // コールバックがある場合の処理時間測定
      const lastArg = args[args.length - 1];
      if (typeof lastArg === 'function') {
        const originalCallback = lastArg;
        args[args.length - 1] = (...callbackArgs: any[]) => {
          const duration = Date.now() - startTime;

          WebSocketLoggingMiddleware.logEvent({
            timestamp: new Date().toISOString(),
            level: LogLevel.DEBUG,
            socketId: socket.id,
            namespace: socket.nsp.name,
            event: `callback:${event}`,
            userId: authData?.userId,
            username: authData?.username,
            role: authData?.role,
            data: WebSocketLoggingMiddleware.sanitizeLogData(callbackArgs),
            duration,
          });

          return originalCallback(...callbackArgs);
        };
      }
    });

    // 切断イベントのログ
    socket.on('disconnect', (reason: string) => {
      const authData = WebSocketAuthMiddleware.getAuthData(socket);

      WebSocketLoggingMiddleware.logEvent({
        timestamp: new Date().toISOString(),
        level: LogLevel.INFO,
        socketId: socket.id,
        namespace: socket.nsp.name,
        event: 'disconnect',
        userId: authData?.userId,
        username: authData?.username,
        role: authData?.role,
        data: { reason },
      });
    });

    // エラーイベントのログ
    socket.on('error', (error: Error) => {
      const authData = WebSocketAuthMiddleware.getAuthData(socket);

      WebSocketLoggingMiddleware.logEvent({
        timestamp: new Date().toISOString(),
        level: LogLevel.ERROR,
        socketId: socket.id,
        namespace: socket.nsp.name,
        event: 'error',
        userId: authData?.userId,
        username: authData?.username,
        role: authData?.role,
        error: error.message,
        data: {
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        },
      });
    });
  }

  /**
   * カスタムログ記録
   */
  static logCustomEvent(
    socket: Socket,
    level: LogLevel,
    event: string,
    data?: any,
    error?: string
  ): void {
    const authData = WebSocketAuthMiddleware.getAuthData(socket);

    this.logEvent({
      timestamp: new Date().toISOString(),
      level,
      socketId: socket.id,
      namespace: socket.nsp.name,
      event,
      userId: authData?.userId,
      username: authData?.username,
      role: authData?.role,
      data: this.sanitizeLogData(data),
      error,
    });
  }

  /**
   * ログエントリの記録
   */
  private static logEvent(entry: WebSocketLogEntry): void {
    // メモリ内ログの管理
    this.logs.push(entry);
    if (this.logs.length > this.maxLogsInMemory) {
      this.logs.shift(); // 古いログを削除
    }

    // コンソール出力
    const logMessage = this.formatLogMessage(entry);

    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(logMessage);
        break;
      case LogLevel.WARN:
        console.warn(logMessage);
        break;
      case LogLevel.INFO:
        console.log(logMessage);
        break;
      case LogLevel.DEBUG:
        if (process.env.NODE_ENV === 'development') {
          console.debug(logMessage);
        }
        break;
    }

    // 本番環境では外部ログシステムに送信することも可能
    // 例：Winston、Elasticsearch、CloudWatch など
  }

  /**
   * ログメッセージのフォーマット
   */
  private static formatLogMessage(entry: WebSocketLogEntry): string {
    const userInfo = entry.username ? `${entry.username}(${entry.role})` : 'Anonymous';
    const durationInfo = entry.duration ? ` [${entry.duration}ms]` : '';
    const errorInfo = entry.error ? ` ERROR: ${entry.error}` : '';

    return `[${entry.timestamp}] ${entry.level} 🔌 ${entry.namespace}/${entry.socketId} | ${userInfo} | ${entry.event}${durationInfo}${errorInfo}`;
  }

  /**
   * ログデータのサニタイズ（機密情報を除去）
   */
  private static sanitizeLogData(data: any): any {
    if (!data) return data;

    try {
      // 文字列化してパスワードなど機密情報をマスク
      const jsonString = JSON.stringify(data, (key, value) => {
        if (typeof key === 'string' && key.toLowerCase().includes('password')) {
          return '***MASKED***';
        }
        if (typeof key === 'string' && key.toLowerCase().includes('token')) {
          return typeof value === 'string' && value.length > 10
            ? `${value.substring(0, 10)}...`
            : '***MASKED***';
        }
        if (typeof key === 'string' && key.toLowerCase().includes('secret')) {
          return '***MASKED***';
        }
        return value;
      });

      return JSON.parse(jsonString);
    } catch (error) {
      return { _sanitizeError: 'Failed to sanitize log data' };
    }
  }

  /**
   * メモリ内ログの取得（デバッグ用）
   */
  static getLogs(filter?: {
    socketId?: string;
    namespace?: string;
    level?: LogLevel;
    event?: string;
    limit?: number;
  }): WebSocketLogEntry[] {
    let filteredLogs = [...this.logs];

    if (filter) {
      if (filter.socketId) {
        filteredLogs = filteredLogs.filter(log => log.socketId === filter.socketId);
      }
      if (filter.namespace) {
        filteredLogs = filteredLogs.filter(log => log.namespace === filter.namespace);
      }
      if (filter.level) {
        filteredLogs = filteredLogs.filter(log => log.level === filter.level);
      }
      if (filter.event) {
        filteredLogs = filteredLogs.filter(log => log.event.includes(filter.event!));
      }
    }

    const limit = filter?.limit || 100;
    return filteredLogs.slice(-limit).reverse(); // 最新のものから取得
  }

  /**
   * ログ統計の取得
   */
  static getLogStats(): {
    totalLogs: number;
    logsByLevel: Record<LogLevel, number>;
    logsByNamespace: Record<string, number>;
    recentErrors: WebSocketLogEntry[];
  } {
    const logsByLevel = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 0,
      [LogLevel.WARN]: 0,
      [LogLevel.ERROR]: 0,
    };

    const logsByNamespace: Record<string, number> = {};

    this.logs.forEach(log => {
      logsByLevel[log.level]++;
      logsByNamespace[log.namespace] = (logsByNamespace[log.namespace] || 0) + 1;
    });

    const recentErrors = this.logs
      .filter(log => log.level === LogLevel.ERROR)
      .slice(-10)
      .reverse();

    return {
      totalLogs: this.logs.length,
      logsByLevel,
      logsByNamespace,
      recentErrors,
    };
  }

  /**
   * ログのクリア（メモリ管理）
   */
  static clearLogs(): void {
    this.logs = [];
    console.log('🗑️ WebSocketログをクリアしました');
  }
}
