/**
 * ParticipantCounterコンポーネントのテスト
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';

import { ParticipantCounter } from '../ParticipantCounter';
import { SocketState } from '@/store/slices/socketSlice';
import socketSlice from '../../../store/slices/socketSlice';
import presentationSlice from '../../../store/slices/presentationSlice';
import authSlice from '../../../store/slices/authSlice';

// date-fnsのモック
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(() => '2分前'),
}));

// モックされた状態
const mockSocketState = {
  connectionState: 'connected' as const,
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
    presentationStatus: 'idle' as const,
    currentSlide: null,
    participants: {
      count: 5,
      recent: [
        {
          sessionId: 'session1',
          timestamp: '2024-01-01T12:00:00Z',
          participantCount: 5,
          presentationId: '1',
        },
        {
          sessionId: 'session2',
          timestamp: '2024-01-01T11:58:00Z',
          participantCount: 4,
          presentationId: '1',
        },
      ],
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

const createMockStore = (customSocketState?: Partial<SocketState>) => {
  return configureStore({
    reducer: {
      socket: socketSlice,
      presentation: presentationSlice,
      auth: authSlice,
    },
    preloadedState: {
      socket: { ...mockSocketState, ...customSocketState },
      presentation: mockPresentationState,
      auth: mockAuthState,
    },
  });
};

const renderWithProviders = (
  component: React.ReactElement,
  store = createMockStore()
) => {
  return render(
    <Provider store={store}>
      <BrowserRouter>{component}</BrowserRouter>
    </Provider>
  );
};

describe('ParticipantCounter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('基本レンダリング', () => {
    it('通常モードで正しくレンダリングされること', () => {
      renderWithProviders(<ParticipantCounter />);

      expect(screen.getByText('参加者')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('人が参加中')).toBeInTheDocument();
    });

    it('コンパクトモードで正しくレンダリングされること', () => {
      renderWithProviders(<ParticipantCounter compact />);

      // コンパクトモードでは参加者数がバッジで表示される
      expect(screen.getByLabelText(/参加者数/)).toBeInTheDocument();
      expect(screen.queryByText('参加者')).not.toBeInTheDocument();
    });
  });

  describe('参加者数表示', () => {
    it('参加者数が0の場合正しく表示されること', () => {
      const emptyStore = createMockStore({
        ...mockSocketState,
        realtimeData: {
          ...mockSocketState.realtimeData,
          participants: {
            count: 0,
            recent: [],
          },
        },
      });

      renderWithProviders(<ParticipantCounter />, emptyStore);

      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('人が参加中')).toBeInTheDocument();
    });

    it('参加者数が複数の場合正しく表示されること', () => {
      renderWithProviders(<ParticipantCounter />);

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('人が参加中')).toBeInTheDocument();
    });
  });

  describe('接続状態表示', () => {
    it('接続済みの場合は同期中状態が表示されること', () => {
      renderWithProviders(<ParticipantCounter />);

      expect(screen.getByText('リアルタイム同期中')).toBeInTheDocument();
    });

    it('未接続の場合は同期停止状態が表示されること', () => {
      const disconnectedStore = createMockStore({
        connectionState: 'disconnected',
        isConnected: false,
      });

      renderWithProviders(<ParticipantCounter />, disconnectedStore);

      expect(screen.getByText('同期停止')).toBeInTheDocument();
    });
  });

  describe('最近のアクティビティ', () => {
    it('最近のアクティビティが表示されること', () => {
      renderWithProviders(<ParticipantCounter showRecentActivity />);

      expect(screen.getByText('最近のアクティビティ')).toBeInTheDocument();
      expect(screen.getAllByText('参加者が参加')[0]).toBeInTheDocument();
    });

    it('アクティビティを非表示にできること', () => {
      renderWithProviders(<ParticipantCounter showRecentActivity={false} />);

      expect(
        screen.queryByText('最近のアクティビティ')
      ).not.toBeInTheDocument();
    });

    it('最近のアクティビティの最大表示件数が制限されること', () => {
      const manyActivitiesStore = createMockStore({
        ...mockSocketState,
        realtimeData: {
          ...mockSocketState.realtimeData,
          participants: {
            count: 10,
            recent: Array.from({ length: 10 }, (_, i) => ({
              sessionId: `session${i}`,
              timestamp: `2024-01-01T${String(12 - i).padStart(2, '0')}:00:00Z`,
              participantCount: 10 - i,
              presentationId: '1',
            })),
          },
        },
      });

      renderWithProviders(
        <ParticipantCounter showRecentActivity maxRecentItems={3} />,
        manyActivitiesStore
      );

      // 最大3件まで表示される
      const activityItems = screen.getAllByText(/参加者が参加/);
      expect(activityItems).toHaveLength(3);
    });
  });

  describe('更新機能', () => {
    it('更新ボタンをクリックすると更新関数が呼ばれること', () => {
      const onRefresh = jest.fn();
      renderWithProviders(<ParticipantCounter onRefresh={onRefresh} />);

      const refreshButton = screen.getByLabelText('更新');
      fireEvent.click(refreshButton);

      expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it('コンパクトモードでも更新ボタンが動作すること', () => {
      const onRefresh = jest.fn();
      renderWithProviders(<ParticipantCounter compact onRefresh={onRefresh} />);

      const refreshButton = screen.getByLabelText('更新');
      fireEvent.click(refreshButton);

      expect(onRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('トレンド表示', () => {
    it('トレンド表示が有効な場合、統計情報が表示されること', () => {
      renderWithProviders(<ParticipantCounter showTrend />);

      // 統計情報のセクションを確認
      expect(screen.getByText(/変化:/)).toBeInTheDocument();
    });

    it('トレンド表示を無効にできること', () => {
      renderWithProviders(<ParticipantCounter showTrend={false} />);

      expect(screen.queryByText(/変化:/)).not.toBeInTheDocument();
    });
  });

  describe('プロパティ制御', () => {
    it('プロパティの制御が正しく動作すること', () => {
      renderWithProviders(<ParticipantCounter />);

      // 参加者数が正しく表示される
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('カスタムクラス名が適用されること', () => {
      const { container } = renderWithProviders(
        <ParticipantCounter className="test-class" />
      );

      expect(container.firstChild).toHaveClass('test-class');
    });
  });
});
