/**
 * socketSlice基本テスト
 */

import socketReducer, {
  setConnectionState,
  setError,
  clearError,
  updatePresentation,
  startPresentation,
  stopPresentation,
  changeSlide,
  addNotification,
  resetReconnectAttempts,
  socketSelectors,
  SocketState,
} from '@/store/slices/socketSlice';

describe('socketSlice', () => {
  let initialState: SocketState;

  beforeEach(() => {
    initialState = {
      connectionState: 'disconnected',
      isConnecting: false,
      isConnected: false,
      reconnectAttempts: 0,
      lastConnectedTime: null,
      lastDisconnectedTime: null,
      error: {
        hasError: false,
        message: '',
      },
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
      notifications: [],
      settings: {
        autoReconnect: true,
        notificationEnabled: true,
        maxReconnectAttempts: 5,
      },
    };
  });

  describe('接続状態管理', () => {
    it('接続状態を"connected"に更新する', () => {
      const action = setConnectionState('connected');
      const newState = socketReducer(initialState, action);

      expect(newState.connectionState).toBe('connected');
      expect(newState.isConnected).toBe(true);
      expect(newState.isConnecting).toBe(false);
      expect(newState.reconnectAttempts).toBe(0);
      expect(newState.error.hasError).toBe(false);
      expect(newState.lastConnectedTime).toBeTruthy();
    });

    it('接続状態を"connecting"に更新する', () => {
      const action = setConnectionState('connecting');
      const newState = socketReducer(initialState, action);

      expect(newState.connectionState).toBe('connecting');
      expect(newState.isConnecting).toBe(true);
      expect(newState.isConnected).toBe(false);
    });

    it('接続状態を"reconnecting"に更新して再接続試行回数を増加', () => {
      const action = setConnectionState('reconnecting');
      const newState = socketReducer(initialState, action);

      expect(newState.connectionState).toBe('reconnecting');
      expect(newState.isConnecting).toBe(true);
      expect(newState.reconnectAttempts).toBe(1);
    });

    it('再接続試行回数をリセットする', () => {
      const stateWithRetries = {
        ...initialState,
        reconnectAttempts: 3,
      };

      const action = resetReconnectAttempts();
      const newState = socketReducer(stateWithRetries, action);

      expect(newState.reconnectAttempts).toBe(0);
    });
  });

  describe('エラー状態管理', () => {
    it('エラー状態を設定する', () => {
      const errorData = {
        message: 'Connection failed',
        code: 'CONN_ERROR',
        details: { reason: 'timeout' },
        timestamp: '2023-01-01T00:00:00Z',
      };

      const action = setError(errorData);
      const newState = socketReducer(initialState, action);

      expect(newState.error.hasError).toBe(true);
      expect(newState.error.message).toBe('Connection failed');
      expect(newState.error.code).toBe('CONN_ERROR');
      expect(newState.error.details).toEqual({ reason: 'timeout' });
    });

    it('エラー状態をクリアする', () => {
      const stateWithError = {
        ...initialState,
        error: {
          hasError: true,
          message: 'Test error',
          code: 'TEST_ERROR',
        },
      };

      const action = clearError();
      const newState = socketReducer(stateWithError, action);

      expect(newState.error.hasError).toBe(false);
      expect(newState.error.message).toBe('');
    });
  });

  describe('リアルタイムデータ管理', () => {
    it('プレゼンテーション情報を更新する', () => {
      const presentationData = {
        presentationId: 'pres-123',
        title: 'Test Presentation',
        timestamp: '2023-01-01T00:00:00Z',
      };

      const action = updatePresentation(presentationData);
      const newState = socketReducer(initialState, action);

      expect(newState.realtimeData.currentPresentation).toEqual(presentationData);
    });

    it('プレゼンテーションを開始する', () => {
      const startData = {
        presentationId: 'pres-123',
        currentSlideIndex: 0,
        currentSlide: {
          id: 'slide-1',
          presentationId: 'pres-123',
          title: 'First slide',
          type: 'multiple_choice' as const,
          content: {
            question: 'Test question?',
            options: ['A', 'B', 'C'],
          },
          order: 0,
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
        timestamp: '2023-01-01T00:00:00Z',
      };

      const action = startPresentation(startData);
      const newState = socketReducer(initialState, action);

      expect(newState.realtimeData.presentationStatus).toBe('started');
      expect(newState.realtimeData.currentPresentation?.presentationId).toBe('pres-123');
    });

    it('プレゼンテーションを停止する', () => {
      const stopData = {
        presentationId: 'pres-123',
        timestamp: '2023-01-01T00:00:00Z',
      };

      const action = stopPresentation(stopData);
      const newState = socketReducer(initialState, action);

      expect(newState.realtimeData.presentationStatus).toBe('stopped');
    });

    it('スライドを変更する', () => {
      const slideData = {
        presentationId: 'pres-123',
        slideId: 'slide-2',
        slideIndex: 1,
        slide: {
          id: 'slide-2',
          presentationId: 'pres-123',
          title: 'Second slide',
          type: 'word_cloud' as const,
          content: {
            question: 'What comes to mind?',
            settings: {
              maxWords: 50,
            },
          },
          order: 1,
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
        timestamp: '2023-01-01T00:00:00Z',
      };

      const action = changeSlide(slideData);
      const newState = socketReducer(initialState, action);

      expect(newState.realtimeData.currentSlide).toEqual(slideData);
      expect(newState.realtimeData.responses).toEqual([]); // スライド変更時にレスポンスクリア
    });
  });

  describe('通知管理', () => {
    it('通知を追加する', () => {
      const notification = {
        type: 'info' as const,
        title: 'Test Notification',
        message: 'This is a test',
        timestamp: '2023-01-01T00:00:00Z',
      };

      const action = addNotification(notification);
      const newState = socketReducer(initialState, action);

      expect(newState.notifications).toHaveLength(1);
      expect(newState.notifications[0]).toEqual(
        expect.objectContaining({
          type: 'info',
          title: 'Test Notification',
          message: 'This is a test',
        })
      );
    });
  });
});

describe('socketSelectors', () => {
  let mockState: { socket: SocketState };

  beforeEach(() => {
    mockState = {
      socket: {
        connectionState: 'connected',
        isConnecting: false,
        isConnected: true,
        reconnectAttempts: 0,
        lastConnectedTime: '2023-01-01T00:00:00Z',
        lastDisconnectedTime: null,
        error: {
          hasError: false,
          message: '',
        },
        realtimeData: {
          currentPresentation: {
            presentationId: 'pres-123',
            title: 'Test Presentation',
            timestamp: '2023-01-01T00:00:00Z',
          },
          presentationStatus: 'started',
          currentSlide: null,
          participants: {
            count: 5,
            recent: [],
          },
          responses: [],
          analytics: null,
        },
        notifications: [
          {
            type: 'info',
            title: 'Test',
            message: 'Test message',
            timestamp: '2023-01-01T00:00:00Z',
            read: false,
          },
        ],
        settings: {
          autoReconnect: true,
          notificationEnabled: true,
          maxReconnectAttempts: 5,
        },
      },
    };
  });

  it('接続状態を取得する', () => {
    expect(socketSelectors.getConnectionState(mockState)).toBe('connected');
    expect(socketSelectors.getIsConnected(mockState)).toBe(true);
    expect(socketSelectors.getIsConnecting(mockState)).toBe(false);
  });

  it('エラー状態を取得する', () => {
    expect(socketSelectors.getHasError(mockState)).toBe(false);
    expect(socketSelectors.getError(mockState)).toEqual({
      hasError: false,
      message: '',
    });
  });

  it('リアルタイムデータを取得する', () => {
    expect(socketSelectors.getCurrentPresentation(mockState)).toEqual({
      presentationId: 'pres-123',
      title: 'Test Presentation',
      timestamp: '2023-01-01T00:00:00Z',
    });
    expect(socketSelectors.getPresentationStatus(mockState)).toBe('started');
    expect(socketSelectors.getParticipants(mockState)).toEqual({
      count: 5,
      recent: [],
    });
  });

  it('通知を取得する', () => {
    expect(socketSelectors.getNotifications(mockState)).toHaveLength(1);
    expect(socketSelectors.getUnreadNotificationCount(mockState)).toBe(1);
  });

  it('設定を取得する', () => {
    expect(socketSelectors.getSettings(mockState)).toEqual({
      autoReconnect: true,
      notificationEnabled: true,
      maxReconnectAttempts: 5,
    });
  });
});