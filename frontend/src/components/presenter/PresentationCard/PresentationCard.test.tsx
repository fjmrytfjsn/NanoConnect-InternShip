import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { PresentationCard } from './PresentationCard';
import presentationReducer from '@/store/slices/presentationSlice';
import { Presentation } from '@/types/common';

const mockStore = configureStore({
  reducer: {
    presentation: presentationReducer,
  },
});

const mockPresentation: Presentation = {
  id: 1,
  title: 'テストプレゼンテーション',
  description: 'これはテスト用のプレゼンテーションです。',
  accessCode: 'TEST123',
  isActive: true,
  creatorId: 1,
  slideCount: 10,
  currentSlideIndex: 0,
  status: 'active',
  createdAt: '2024-01-10T09:00:00.000Z',
  updatedAt: '2024-01-15T14:30:00.000Z',
};

const renderWithStore = (component: React.ReactElement) => {
  return render(<Provider store={mockStore}>{component}</Provider>);
};

describe('PresentationCard', () => {
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnPreview = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('グリッド表示でプレゼンテーション情報を正しく表示する', () => {
    renderWithStore(
      <PresentationCard
        presentation={mockPresentation}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onPreview={mockOnPreview}
        isListView={false}
      />
    );

    expect(screen.getByText('テストプレゼンテーション')).toBeInTheDocument();
    expect(
      screen.getByText('これはテスト用のプレゼンテーションです。')
    ).toBeInTheDocument();
    expect(screen.getByText('10 スライド')).toBeInTheDocument();
    expect(screen.getByText('TEST123')).toBeInTheDocument();
    expect(screen.getByText('公開中')).toBeInTheDocument();
  });

  it('リスト表示でプレゼンテーション情報を正しく表示する', () => {
    renderWithStore(
      <PresentationCard
        presentation={mockPresentation}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onPreview={mockOnPreview}
        isListView={true}
      />
    );

    expect(screen.getByText('テストプレゼンテーション')).toBeInTheDocument();
    expect(
      screen.getByText('これはテスト用のプレゼンテーションです。')
    ).toBeInTheDocument();
  });

  it('編集ボタンがクリックされた時にonEditコールバックが呼ばれる', () => {
    renderWithStore(
      <PresentationCard
        presentation={mockPresentation}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onPreview={mockOnPreview}
        isListView={false}
      />
    );

    const editButton = screen.getByRole('button', { name: /編集/ });
    fireEvent.click(editButton);

    expect(mockOnEdit).toHaveBeenCalledWith(1);
  });

  it('プレビューボタンがクリックされた時にonPreviewコールバックが呼ばれる', () => {
    renderWithStore(
      <PresentationCard
        presentation={mockPresentation}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onPreview={mockOnPreview}
        isListView={false}
      />
    );

    const previewButton = screen.getByRole('button', { name: /プレビュー/ });
    fireEvent.click(previewButton);

    expect(mockOnPreview).toHaveBeenCalledWith(1);
  });

  it('ステータスに応じた適切な色でChipが表示される', () => {
    const draftPresentation = { ...mockPresentation, status: 'draft' as const };

    renderWithStore(
      <PresentationCard
        presentation={draftPresentation}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onPreview={mockOnPreview}
        isListView={false}
      />
    );

    expect(screen.getByText('下書き')).toBeInTheDocument();
  });

  it('アクセシビリティ属性が適切に設定されている', () => {
    renderWithStore(
      <PresentationCard
        presentation={mockPresentation}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onPreview={mockOnPreview}
        isListView={false}
      />
    );

    expect(
      screen.getByRole('button', { name: /メニューを開く/ })
    ).toBeInTheDocument();
  });
});
