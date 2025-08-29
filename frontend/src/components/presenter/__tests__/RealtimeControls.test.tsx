/**
 * RealtimeControlsコンポーネントのテスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';

import { RealtimeControls } from '../RealtimeControls';
import socketSlice from '../../../store/slices/socketSlice';
import presentationSlice from '../../../store/slices/presentationSlice';
import authSlice from '../../../store/slices/authSlice';

// モックされた状態
const mockSocketState = {
  connectionState: 'connected',
  isConnecting: false,
  isConnected: true,
  reconnectAttempts: 0,
  lastConnectedTime: '2024-01-01T12:00:00Z',
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

const mockPresentationState = {
  presentations: [],
  isLoading: false,
  error: null,
  viewMode: 'grid' as const,
  searchQuery: '',
  sortBy: 'createdAt' as const,
  sortOrder: 'desc' as const,
  statusFilter: 'all' as const,
};

const mockAuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
};

const createMockStore = (customSocketState = mockSocketState) => {
  return configureStore({
    reducer: {
      socket: socketSlice,
      presentation: presentationSlice,
      auth: authSlice,
    },
    preloadedState: {
      socket: customSocketState,
      presentation: mockPresentationState,
      auth: mockAuthState,
    },
  });
};

// useSocketフックをモック
const mockEmit = jest.fn();
const mockConnect = jest.fn();
const mockDisconnect = jest.fn();

jest.mock('../../../hooks/useSocket', () => ({
  useSocket: () => ({
    emit: mockEmit,
    connect: mockConnect,
    disconnect: mockDisconnect,
    isConnected: true,
  }),
}));

// useRealtimeConnectionフックをモック
jest.mock('../../../hooks/useRealtimeConnection', () => ({
  useRealtimeConnection: () => ({
    connectionState: 'connected',
    isConnected: true,
    isConnecting: false,
    networkState: 'online',
    connectionQuality: 'excellent',
    reconnectAttempts: 0,
    stats: {
      connectedTime: 60000,
      disconnectedTime: 0,
      reconnectCount: 0,
      lastLatency: 50,
      averageLatency: 55,
    },
    connect: mockConnect,
    disconnect: mockDisconnect,
    forceReconnect: jest.fn(),
    enableAutoReconnect: jest.fn(),
    disableAutoReconnect: jest.fn(),
    pingServer: jest.fn().mockResolvedValue(50),
    checkConnectionQuality: jest.fn().mockReturnValue('excellent'),
  }),
}));

const renderWithProviders = (
  component: React.ReactElement,
  store = createMockStore()
) => {
  return render(
    <Provider store={store}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </Provider>
  );
};

describe('RealtimeControls', () => {
  const defaultProps = {
    presentationId: 1,
    totalSlides: 5,
    currentSlideIndex: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('基本レンダリング', () => {
    it('通常モードで正しくレンダリングされること', () => {
      renderWithProviders(<RealtimeControls {...defaultProps} />);
      
      expect(screen.getByText('リアルタイム制御')).toBeInTheDocument();
      expect(screen.getByText('プレゼンテーション制御')).toBeInTheDocument();
      expect(screen.getByText('スライド制御')).toBeInTheDocument();
    });

    it('コンパクトモードで正しくレンダリングされること', () => {
      renderWithProviders(<RealtimeControls {...defaultProps} compact />);
      
      expect(screen.getByRole('button', { name: /開始/ })).toBeInTheDocument();
      expect(screen.queryByText('リアルタイム制御')).not.toBeInTheDocument();
    });
  });

  describe('プレゼンテーション制御', () => {
    it('プレゼンテーション開始ボタンが動作すること', async () => {
      const onStart = jest.fn();
      renderWithProviders(
        <RealtimeControls {...defaultProps} onPresentationStart={onStart} />
      );

      const startButton = screen.getByRole('button', { name: /プレゼンテーション開始/ });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockEmit).toHaveBeenCalledWith('control:start', { 
          presentationId: '1' 
        });
        expect(onStart).toHaveBeenCalledWith(1);
      });
    });

    it('プレゼンテーション中は停止ボタンが表示されること', () => {
      const connectedStore = createMockStore({
        ...mockSocketState,
        realtimeData: {
          ...mockSocketState.realtimeData,
          presentationStatus: 'started',
        },
      });

      renderWithProviders(<RealtimeControls {...defaultProps} />, connectedStore);

      expect(screen.getByRole('button', { name: /プレゼンテーション停止/ })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /プレゼンテーション開始/ })).not.toBeInTheDocument();
    });
  });

  describe('スライド制御', () => {
    it('最初のスライドでは前へボタンが無効になること', () => {
      const startedStore = createMockStore({
        ...mockSocketState,
        realtimeData: {
          ...mockSocketState.realtimeData,
          presentationStatus: 'started',
        },
      });

      renderWithProviders(
        <RealtimeControls {...defaultProps} currentSlideIndex={0} />,
        startedStore
      );

      const prevButton = screen.getByRole('button', { name: /前へ/ });
      expect(prevButton).toBeDisabled();
    });

    it('最後のスライドでは次へボタンが無効になること', () => {
      const startedStore = createMockStore({
        ...mockSocketState,
        realtimeData: {
          ...mockSocketState.realtimeData,
          presentationStatus: 'started',
        },
      });

      renderWithProviders(
        <RealtimeControls {...defaultProps} currentSlideIndex={4} totalSlides={5} />,
        startedStore
      );

      const nextButton = screen.getByRole('button', { name: /次へ/ });
      expect(nextButton).toBeDisabled();
    });

    it('次のスライドボタンが動作すること', async () => {
      const onSlideChange = jest.fn();
      const startedStore = createMockStore({
        ...mockSocketState,
        realtimeData: {
          ...mockSocketState.realtimeData,
          presentationStatus: 'started',
        },
      });

      renderWithProviders(
        <RealtimeControls 
          {...defaultProps} 
          currentSlideIndex={1}
          onSlideChange={onSlideChange}
        />,
        startedStore
      );

      const nextButton = screen.getByRole('button', { name: /次へ/ });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(mockEmit).toHaveBeenCalledWith('control:next-slide', { 
          presentationId: '1' 
        });
        expect(onSlideChange).toHaveBeenCalledWith(1, 2);
      });
    });
  });

  describe('接続状態', () => {
    it('未接続時は警告が表示されること', () => {
      const disconnectedStore = createMockStore({
        ...mockSocketState,
        isConnected: false,
        connectionState: 'disconnected',
      });

      renderWithProviders(<RealtimeControls {...defaultProps} />, disconnectedStore);

      expect(screen.getByText(/リアルタイム機能を使用するには接続が必要です/)).toBeInTheDocument();
    });

    it('接続時は接続状態が表示されること', () => {
      renderWithProviders(<RealtimeControls {...defaultProps} />);

      expect(screen.getByText(/接続済み/)).toBeInTheDocument();
    });
  });

  describe('プロパティ制御', () => {
    it('disabled時はボタンが無効になること', () => {
      renderWithProviders(<RealtimeControls {...defaultProps} disabled />);

      const startButton = screen.getByRole('button', { name: /プレゼンテーション開始/ });
      expect(startButton).toBeDisabled();
    });

    it('スライドプログレスバーが正しく表示されること', () => {
      renderWithProviders(
        <RealtimeControls {...defaultProps} currentSlideIndex={2} totalSlides={5} />
      );

      expect(screen.getByText('3 / 5')).toBeInTheDocument();
      expect(screen.getByText('60%')).toBeInTheDocument();
    });
  });
});