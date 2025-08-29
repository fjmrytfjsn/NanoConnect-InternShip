/**
 * リアルタイム接続状態管理フック
 * Socket.IO接続状態の監視、自動再接続、オンライン/オフライン検知を提供
 */

import { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSocket } from './useSocket';
import { socketSelectors, setAutoReconnect, resetReconnectAttempts } from '@/store/slices/socketSlice';
import { AppDispatch } from '@/store';

/**
 * ネットワーク状態の型定義
 */
export type NetworkState = 'online' | 'offline';

/**
 * 接続品質の型定義
 */
export type ConnectionQuality = 'excellent' | 'good' | 'poor' | 'disconnected';

/**
 * 接続統計情報の型定義
 */
export interface ConnectionStats {
  connectedTime: number; // 接続時間（ミリ秒）
  disconnectedTime: number; // 切断時間（ミリ秒）
  reconnectCount: number; // 再接続回数
  lastLatency: number | null; // 最新のレイテンシ（ミリ秒）
  averageLatency: number | null; // 平均レイテンシ（ミリ秒）
}

/**
 * フック戻り値の型定義
 */
export interface UseRealtimeConnectionReturn {
  // 状態
  connectionState: string;
  isConnected: boolean;
  isConnecting: boolean;
  networkState: NetworkState;
  connectionQuality: ConnectionQuality;
  reconnectAttempts: number;
  stats: ConnectionStats;

  // 操作関数
  connect: () => void;
  disconnect: () => void;
  forceReconnect: () => void;
  enableAutoReconnect: () => void;
  disableAutoReconnect: () => void;

  // 監視関数
  pingServer: () => Promise<number>; // レイテンシを返す
  checkConnectionQuality: () => ConnectionQuality;
}

/**
 * リアルタイム接続状態管理フック
 * @param options 設定オプション
 * @returns 接続状態と操作関数
 */
export const useRealtimeConnection = (options: {
  autoConnect?: boolean;
  enableQualityMonitoring?: boolean;
  qualityCheckInterval?: number;
  enableNetworkStateMonitoring?: boolean;
} = {}): UseRealtimeConnectionReturn => {
  const {
    autoConnect = false,
    enableQualityMonitoring = true,
    qualityCheckInterval = 30000, // 30秒
    enableNetworkStateMonitoring = true,
  } = options;

  const dispatch = useDispatch<AppDispatch>();
  const { connect, disconnect, emit, isConnected: socketIsConnected } = useSocket(autoConnect);

  // Redux状態を取得
  const connectionState = useSelector(socketSelectors.getConnectionState);
  const isConnected = useSelector(socketSelectors.getIsConnected);
  const isConnecting = useSelector(socketSelectors.getIsConnecting);
  const reconnectAttempts = useSelector(socketSelectors.getReconnectAttempts);
  const settings = useSelector(socketSelectors.getSettings);

  // ローカル状態
  const [networkState, setNetworkState] = useState<NetworkState>('online');
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>('disconnected');
  const [stats, setStats] = useState<ConnectionStats>({
    connectedTime: 0,
    disconnectedTime: 0,
    reconnectCount: 0,
    lastLatency: null,
    averageLatency: null,
  });
  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);
  const [connectStartTime, setConnectStartTime] = useState<number | null>(null);
  const [disconnectStartTime, setDisconnectStartTime] = useState<number | null>(null);

  // ========== 操作関数 ==========

  /**
   * 強制再接続
   */
  const forceReconnect = useCallback(() => {
    console.log('🔄 強制再接続を実行...');
    disconnect();
    // 少し待ってから再接続
    setTimeout(() => {
      connect();
    }, 1000);
    
    // 再接続回数をリセット
    dispatch(resetReconnectAttempts());
    
    setStats(prev => ({
      ...prev,
      reconnectCount: prev.reconnectCount + 1,
    }));
  }, [connect, disconnect, dispatch]);

  /**
   * 自動再接続を有効化
   */
  const enableAutoReconnect = useCallback(() => {
    dispatch(setAutoReconnect(true));
    console.log('✅ 自動再接続を有効化しました');
  }, [dispatch]);

  /**
   * 自動再接続を無効化
   */
  const disableAutoReconnect = useCallback(() => {
    dispatch(setAutoReconnect(false));
    console.log('❌ 自動再接続を無効化しました');
  }, [dispatch]);

  /**
   * サーバーにpingを送信してレイテンシを測定
   */
  const pingServer = useCallback(async (): Promise<number> => {
    return new Promise((resolve, reject) => {
      if (!isConnected) {
        reject(new Error('接続されていません'));
        return;
      }

      const startTime = Date.now();
      
      // 一時的にconnect_errorイベントを使用してレスポンス時間を測定
      // 実際の本番環境では適切なpingイベントを実装する必要があります
      const measureLatency = () => {
        const latency = 100 + Math.random() * 50; // 模擬レイテンシ
        
        // レイテンシ履歴を更新
        setLatencyHistory(prev => {
          const newHistory = [...prev, latency].slice(-10); // 最新10件を保持
          return newHistory;
        });
        
        // 統計情報を更新
        setStats(prev => ({
          ...prev,
          lastLatency: latency,
          averageLatency: latencyHistory.length > 0 
            ? Math.round(latencyHistory.reduce((sum, l) => sum + l, 0) / latencyHistory.length)
            : latency,
        }));
        
        resolve(latency);
      };

      // 即座にレイテンシを返す（開発用）
      setTimeout(measureLatency, 50);
    });
  }, [isConnected, latencyHistory]);

  /**
   * 接続品質をチェック
   */
  const checkConnectionQuality = useCallback((): ConnectionQuality => {
    if (!isConnected) {
      return 'disconnected';
    }

    const { lastLatency, averageLatency } = stats;
    const latency = averageLatency || lastLatency;

    if (latency === null) {
      return 'good'; // まだ測定していない場合はデフォルト
    }

    if (latency < 100) {
      return 'excellent';
    } else if (latency < 300) {
      return 'good';
    } else {
      return 'poor';
    }
  }, [isConnected, stats]);

  // ========== エフェクト ==========

  /**
   * ネットワーク状態の監視
   */
  useEffect(() => {
    if (!enableNetworkStateMonitoring || typeof window === 'undefined') {
      return;
    }

    const handleOnline = () => {
      console.log('🌐 ネットワークがオンラインになりました');
      setNetworkState('online');
      
      // オンライン復帰時に自動再接続が有効な場合は再接続を試行
      if (settings.autoReconnect && !isConnected) {
        setTimeout(() => {
          console.log('🔄 ネットワーク復帰による再接続を試行...');
          connect();
        }, 1000);
      }
    };

    const handleOffline = () => {
      console.log('📡 ネットワークがオフラインになりました');
      setNetworkState('offline');
    };

    // 初期状態を設定
    setNetworkState(navigator.onLine ? 'online' : 'offline');

    // イベントリスナーを登録
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [settings.autoReconnect, isConnected, connect]);

  /**
   * 接続品質の定期監視
   */
  useEffect(() => {
    if (!enableQualityMonitoring || !isConnected) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        await pingServer();
        const quality = checkConnectionQuality();
        setConnectionQuality(quality);
        
        if (quality === 'poor') {
          console.warn('⚠️ 接続品質が低下しています');
        }
      } catch (error) {
        console.warn('⚠️ 接続品質チェックに失敗:', error);
        setConnectionQuality('poor');
      }
    }, qualityCheckInterval);

    return () => {
      clearInterval(interval);
    };
  }, [enableQualityMonitoring, isConnected, qualityCheckInterval, pingServer, checkConnectionQuality]);

  /**
   * 接続時間の計測
   */
  useEffect(() => {
    if (isConnected) {
      // 接続開始時間を記録
      setConnectStartTime(Date.now());
      setConnectionQuality(checkConnectionQuality());
      
      // 切断時間の計算（前回切断していた場合）
      if (disconnectStartTime) {
        const disconnectedDuration = Date.now() - disconnectStartTime;
        setStats(prev => ({
          ...prev,
          disconnectedTime: prev.disconnectedTime + disconnectedDuration,
        }));
        setDisconnectStartTime(null);
      }
    } else {
      // 切断開始時間を記録
      setDisconnectStartTime(Date.now());
      setConnectionQuality('disconnected');
      
      // 接続時間の計算（前回接続していた場合）
      if (connectStartTime) {
        const connectedDuration = Date.now() - connectStartTime;
        setStats(prev => ({
          ...prev,
          connectedTime: prev.connectedTime + connectedDuration,
        }));
        setConnectStartTime(null);
      }
    }
  }, [isConnected, checkConnectionQuality, connectStartTime, disconnectStartTime]);

  // ========== 戻り値 ==========

  return {
    // 状態
    connectionState,
    isConnected,
    isConnecting,
    networkState,
    connectionQuality,
    reconnectAttempts,
    stats,

    // 操作関数
    connect,
    disconnect,
    forceReconnect,
    enableAutoReconnect,
    disableAutoReconnect,

    // 監視関数
    pingServer,
    checkConnectionQuality,
  };
};

export default useRealtimeConnection;