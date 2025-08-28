import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { PresenterDashboard } from '../PresenterDashboard';
import presentationReducer from '@/store/slices/presentationSlice';
import authReducer from '@/store/slices/authSlice';

const mockNavigate = jest.fn();

// React Routerのモック
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const createMockStore = () => {
  return configureStore({
    reducer: {
      presentation: presentationReducer,
      auth: authReducer,
    },
  });
};

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <Provider store={createMockStore()}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </Provider>
  );
};

describe('PresenterDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ダッシュボードが正しくレンダリングされる', () => {
    renderWithProviders(<PresenterDashboard />);

    expect(screen.getByText('プレゼンテーション管理')).toBeInTheDocument();
    expect(screen.getByText('プレゼンテーションの作成・編集・管理を行います')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /新規作成/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /更新/ })).toBeInTheDocument();
  });

  it('新規作成ボタンをクリックすると適切なページに遷移する', () => {
    renderWithProviders(<PresenterDashboard />);

    const createButton = screen.getAllByRole('button', { name: /新規作成/ })[0];
    fireEvent.click(createButton);

    expect(mockNavigate).toHaveBeenCalledWith('/presenter/presentations/new');
  });

  it('削除確認ダイアログが正しく機能する', async () => {
    renderWithProviders(<PresenterDashboard />);

    // プレゼンテーションデータが読み込まれるまで待機
    await waitFor(() => {
      expect(screen.getByText('React基礎講座')).toBeInTheDocument();
    });

    // メニューを開く
    const menuButtons = screen.getAllByLabelText('メニューを開く');
    fireEvent.click(menuButtons[0]);

    // 削除オプションをクリック
    const deleteOption = screen.getByText('削除');
    fireEvent.click(deleteOption);

    // 削除確認ダイアログが表示される
    expect(screen.getByText('プレゼンテーションの削除')).toBeInTheDocument();
    expect(screen.getByText(/この操作は取り消すことができません/)).toBeInTheDocument();

    // キャンセルボタンをテスト
    const cancelButton = screen.getByRole('button', { name: /キャンセル/ });
    fireEvent.click(cancelButton);

    // ダイアログが閉じられる
    await waitFor(() => {
      expect(screen.queryByText('プレゼンテーションの削除')).not.toBeInTheDocument();
    });
  });

  it('フローティングアクションボタンが表示される', () => {
    renderWithProviders(<PresenterDashboard />);

    const fab = screen.getByLabelText('新規作成');
    expect(fab).toBeInTheDocument();
  });

  it('アクセシビリティ属性が適切に設定されている', () => {
    renderWithProviders(<PresenterDashboard />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('プレゼンテーション管理');
  });
});