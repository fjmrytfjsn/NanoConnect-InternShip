/**
 * Socket.IOクライアントサービス
 * WebSocket接続の管理、自動再接続、エラーハンドリングを提供
 */

import { io, Socket } from 'socket.io-client';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  SocketErrorEvent,
  NotificationEvent
} from 'nanoconnect-internship/shared/types/socket';
import { API_BASE_URL } from '@/constants/api';

// 接続状態の型定義
export type ConnectionState = 'connected' | 'connecting' | 'disconnected' | 'reconnecting' | 'error';

// Socket.IOクライアントの型定義
type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// サービス設定の型定義
interface SocketServiceConfig {
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
  timeout?: number;
}

// デフォルト設定
const DEFAULT_CONFIG: SocketServiceConfig = {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
};

/**
 * Socket.IOクライアントサービス
 * シングルトンパターンで実装
 */
export class SocketService {
  private static instance: SocketService | null = null;
  private socket: TypedSocket | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private config: SocketServiceConfig;
  private eventListeners: Map<string, Function[]> = new Map();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private manualDisconnect = false;

  private constructor(config: SocketServiceConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * シングルトンインスタンスを取得
   */
  public static getInstance(config?: SocketServiceConfig): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService(config);
    }
    return SocketService.instance;
  }

  /**
   * Socket.IO接続を初期化
   */
  public initialize(): void {
    if (this.socket) {
      console.warn('🔶 Socket.IO は既に初期化されています');
      return;
    }

    this.socket = io(API_BASE_URL, {
      autoConnect: this.config.autoConnect,
      reconnection: this.config.reconnection,
      reconnectionAttempts: this.config.reconnectionAttempts,
      reconnectionDelay: this.config.reconnectionDelay,
      reconnectionDelayMax: this.config.reconnectionDelayMax,
      timeout: this.config.timeout,
    });

    this.setupEventListeners();
    console.log('🚀 Socket.IOクライアントを初期化しました');
  }

  /**
   * サーバーに接続
   */
  public connect(): void {
    if (!this.socket) {
      this.initialize();
    }

    if (this.socket && !this.socket.connected) {
      this.manualDisconnect = false;
      this.setConnectionState('connecting');
      this.socket.connect();
      console.log('🔗 Socket.IO サーバーに接続中...');
    }
  }

  /**
   * サーバーから切断
   */
  public disconnect(): void {
    if (this.socket && this.socket.connected) {
      this.manualDisconnect = true;
      this.socket.disconnect();
      console.log('🔌 Socket.IO サーバーから切断しました');
    }
  }

  /**
   * リソースをクリーンアップして完全に破棄
   */
  public destroy(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.eventListeners.clear();
    this.setConnectionState('disconnected');
    SocketService.instance = null;
    console.log('💥 Socket.IOクライアントを破棄しました');
  }

  /**
   * イベントリスナーを登録
   */
  public on<K extends keyof ServerToClientEvents>(
    event: K,
    listener: ServerToClientEvents[K]
  ): void {
    if (!this.socket) {
      this.initialize();
    }

    // @ts-ignore - Socket.IO型の制約のため
    this.socket!.on(event, listener);
    
    // 内部リストに追加（クリーンアップ用）
    if (!this.eventListeners.has(event as string)) {
      this.eventListeners.set(event as string, []);
    }
    this.eventListeners.get(event as string)!.push(listener);
  }

  /**
   * イベントリスナーを解除
   */
  public off<K extends keyof ServerToClientEvents>(
    event: K,
    listener?: ServerToClientEvents[K]
  ): void {
    if (!this.socket) return;

    if (listener) {
      // @ts-ignore - Socket.IO型の制約のため
      this.socket.off(event, listener);
      
      // 内部リストからも削除
      const listeners = this.eventListeners.get(event as string);
      if (listeners) {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    } else {
      this.socket.off(event);
      this.eventListeners.delete(event as string);
    }
  }

  /**
   * サーバーにイベントを送信
   */
  public emit<K extends keyof ClientToServerEvents>(
    event: K,
    ...args: Parameters<ClientToServerEvents[K]>
  ): void {
    if (!this.socket) {
      console.error('❌ Socket.IOが初期化されていません');
      return;
    }

    if (!this.socket.connected) {
      console.warn('⚠️ Socket.IOが接続されていません');
      return;
    }

    // @ts-ignore - Socket.IO型の制約のため
    this.socket.emit(event, ...args);
  }

  /**
   * 現在の接続状態を取得
   */
  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * 接続中かどうかを確認
   */
  public isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Socket.IOインスタンスを取得（低レベルアクセス用）
   */
  public getSocket(): TypedSocket | null {
    return this.socket;
  }

  /**
   * 基本的なSocket.IOイベントリスナーを設定
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // 接続成功
    this.socket.on('connect', () => {
      this.setConnectionState('connected');
      console.log(`✅ Socket.IO サーバーに接続しました (ID: ${this.socket?.id})`);
      
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    });

    // 切断
    this.socket.on('disconnect', (reason) => {
      this.setConnectionState('disconnected');
      console.log(`🔌 Socket.IO サーバーから切断されました: ${reason}`);
      
      // 手動切断でない場合は再接続を試行
      if (!this.manualDisconnect && this.config.reconnection) {
        this.scheduleReconnect();
      }
    });

    // 再接続試行
    // @ts-ignore - Socket.IOの標準イベントのため
    this.socket.on('reconnect_attempt', (attemptNumber: number) => {
      this.setConnectionState('reconnecting');
      console.log(`🔄 Socket.IO 再接続試行中... (${attemptNumber}/${this.config.reconnectionAttempts})`);
    });

    // 再接続成功
    // @ts-ignore - Socket.IOの標準イベントのため
    this.socket.on('reconnect', (attemptNumber: number) => {
      this.setConnectionState('connected');
      console.log(`✅ Socket.IO 再接続成功 (試行回数: ${attemptNumber})`);
    });

    // 再接続失敗
    // @ts-ignore - Socket.IOの標準イベントのため
    this.socket.on('reconnect_failed', () => {
      this.setConnectionState('error');
      console.error('❌ Socket.IO 再接続に失敗しました');
    });

    // 接続エラー
    this.socket.on('connect_error', (error) => {
      this.setConnectionState('error');
      console.error('❌ Socket.IO 接続エラー:', error);
    });

    // サーバーからのエラーイベント
    this.socket.on('error', (data: SocketErrorEvent) => {
      console.error('❌ Socket.IO サーバーエラー:', data);
    });

    // サーバーからの通知イベント
    this.socket.on('notification', (data: NotificationEvent) => {
      console.log('📢 Socket.IO 通知:', data);
    });
  }

  /**
   * 接続状態を更新
   */
  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      // 状態変更のカスタムイベントを発火（フックで使用）
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('socketConnectionStateChanged', {
          detail: { state }
        }));
      }
    }
  }

  /**
   * 再接続をスケジュール
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      if (!this.manualDisconnect && !this.isConnected()) {
        console.log('🔄 Socket.IO 手動再接続を試行...');
        this.connect();
      }
    }, this.config.reconnectionDelay);
  }
}

// デフォルトインスタンスをエクスポート
export const socketService = SocketService.getInstance();