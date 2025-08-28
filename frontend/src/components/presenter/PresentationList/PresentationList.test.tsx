import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { PresentationList } from './PresentationList';
import presentationReducer from '@/store/slices/presentationSlice';
import { fetchPresentationsSuccess } from '@/store/slices/presentationSlice';
import { Presentation } from '@/types/common';

const mockPresentations: Presentation[] = [
  {
    id: 1,
    title: 'React基礎講座',
    description: 'Reactの基本概念について',
    accessCode: 'ABC123',
    isActive: true,
    creatorId: 1,
    slideCount: 15,
    status: 'active',
    createdAt: '2024-01-10T09:00:00.000Z',
    updatedAt: '2024-01-15T14:30:00.000Z',
  },
  {
    id: 2,
    title: 'TypeScript入門',
    description: 'TypeScriptの型システムについて',
    accessCode: 'DEF456',
    isActive: false,
    creatorId: 1,
    slideCount: 22,
    status: 'draft',
    createdAt: '2024-01-08T10:15:00.000Z',
    updatedAt: '2024-01-12T16:45:00.000Z',
  },
];

const createMockStore = () => {
  const store = configureStore({
    reducer: {
      presentation: presentationReducer,
    },
  });
  store.dispatch(fetchPresentationsSuccess(mockPresentations));
  return store;
};

const renderWithStore = (
  component: React.ReactElement,
  store = createMockStore()
) => {
  return render(<Provider store={store}>{component}</Provider>);
};

describe('PresentationList', () => {
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnPreview = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('プレゼンテーション一覧が正しく表示される', () => {
    renderWithStore(
      <PresentationList
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onPreview={mockOnPreview}
      />
    );

    expect(screen.getByText('React基礎講座')).toBeInTheDocument();
    expect(screen.getByText('TypeScript入門')).toBeInTheDocument();
  });

  it('検索機能が動作する', () => {
    renderWithStore(
      <PresentationList
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onPreview={mockOnPreview}
      />
    );

    const searchInput =
      screen.getByPlaceholderText('プレゼンテーションを検索...');
    fireEvent.change(searchInput, { target: { value: 'React' } });

    expect(screen.getByText('React基礎講座')).toBeInTheDocument();
    expect(screen.queryByText('TypeScript入門')).not.toBeInTheDocument();
  });

  it('ステータスフィルタが動作する', () => {
    renderWithStore(
      <PresentationList
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onPreview={mockOnPreview}
      />
    );

    const statusFilter = screen.getByLabelText('ステータス');
    fireEvent.mouseDown(statusFilter);

    // メニューアイテムの「下書き」を選択 (カードのChipではなく)
    const draftMenuItem = screen.getByRole('option', { name: '下書き' });
    fireEvent.click(draftMenuItem);

    expect(screen.queryByText('React基礎講座')).not.toBeInTheDocument();
    expect(screen.getByText('TypeScript入門')).toBeInTheDocument();
  });

  it('表示モード切替が動作する', () => {
    renderWithStore(
      <PresentationList
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onPreview={mockOnPreview}
      />
    );

    const listViewButton = screen.getByRole('button', { name: /リスト表示/ });
    fireEvent.click(listViewButton);

    // リスト表示でのレイアウト確認は、より具体的なテストが必要な場合に追加
  });

  it('プレゼンテーションが空の場合のメッセージが表示される', () => {
    const emptyStore = configureStore({
      reducer: {
        presentation: presentationReducer,
      },
    });
    emptyStore.dispatch(fetchPresentationsSuccess([]));

    renderWithStore(
      <PresentationList
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onPreview={mockOnPreview}
      />,
      emptyStore
    );

    expect(
      screen.getByText('プレゼンテーションが見つかりません')
    ).toBeInTheDocument();
  });

  it('ローディング状態が正しく表示される', () => {
    const loadingStore = configureStore({
      reducer: {
        presentation: presentationReducer,
      },
      preloadedState: {
        presentation: {
          presentations: [],
          isLoading: true,
          error: null,
          viewMode: 'grid',
          searchQuery: '',
          sortBy: 'updatedAt',
          sortOrder: 'desc',
          statusFilter: 'all',
        },
      },
    });

    renderWithStore(
      <PresentationList
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onPreview={mockOnPreview}
      />,
      loadingStore
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
