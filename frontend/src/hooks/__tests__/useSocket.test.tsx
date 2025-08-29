/**
 * useSocket基本テスト
 */

import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import socketReducer from '@/store/slices/socketSlice';

// Socket.IOクライアントをモック
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    removeAllListeners: jest.fn(),
    connected: false,
    id: 'mock-socket-id',
  })),
}));

// SocketServiceを完全にモック
jest.mock('@/services/socket/SocketService', () => {
  const mockService = {
    initialize: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    getConnectionState: jest.fn(() => 'disconnected'),
    isConnected: jest.fn(() => false),
    getSocket: jest.fn(() => null),
  };

  return {
    SocketService: {
      getInstance: () => mockService,
    },
    socketService: mockService,
  };
});

// useSocketをインポート
import { useSocket } from '@/hooks/useSocket';

// テスト用ストアを作成
const createTestStore = () => {
  return configureStore({
    reducer: {
      socket: socketReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: [],
        },
      }),
  });
};

const createWrapper = (store = createTestStore()) => {
  const WrapperComponent = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  WrapperComponent.displayName = 'WrapperComponent';
  return WrapperComponent;
};

// モックされたsocketServiceのインスタンスを取得
import { socketService as mockSocketService } from '@/services/socket/SocketService';

describe('useSocket', () => {
  beforeEach(() => {
    // Windowオブジェクトをモック
    Object.defineProperty(window, 'addEventListener', {
      value: jest.fn(),
      writable: true,
    });
    Object.defineProperty(window, 'removeEventListener', {
      value: jest.fn(),
      writable: true,
    });
    Object.defineProperty(window, 'dispatchEvent', {
      value: jest.fn(),
      writable: true,
    });

    // すべてのモック関数をクリア
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('基本機能が正常に初期化される', () => {
    const { result } = renderHook(() => useSocket(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toHaveProperty('connect');
    expect(result.current).toHaveProperty('disconnect');
    expect(result.current).toHaveProperty('emit');
    expect(result.current).toHaveProperty('on');
    expect(result.current).toHaveProperty('off');
    expect(result.current).toHaveProperty('getConnectionState');
    expect(result.current).toHaveProperty('isConnected');
    expect(result.current).toHaveProperty('joinPresentation');
    expect(result.current).toHaveProperty('leavePresentation');
    expect(result.current).toHaveProperty('submitResponse');
  });

  it('自動接続が無効の場合、接続処理が自動実行されない', () => {
    renderHook(() => useSocket(false), {
      wrapper: createWrapper(),
    });

    expect(mockSocketService.connect).not.toHaveBeenCalled();
  });

  it('接続関数が正常に動作する', () => {
    const { result } = renderHook(() => useSocket(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.connect();
    });

    expect(mockSocketService.connect).toHaveBeenCalled();
  });

  it('切断関数が正常に動作する', () => {
    const { result } = renderHook(() => useSocket(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.disconnect();
    });

    expect(mockSocketService.disconnect).toHaveBeenCalled();
  });

  it('プレゼンテーション参加関数が正常に動作する', () => {
    const { result } = renderHook(() => useSocket(), {
      wrapper: createWrapper(),
    });

    const mockCallback = jest.fn();

    act(() => {
      result.current.joinPresentation('TEST123', mockCallback);
    });

    expect(mockSocketService.emit).toHaveBeenCalledWith(
      'join:presentation',
      { accessCode: 'TEST123' },
      mockCallback
    );
  });

  it('プレゼンテーション退出関数が正常に動作する', () => {
    const { result } = renderHook(() => useSocket(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.leavePresentation('pres-123', 'session-456');
    });

    expect(mockSocketService.emit).toHaveBeenCalledWith('leave:presentation', {
      presentationId: 'pres-123',
      sessionId: 'session-456',
    });
  });

  it('回答送信関数が正常に動作する', () => {
    const { result } = renderHook(() => useSocket(), {
      wrapper: createWrapper(),
    });

    const responseData = {
      type: 'multiple_choice' as const,
      selectedOptions: [0],
    };
    const mockCallback = jest.fn();

    act(() => {
      result.current.submitResponse(
        'pres-123',
        'slide-456',
        responseData,
        'session-789',
        mockCallback
      );
    });

    expect(mockSocketService.emit).toHaveBeenCalledWith(
      'submit:response',
      {
        presentationId: 'pres-123',
        slideId: 'slide-456',
        responseData,
        sessionId: 'session-789',
      },
      mockCallback
    );
  });

  it('プレゼンテーション制御関数が正常に動作する', () => {
    const { result } = renderHook(() => useSocket(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.startPresentationControl('pres-123');
    });

    expect(mockSocketService.emit).toHaveBeenCalledWith('control:start', {
      presentationId: 'pres-123',
    });

    act(() => {
      result.current.stopPresentationControl('pres-123');
    });

    expect(mockSocketService.emit).toHaveBeenCalledWith('control:stop', {
      presentationId: 'pres-123',
    });
  });

  it('スライド制御関数が正常に動作する', () => {
    const { result } = renderHook(() => useSocket(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.nextSlide('pres-123');
    });

    expect(mockSocketService.emit).toHaveBeenCalledWith('control:next-slide', {
      presentationId: 'pres-123',
    });

    act(() => {
      result.current.prevSlide('pres-123');
    });

    expect(mockSocketService.emit).toHaveBeenCalledWith('control:prev-slide', {
      presentationId: 'pres-123',
    });

    act(() => {
      result.current.gotoSlide('pres-123', 2);
    });

    expect(mockSocketService.emit).toHaveBeenCalledWith('control:goto-slide', {
      presentationId: 'pres-123',
      slideIndex: 2,
    });
  });
});
