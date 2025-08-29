/**
 * Socket.IO基本操作フック
 * WebSocketの基本的な送受信操作を提供
 */

import { useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { socketService, ConnectionState } from '@/services/socket/SocketService';
import {
  ServerToClientEvents,
  ClientToServerEvents,
} from 'nanoconnect-internship/shared/types/socket';
import {
  setConnectionState,
  setError,
  clearError,
  updatePresentation,
  startPresentation,
  stopPresentation,
  changeSlide,
  updateSlide,
  participantJoined,
  participantLeft,
  receiveResponse,
  updateAnalytics,
  addNotification,
} from '@/store/slices/socketSlice';
import { AppDispatch } from '@/store';

/**
 * Socket.IO基本操作フック
 * @param autoConnect - 自動接続を有効にするかどうか（デフォルト: false）
 * @returns Socket.IO操作関数とサービスインスタンス
 */
export const useSocket = (autoConnect: boolean = false) => {
  const dispatch = useDispatch<AppDispatch>();

  // ========== 基本操作関数 ==========

  /**
   * Socket.IOサーバーに接続
   */
  const connect = useCallback(() => {
    try {
      socketService.connect();
    } catch (error) {
      console.error('❌ Socket.IO接続エラー:', error);
      dispatch(setError({
        message: 'Socket.IO接続に失敗しました',
        code: 'CONNECTION_ERROR',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date().toISOString(),
      }));
    }
  }, [dispatch]);

  /**
   * Socket.IOサーバーから切断
   */
  const disconnect = useCallback(() => {
    try {
      socketService.disconnect();
    } catch (error) {
      console.error('❌ Socket.IO切断エラー:', error);
    }
  }, []);

  /**
   * サーバーにイベントを送信
   */
  const emit = useCallback(<K extends keyof ClientToServerEvents>(
    event: K,
    ...args: Parameters<ClientToServerEvents[K]>
  ) => {
    try {
      socketService.emit(event, ...args);
    } catch (error) {
      console.error(`❌ Socket.IOイベント送信エラー (${event}):`, error);
      dispatch(setError({
        message: `イベント送信に失敗しました: ${event}`,
        code: 'EMIT_ERROR',
        details: { event, error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date().toISOString(),
      }));
    }
  }, [dispatch]);

  /**
   * サーバーからのイベントを監視
   */
  const on = useCallback(<K extends keyof ServerToClientEvents>(
    event: K,
    listener: ServerToClientEvents[K]
  ) => {
    try {
      socketService.on(event, listener);
    } catch (error) {
      console.error(`❌ Socket.IOイベントリスナー登録エラー (${event}):`, error);
    }
  }, []);

  /**
   * イベントリスナーを削除
   */
  const off = useCallback(<K extends keyof ServerToClientEvents>(
    event: K,
    listener?: ServerToClientEvents[K]
  ) => {
    try {
      socketService.off(event, listener);
    } catch (error) {
      console.error(`❌ Socket.IOイベントリスナー削除エラー (${event}):`, error);
    }
  }, []);

  /**
   * 接続状態を取得
   */
  const getConnectionState = useCallback((): ConnectionState => {
    return socketService.getConnectionState();
  }, []);

  /**
   * 接続中かどうかを確認
   */
  const isConnected = useCallback((): boolean => {
    return socketService.isConnected();
  }, []);

  // ========== プレゼンテーション制御関数 ==========

  /**
   * プレゼンテーションに参加
   */
  const joinPresentation = useCallback((accessCode: string, callback?: (response: any) => void) => {
    emit('join:presentation', { accessCode }, callback || (() => {}));
  }, [emit]);

  /**
   * プレゼンテーションから退出
   */
  const leavePresentation = useCallback((presentationId: string, sessionId: string) => {
    emit('leave:presentation', { presentationId, sessionId });
  }, [emit]);

  /**
   * 回答を送信
   */
  const submitResponse = useCallback((
    presentationId: string, 
    slideId: string, 
    responseData: any,
    sessionId: string,
    callback?: (response: any) => void
  ) => {
    emit('submit:response', { 
      presentationId, 
      slideId, 
      responseData,
      sessionId
    }, callback || (() => {}));
  }, [emit]);

  /**
   * プレゼンテーション制御 - 開始
   */
  const startPresentationControl = useCallback((presentationId: string) => {
    emit('control:start', { presentationId });
  }, [emit]);

  /**
   * プレゼンテーション制御 - 停止
   */
  const stopPresentationControl = useCallback((presentationId: string) => {
    emit('control:stop', { presentationId });
  }, [emit]);

  /**
   * スライド制御 - 次のスライド
   */
  const nextSlide = useCallback((presentationId: string) => {
    emit('control:next-slide', { presentationId });
  }, [emit]);

  /**
   * スライド制御 - 前のスライド
   */
  const prevSlide = useCallback((presentationId: string) => {
    emit('control:prev-slide', { presentationId });
  }, [emit]);

  /**
   * スライド制御 - 指定スライドに移動
   */
  const gotoSlide = useCallback((presentationId: string, slideIndex: number) => {
    emit('control:goto-slide', { presentationId, slideIndex });
  }, [emit]);

  // ========== イベントリスナー設定 ==========

  useEffect(() => {
    // 接続状態変更の監視
    const handleConnectionStateChange = (event: CustomEvent) => {
      const { state } = event.detail;
      dispatch(setConnectionState(state));
    };

    // カスタムイベントリスナーを登録
    if (typeof window !== 'undefined') {
      window.addEventListener('socketConnectionStateChanged', handleConnectionStateChange as EventListener);
    }

    // Socket.IOイベントリスナーを設定
    const setupSocketListeners = () => {
      // プレゼンテーション関連イベント
      socketService.on('presentation:updated', (data) => {
        dispatch(updatePresentation(data));
      });

      socketService.on('presentation:started', (data) => {
        dispatch(startPresentation(data));
      });

      socketService.on('presentation:stopped', (data) => {
        dispatch(stopPresentation(data));
      });

      // スライド関連イベント
      socketService.on('slide:changed', (data) => {
        dispatch(changeSlide(data));
      });

      socketService.on('slide:updated', (data) => {
        dispatch(updateSlide(data));
      });

      // 回答・分析関連イベント
      socketService.on('response:received', (data) => {
        dispatch(receiveResponse(data));
      });

      socketService.on('analytics:updated', (data) => {
        dispatch(updateAnalytics(data));
      });

      // 参加者関連イベント
      socketService.on('participant:joined', (data) => {
        dispatch(participantJoined(data));
      });

      socketService.on('participant:left', (data) => {
        dispatch(participantLeft(data));
      });

      // エラー・通知イベント
      socketService.on('error', (data) => {
        dispatch(setError(data));
      });

      socketService.on('notification', (data) => {
        dispatch(addNotification(data));
      });
    };

    // 初期化とリスナー設定
    socketService.initialize();
    setupSocketListeners();

    // 自動接続が有効な場合は接続を開始
    if (autoConnect) {
      connect();
    }

    // クリーンアップ関数
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('socketConnectionStateChanged', handleConnectionStateChange as EventListener);
      }
    };
  }, [dispatch, connect, autoConnect]);

  // ========== 戻り値 ==========

  return {
    // 基本操作
    connect,
    disconnect,
    emit,
    on,
    off,
    getConnectionState,
    isConnected,
    
    // プレゼンテーション操作
    joinPresentation,
    leavePresentation,
    submitResponse,
    
    // プレゼンテーション制御
    startPresentationControl,
    stopPresentationControl,
    nextSlide,
    prevSlide,
    gotoSlide,
    
    // サービスインスタンス（低レベルアクセス用）
    service: socketService,
  };
};

export default useSocket;