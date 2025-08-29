/**
 * WebSocket状態管理用Redux Slice
 * Socket.IO接続状態、リアルタイムデータ、エラー状態を管理
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ConnectionState } from '@/services/socket/SocketService';
import {
  PresentationUpdateEvent,
  PresentationStartEvent,
  PresentationStopEvent,
  SlideChangeEvent,
  SlideUpdateEvent,
  ResponseReceivedEvent,
  AnalyticsUpdateEvent,
  ParticipantJoinedEvent,
  ParticipantLeftEvent,
  SocketErrorEvent,
  NotificationEvent,
} from 'nanoconnect-internship/shared/types/socket';

// WebSocket状態の型定義
export interface SocketState {
  // 接続状態
  connectionState: ConnectionState;
  isConnecting: boolean;
  isConnected: boolean;
  reconnectAttempts: number;
  lastConnectedTime: string | null;
  lastDisconnectedTime: string | null;

  // エラー状態
  error: {
    hasError: boolean;
    message: string;
    code?: string;
    details?: Record<string, unknown>;
    timestamp?: string;
  };

  // リアルタイムデータ
  realtimeData: {
    // 現在のプレゼンテーション情報
    currentPresentation: PresentationUpdateEvent | null;
    presentationStatus: 'idle' | 'started' | 'stopped';

    // 現在のスライド情報
    currentSlide: SlideChangeEvent | null;

    // 参加者情報
    participants: {
      count: number;
      recent: ParticipantJoinedEvent[];
    };

    // レスポンス・分析データ
    responses: ResponseReceivedEvent[];
    analytics: AnalyticsUpdateEvent | null;
  };

  // 通知
  notifications: NotificationEvent[];

  // 設定
  settings: {
    autoReconnect: boolean;
    notificationEnabled: boolean;
    maxReconnectAttempts: number;
  };
}

// 初期状態
const initialState: SocketState = {
  // 接続状態
  connectionState: 'disconnected',
  isConnecting: false,
  isConnected: false,
  reconnectAttempts: 0,
  lastConnectedTime: null,
  lastDisconnectedTime: null,

  // エラー状態
  error: {
    hasError: false,
    message: '',
  },

  // リアルタイムデータ
  realtimeData: {
    currentPresentation: null,
    presentationStatus: 'idle',
    currentSlide: null,
    participants: {
      count: 0,
      recent: [],
    },
    responses: [],
    analytics: null,
  },

  // 通知
  notifications: [],

  // 設定
  settings: {
    autoReconnect: true,
    notificationEnabled: true,
    maxReconnectAttempts: 5,
  },
};

/**
 * WebSocket Redux Slice
 */
const socketSlice = createSlice({
  name: 'socket',
  initialState,
  reducers: {
    // ========== 接続状態管理 ==========

    /**
     * 接続状態を更新
     */
    setConnectionState: (state, action: PayloadAction<ConnectionState>) => {
      const newState = action.payload;
      const timestamp = new Date().toISOString();

      state.connectionState = newState;
      state.isConnecting =
        newState === 'connecting' || newState === 'reconnecting';
      state.isConnected = newState === 'connected';

      // 接続成功時の処理
      if (newState === 'connected') {
        state.lastConnectedTime = timestamp;
        state.reconnectAttempts = 0;
        state.error.hasError = false;
        state.error.message = '';
      }

      // 切断時の処理
      if (newState === 'disconnected') {
        state.lastDisconnectedTime = timestamp;
      }

      // 再接続試行時の処理
      if (newState === 'reconnecting') {
        state.reconnectAttempts += 1;
      }
    },

    /**
     * 再接続試行回数をリセット
     */
    resetReconnectAttempts: (state) => {
      state.reconnectAttempts = 0;
    },

    // ========== エラー状態管理 ==========

    /**
     * エラー状態を設定
     */
    setError: (state, action: PayloadAction<SocketErrorEvent>) => {
      state.error = {
        hasError: true,
        message: action.payload.message,
        code: action.payload.code,
        details: action.payload.details,
        timestamp: new Date().toISOString(),
      };
    },

    /**
     * エラー状態をクリア
     */
    clearError: (state) => {
      state.error = {
        hasError: false,
        message: '',
      };
    },

    // ========== リアルタイムデータ管理 ==========

    /**
     * プレゼンテーション更新
     */
    updatePresentation: (
      state,
      action: PayloadAction<PresentationUpdateEvent>
    ) => {
      state.realtimeData.currentPresentation = action.payload;
    },

    /**
     * プレゼンテーション開始
     */
    startPresentation: (
      state,
      action: PayloadAction<PresentationStartEvent>
    ) => {
      state.realtimeData.presentationStatus = 'started';
      // プレゼンテーション情報も更新
      state.realtimeData.currentPresentation = {
        presentationId: action.payload.presentationId,
        title: '', // 実際の実装では適切な値を設定
        timestamp: action.payload.timestamp,
      };
    },

    /**
     * プレゼンテーション停止
     */
    stopPresentation: (state, action: PayloadAction<PresentationStopEvent>) => {
      state.realtimeData.presentationStatus = 'stopped';
      // イベントデータは使わないが、型の一貫性のため保持
      console.log('Presentation stopped:', action.payload.presentationId);
    },

    /**
     * スライド変更
     */
    changeSlide: (state, action: PayloadAction<SlideChangeEvent>) => {
      state.realtimeData.currentSlide = action.payload;
      // スライド変更時にレスポンスをクリア
      state.realtimeData.responses = [];
    },

    /**
     * スライド更新
     */
    updateSlide: (state, action: PayloadAction<SlideUpdateEvent>) => {
      // 現在のスライドが対象の場合は更新
      if (
        state.realtimeData.currentSlide &&
        state.realtimeData.currentSlide.slideId === action.payload.slideId
      ) {
        state.realtimeData.currentSlide = {
          ...state.realtimeData.currentSlide,
          ...action.payload,
        };
      }
    },

    /**
     * 参加者参加
     */
    participantJoined: (
      state,
      action: PayloadAction<ParticipantJoinedEvent>
    ) => {
      state.realtimeData.participants.count += 1;
      state.realtimeData.participants.recent.unshift(action.payload);

      // 最近の参加者リストを最大10件に制限
      if (state.realtimeData.participants.recent.length > 10) {
        state.realtimeData.participants.recent =
          state.realtimeData.participants.recent.slice(0, 10);
      }
    },

    /**
     * 参加者退出
     */
    participantLeft: (state, action: PayloadAction<ParticipantLeftEvent>) => {
      state.realtimeData.participants.count = Math.max(
        0,
        state.realtimeData.participants.count - 1
      );
      // イベントデータは使わないが、型の一貫性のため保持
      console.log('Participant left:', action.payload.sessionId);
    },

    /**
     * レスポンス受信
     */
    receiveResponse: (state, action: PayloadAction<ResponseReceivedEvent>) => {
      state.realtimeData.responses.push(action.payload);

      // レスポンス数を制限（メモリ節約）
      if (state.realtimeData.responses.length > 1000) {
        state.realtimeData.responses = state.realtimeData.responses.slice(-800);
      }
    },

    /**
     * 分析データ更新
     */
    updateAnalytics: (state, action: PayloadAction<AnalyticsUpdateEvent>) => {
      state.realtimeData.analytics = action.payload;
    },

    // ========== 通知管理 ==========

    /**
     * 通知を追加
     */
    addNotification: (state, action: PayloadAction<NotificationEvent>) => {
      state.notifications.unshift({
        ...action.payload,
        timestamp: action.payload.timestamp || new Date().toISOString(),
      });

      // 通知数を制限
      if (state.notifications.length > 50) {
        state.notifications = state.notifications.slice(0, 50);
      }
    },

    /**
     * 通知を削除
     */
    removeNotification: (state, action: PayloadAction<{ id: string }>) => {
      state.notifications = state.notifications.filter(
        (notification) => notification.id !== action.payload.id
      );
    },

    /**
     * すべての通知をクリア
     */
    clearNotifications: (state) => {
      state.notifications = [];
    },

    // ========== 設定管理 ==========

    /**
     * 自動再接続設定を変更
     */
    setAutoReconnect: (state, action: PayloadAction<boolean>) => {
      state.settings.autoReconnect = action.payload;
    },

    /**
     * 通知設定を変更
     */
    setNotificationEnabled: (state, action: PayloadAction<boolean>) => {
      state.settings.notificationEnabled = action.payload;
    },

    /**
     * 最大再接続試行回数を設定
     */
    setMaxReconnectAttempts: (state, action: PayloadAction<number>) => {
      state.settings.maxReconnectAttempts = Math.max(1, action.payload);
    },

    // ========== リセット ==========

    /**
     * リアルタイムデータをリセット
     */
    resetRealtimeData: (state) => {
      state.realtimeData = initialState.realtimeData;
    },

    /**
     * すべての状態をリセット
     */
    reset: () => {
      return initialState;
    },
  },
});

// アクションをエクスポート
export const {
  // 接続状態
  setConnectionState,
  resetReconnectAttempts,

  // エラー状態
  setError,
  clearError,

  // リアルタイムデータ
  updatePresentation,
  startPresentation,
  stopPresentation,
  changeSlide,
  updateSlide,
  participantJoined,
  participantLeft,
  receiveResponse,
  updateAnalytics,

  // 通知
  addNotification,
  removeNotification,
  clearNotifications,

  // 設定
  setAutoReconnect,
  setNotificationEnabled,
  setMaxReconnectAttempts,

  // リセット
  resetRealtimeData,
  reset,
} = socketSlice.actions;

// リデューサーをエクスポート
export default socketSlice.reducer;

// セレクター関数をエクスポート
export const socketSelectors = {
  // 接続状態
  getConnectionState: (state: { socket: SocketState }) =>
    state.socket.connectionState,
  getIsConnected: (state: { socket: SocketState }) => state.socket.isConnected,
  getIsConnecting: (state: { socket: SocketState }) =>
    state.socket.isConnecting,
  getReconnectAttempts: (state: { socket: SocketState }) =>
    state.socket.reconnectAttempts,

  // エラー状態
  getError: (state: { socket: SocketState }) => state.socket.error,
  getHasError: (state: { socket: SocketState }) => state.socket.error.hasError,

  // リアルタイムデータ
  getCurrentPresentation: (state: { socket: SocketState }) =>
    state.socket.realtimeData.currentPresentation,
  getPresentationStatus: (state: { socket: SocketState }) =>
    state.socket.realtimeData.presentationStatus,
  getCurrentSlide: (state: { socket: SocketState }) =>
    state.socket.realtimeData.currentSlide,
  getParticipants: (state: { socket: SocketState }) =>
    state.socket.realtimeData.participants,
  getResponses: (state: { socket: SocketState }) =>
    state.socket.realtimeData.responses,
  getAnalytics: (state: { socket: SocketState }) =>
    state.socket.realtimeData.analytics,

  // 通知
  getNotifications: (state: { socket: SocketState }) =>
    state.socket.notifications,
  getUnreadNotificationCount: (state: { socket: SocketState }) =>
    state.socket.notifications.filter((n) => !n.read).length,

  // 設定
  getSettings: (state: { socket: SocketState }) => state.socket.settings,
};
