/**
 * Socket.IOサーバーマネージャー
 * WebSocketサーバーの初期化、名前空間管理、Room管理を行う
 */

import { Server as SocketIOServer, Namespace } from 'socket.io';
import { Server as HttpServer } from 'http';
import { BaseHandler, TypedSocket, TypedNamespace } from './handlers/BaseHandler';
import { WebSocketAuthMiddleware } from './middleware/AuthMiddleware';
import { WebSocketLoggingMiddleware, LogLevel } from './middleware/LoggingMiddleware';
import { PresentationId } from '@/types/common';
import { config } from '@/config/app';

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
  'participant:count-changed': (data: any) => void;
  error: (data: any) => void;
  notification: (data: any) => void;
}

export interface ClientToServerEvents {
  'join:presentation': (data: any, callback: (response: any) => void) => void;
  'submit:response': (data: any, callback: (response: any) => void) => void;
  'leave:presentation': (data: any) => void;
  'control:start': (data: any, callback?: (response: any) => void) => void;
  'control:stop': (data: any, callback?: (response: any) => void) => void;
  'control:next-slide': (data: any, callback?: (response: any) => void) => void;
  'control:prev-slide': (data: any, callback?: (response: any) => void) => void;
  'control:goto-slide': (data: any, callback?: (response: any) => void) => void;
  'get:participant-count': (data: any, callback?: (response: any) => void) => void;
}

/**
 * Socket.IOサーバー設定オプション
 */
export interface SocketManagerOptions {
  cors?: {
    origin: string | string[];
    credentials?: boolean;
  };
  connectionTimeout?: number;
  pingTimeout?: number;
  pingInterval?: number;
}

/**
 * 名前空間の種類
 */
export enum NamespaceType {
  PRESENTER = 'presenter',
  PARTICIPANT = 'participant',
  ADMIN = 'admin',
}

/**
 * Room管理情報
 */
export interface RoomInfo {
  name: string;
  type: 'presentation' | 'slide' | 'presenter';
  presentationId?: PresentationId;
  slideIndex?: number;
  socketCount: number;
  createdAt: Date;
  lastActivity: Date;
}

/**
 * Socket.IOサーバーマネージャー
 */
export class SocketManager {
  private io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>;
  private httpServer: HttpServer;
  private handlers: Map<string, BaseHandler> = new Map();
  private roomStats: Map<string, RoomInfo> = new Map();
  private isInitialized = false;

  constructor(httpServer: HttpServer, options?: SocketManagerOptions) {
    this.httpServer = httpServer;

    // Socket.IOサーバーの初期化
    this.io = new SocketIOServer(httpServer, {
      cors: options?.cors || {
        origin: config.cors.origin,
        credentials: config.cors.credentials,
      },
      connectTimeout: options?.connectionTimeout || 60000,
      pingTimeout: options?.pingTimeout || 60000,
      pingInterval: options?.pingInterval || 25000,
      serveClient: false,
      allowEIO3: true,
    });

    console.log('🚀 SocketManager初期化完了');
  }

  /**
   * Socket.IOサーバーの初期化
   */
  public initialize(): void {
    if (this.isInitialized) {
      console.warn('⚠️ SocketManagerは既に初期化されています');
      return;
    }

    // 基本名前空間の設定
    this.setupNamespaces();

    // グローバル接続エラーハンドリング
    this.io.engine.on('connection_error', err => {
      console.error('❌ Socket.IO接続エラー:', err);
    });

    this.isInitialized = true;
    console.log('✅ Socket.IOサーバー初期化完了');
  }

  /**
   * 名前空間の設定
   */
  private setupNamespaces(): void {
    // プレゼンター名前空間
    const presenterNS = this.io.of('/presenter');
    this.setupNamespaceMiddleware(presenterNS, NamespaceType.PRESENTER);

    // 参加者名前空間
    const participantNS = this.io.of('/participant');
    this.setupNamespaceMiddleware(participantNS, NamespaceType.PARTICIPANT);

    // 管理者名前空間（将来の拡張用）
    const adminNS = this.io.of('/admin');
    this.setupNamespaceMiddleware(adminNS, NamespaceType.ADMIN);

    console.log('🏷️ 名前空間設定完了: /presenter, /participant, /admin');
  }

  /**
   * 名前空間のミドルウェア設定
   */
  private setupNamespaceMiddleware(namespace: TypedNamespace, type: NamespaceType): void {
    // ログミドルウェア
    namespace.use(WebSocketLoggingMiddleware.createConnectionLogger());

    // 認証ミドルウェア
    switch (type) {
      case NamespaceType.PRESENTER:
        namespace.use(WebSocketAuthMiddleware.createAuthMiddleware());
        namespace.use(WebSocketAuthMiddleware.requirePresenterRole());
        break;

      case NamespaceType.PARTICIPANT:
        // 参加者は認証済みユーザーか匿名ユーザー両方を許可
        namespace.use((socket, next) => {
          // まず認証を試行
          WebSocketAuthMiddleware.createAuthMiddleware()(socket, authErr => {
            if (authErr) {
              // 認証失敗時は匿名参加者として許可
              WebSocketAuthMiddleware.allowAnonymousParticipant()(socket, next);
            } else {
              next();
            }
          });
        });
        break;

      case NamespaceType.ADMIN:
        namespace.use(WebSocketAuthMiddleware.createAuthMiddleware());
        // 将来的に管理者権限チェックを追加
        break;
    }

    // コネクション処理
    namespace.on('connection', (socket: TypedSocket) => {
      this.handleConnection(socket, namespace, type);
    });
  }

  /**
   * ソケット接続処理
   */
  private handleConnection(
    socket: TypedSocket,
    namespace: TypedNamespace,
    type: NamespaceType
  ): void {
    // イベントロガーを追加
    WebSocketLoggingMiddleware.attachEventLogger(socket);

    // 基本的な接続処理
    this.setupBasicEventHandlers(socket, namespace, type);

    // 接続統計の更新
    this.updateConnectionStats('connect', socket, namespace);

    // 切断処理
    socket.on('disconnect', reason => {
      WebSocketLoggingMiddleware.logCustomEvent(socket, LogLevel.INFO, `${type}_disconnect`, {
        reason,
      });

      this.updateConnectionStats('disconnect', socket, namespace);
      this.cleanupSocketRooms(socket);
    });

    // エラーハンドリング
    socket.on('error', error => {
      WebSocketLoggingMiddleware.logCustomEvent(
        socket,
        LogLevel.ERROR,
        `${type}_error`,
        undefined,
        error.message
      );
    });

    console.log(`🔗 ${type}名前空間でクライアント接続: ${socket.id}`);
  }

  /**
   * 基本的なイベントハンドラーの設定
   */
  private setupBasicEventHandlers(
    socket: TypedSocket,
    namespace: TypedNamespace,
    type: NamespaceType
  ): void {
    // テスト用のエコーイベント
    socket.on('echo' as any, (data: any, callback?: (response: any) => void) => {
      const response = {
        message: 'Echo received',
        data,
        timestamp: new Date().toISOString(),
        namespace: namespace.name,
        type,
      };

      if (callback) {
        callback(response);
      }

      WebSocketLoggingMiddleware.logCustomEvent(socket, LogLevel.DEBUG, 'echo_handled', {
        dataSize: JSON.stringify(data).length,
      });
    });

    // ピン/ポンによる接続確認
    socket.on('ping' as any, (callback?: (response: any) => void) => {
      if (callback) {
        callback({
          pong: true,
          timestamp: new Date().toISOString(),
          namespace: namespace.name,
        });
      }
    });
  }

  /**
   * ハンドラーの登録
   */
  public registerHandler(namespace: string, handler: BaseHandler): void {
    this.handlers.set(namespace, handler);
    handler.initialize();
    console.log(`📝 ハンドラー登録: ${namespace}`);
  }

  /**
   * 名前空間の取得
   */
  public getNamespace(name: NamespaceType): TypedNamespace {
    return this.io.of(`/${name}`);
  }

  /**
   * プレゼンテーション参加者数の取得
   */
  public async getPresentationParticipantCount(presentationId: PresentationId): Promise<number> {
    const roomName = `presentation-${presentationId}`;
    const participantNS = this.getNamespace(NamespaceType.PARTICIPANT);

    const sockets = await participantNS.in(roomName).fetchSockets();
    return sockets.length;
  }

  /**
   * プレゼンテーションにメッセージをブロードキャスト
   */
  public broadcastToPresentationParticipants<K extends keyof ServerToClientEvents>(
    presentationId: PresentationId,
    event: K,
    data: any
  ): void {
    const roomName = `presentation-${presentationId}`;
    const participantNS = this.getNamespace(NamespaceType.PARTICIPANT);

    (participantNS as any).to(roomName).emit(event, data);

    console.log(`📢 参加者にブロードキャスト: ${event} -> ${roomName}`);
  }

  /**
   * プレゼンターにメッセージを送信
   */
  public broadcastToPresentationPresenters<K extends keyof ServerToClientEvents>(
    presentationId: PresentationId,
    event: K,
    data: any
  ): void {
    const roomName = `presenter-${presentationId}`;
    const presenterNS = this.getNamespace(NamespaceType.PRESENTER);

    (presenterNS as any).to(roomName).emit(event, data);

    console.log(`📢 プレゼンターにブロードキャスト: ${event} -> ${roomName}`);
  }

  /**
   * Room統計情報の取得
   */
  public async getRoomStats(): Promise<RoomInfo[]> {
    const stats: RoomInfo[] = [];

    // 各名前空間のRoomをチェック
    for (const nsType of Object.values(NamespaceType)) {
      const namespace = this.getNamespace(nsType);
      const adapter = namespace.adapter;

      for (const [roomName] of adapter.rooms) {
        // システムルーム（ソケットIDと同じ名前のルーム）をスキップ
        if (roomName.startsWith('socket_')) continue;

        const sockets = await namespace.in(roomName).fetchSockets();
        const existingRoom = this.roomStats.get(roomName);

        const roomInfo: RoomInfo = {
          name: roomName,
          type: this.getRoomType(roomName),
          presentationId: this.extractPresentationId(roomName),
          slideIndex: this.extractSlideIndex(roomName),
          socketCount: sockets.length,
          createdAt: existingRoom?.createdAt || new Date(),
          lastActivity: new Date(),
        };

        stats.push(roomInfo);
        this.roomStats.set(roomName, roomInfo);
      }
    }

    return stats;
  }

  /**
   * 接続統計の更新
   */
  private updateConnectionStats(
    action: 'connect' | 'disconnect',
    socket: TypedSocket,
    namespace: TypedNamespace
  ): void {
    const authData = WebSocketAuthMiddleware.getAuthData(socket);

    WebSocketLoggingMiddleware.logCustomEvent(socket, LogLevel.INFO, `connection_stats`, {
      action,
      namespace: namespace.name,
      connectedSockets: namespace.sockets.size,
      userInfo: authData
        ? {
            userId: authData.userId,
            username: authData.username,
            role: authData.role,
          }
        : { anonymous: true },
    });
  }

  /**
   * ソケットのRoomクリーンアップ
   */
  private cleanupSocketRooms(socket: TypedSocket): void {
    // ソケットが参加していたRoomの情報をログ出力
    const rooms = Array.from(socket.rooms).filter(room => room !== socket.id);
    if (rooms.length > 0) {
      WebSocketLoggingMiddleware.logCustomEvent(socket, LogLevel.DEBUG, 'room_cleanup', {
        leftRooms: rooms,
      });
    }
  }

  /**
   * Room種別の判定
   */
  private getRoomType(roomName: string): 'presentation' | 'slide' | 'presenter' {
    if (roomName.startsWith('presentation-')) return 'presentation';
    if (roomName.startsWith('slide-')) return 'slide';
    if (roomName.startsWith('presenter-')) return 'presenter';
    return 'presentation'; // デフォルト
  }

  /**
   * Room名からプレゼンテーションIDを抽出
   */
  private extractPresentationId(roomName: string): PresentationId | undefined {
    const match = roomName.match(/^(presentation|slide|presenter)-(.+?)(?:-\d+)?$/);
    return match ? (match[2] as PresentationId) : undefined;
  }

  /**
   * Room名からスライドインデックスを抽出
   */
  private extractSlideIndex(roomName: string): number | undefined {
    const match = roomName.match(/^slide-.+-(\d+)$/);
    return match ? parseInt(match[1], 10) : undefined;
  }

  /**
   * Socket.IOサーバーインスタンスの取得
   */
  public getIO(): SocketIOServer<ClientToServerEvents, ServerToClientEvents> {
    return this.io;
  }

  /**
   * サーバーの停止
   */
  public async close(): Promise<void> {
    return new Promise(resolve => {
      this.io.close(() => {
        console.log('🔌 Socket.IOサーバーを停止しました');
        resolve();
      });
    });
  }

  /**
   * 接続状態の取得
   */
  public getConnectionStats(): {
    totalConnections: number;
    namespaceStats: Record<string, number>;
    roomCount: number;
  } {
    const namespaceStats: Record<string, number> = {};
    let totalConnections = 0;

    // 各名前空間の接続数を集計
    for (const nsType of Object.values(NamespaceType)) {
      const namespace = this.getNamespace(nsType);
      const connectionCount = namespace.sockets.size;
      namespaceStats[`/${nsType}`] = connectionCount;
      totalConnections += connectionCount;
    }

    return {
      totalConnections,
      namespaceStats,
      roomCount: this.roomStats.size,
    };
  }
}
