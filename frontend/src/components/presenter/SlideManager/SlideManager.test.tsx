/**
 * SlideManagerコンポーネントの単体テスト
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { SlideManager } from './SlideManager';
import { SlideData } from './types';

// テスト用のモックデータ
const mockSlides: SlideData[] = [
  {
    id: 'slide-1',
    presentationId: 'test-presentation',
    type: 'multiple_choice',
    title: 'テストスライド1',
    question: 'テスト質問1',
    options: ['選択肢1', '選択肢2'],
    slideOrder: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'slide-2',
    presentationId: 'test-presentation',
    type: 'word_cloud',
    title: 'テストスライド2',
    question: 'テスト質問2',
    slideOrder: 1,
    createdAt: '2024-01-01T01:00:00Z',
    updatedAt: '2024-01-01T01:00:00Z',
  },
];

// モック関数
const mockHandlers = {
  onReorderSlides: jest.fn(() => Promise.resolve()),
  onAddSlide: jest.fn(),
  onEditSlide: jest.fn(),
  onDuplicateSlide: jest.fn(),
  onDeleteSlide: jest.fn(),
  onChangeSlideType: jest.fn(),
};

describe('SlideManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('スライド一覧が正しく表示される', () => {
    render(
      <SlideManager
        presentationId="test-presentation"
        slides={mockSlides}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('スライド管理')).toBeInTheDocument();
    expect(screen.getByText('(2枚)')).toBeInTheDocument();
    expect(screen.getByText('テストスライド1')).toBeInTheDocument();
    expect(screen.getByText('テストスライド2')).toBeInTheDocument();
  });

  test('新規スライド追加ボタンが機能する', () => {
    render(
      <SlideManager
        presentationId="test-presentation"
        slides={mockSlides}
        {...mockHandlers}
      />
    );

    const addButton = screen.getByText('新しいスライド');
    fireEvent.click(addButton);

    expect(mockHandlers.onAddSlide).toHaveBeenCalledTimes(1);
  });

  test('読み取り専用モードで編集ボタンが表示されない', () => {
    render(
      <SlideManager
        presentationId="test-presentation"
        slides={mockSlides}
        {...mockHandlers}
        editable={false}
      />
    );

    expect(screen.queryByText('新しいスライド')).not.toBeInTheDocument();
  });

  test('スライドが空の場合の表示', () => {
    render(
      <SlideManager
        presentationId="test-presentation"
        slides={[]}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('スライドがありません')).toBeInTheDocument();
    expect(
      screen.getByText(
        '「新しいスライドを追加」ボタンからスライドを作成してください。'
      )
    ).toBeInTheDocument();
  });

  test('ローディング状態が正しく表示される', () => {
    render(
      <SlideManager
        presentationId="test-presentation"
        slides={mockSlides}
        {...mockHandlers}
        loading={true}
      />
    );

    expect(screen.getByText('スライドを読み込み中...')).toBeInTheDocument();
  });

  test('スライドクリックで編集が呼ばれる', () => {
    render(
      <SlideManager
        presentationId="test-presentation"
        slides={mockSlides}
        {...mockHandlers}
      />
    );

    const slideCard = screen
      .getByText('テストスライド1')
      .closest('[role="button"]');
    if (slideCard) {
      fireEvent.click(slideCard);
      expect(mockHandlers.onEditSlide).toHaveBeenCalledWith('slide-1');
    }
  });

  test('スライドタイプアイコンが正しく表示される', () => {
    render(
      <SlideManager
        presentationId="test-presentation"
        slides={mockSlides}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('多肢選択')).toBeInTheDocument();
    expect(screen.getByText('ワードクラウド')).toBeInTheDocument();
  });
});
