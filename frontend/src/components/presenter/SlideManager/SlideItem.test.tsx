/**
 * SlideItemコンポーネントの単体テスト
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { SlideItem } from './SlideItem';
import { SlideData } from './types';

const mockSlide: SlideData = {
  id: 'test-slide',
  presentationId: 'test-presentation',
  type: 'multiple_choice',
  title: 'テストスライドタイトル',
  question: 'テストスライド質問',
  options: ['選択肢1', '選択肢2', '選択肢3'],
  slideOrder: 0,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

// テスト用のラッパーコンポーネント
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <DndContext onDragEnd={() => {}}>
    {children}
  </DndContext>
);

describe('SlideItem', () => {
  const mockOnClick = jest.fn();
  const mockOnAction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('スライド情報が正しく表示される', () => {
    render(
      <TestWrapper>
        <SlideItem
          slide={mockSlide}
          index={0}
          onClick={mockOnClick}
          onAction={mockOnAction}
        />
      </TestWrapper>
    );

    expect(screen.getByText('テストスライドタイトル')).toBeInTheDocument();
    expect(screen.getByText('テストスライド質問')).toBeInTheDocument();
    expect(screen.getByText('選択肢: 3個')).toBeInTheDocument();
    expect(screen.getByText('多肢選択')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // スライド番号
  });

  test('ワードクラウドスライドが正しく表示される', () => {
    const wordCloudSlide: SlideData = {
      ...mockSlide,
      type: 'word_cloud',
      options: undefined,
    };

    render(
      <TestWrapper>
        <SlideItem
          slide={wordCloudSlide}
          index={1}
          onClick={mockOnClick}
          onAction={mockOnAction}
        />
      </TestWrapper>
    );

    expect(screen.getByText('ワードクラウド')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // スライド番号
    expect(screen.queryByText('選択肢:')).not.toBeInTheDocument();
  });

  test('クリックイベントが正しく動作する', () => {
    render(
      <TestWrapper>
        <SlideItem
          slide={mockSlide}
          index={0}
          onClick={mockOnClick}
          onAction={mockOnAction}
        />
      </TestWrapper>
    );

    const slideCard = screen.getByText('テストスライドタイトル').closest('.MuiCard-root');
    if (slideCard) {
      fireEvent.click(slideCard);
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    }
  });

  test('選択状態のスタイリングが適用される', () => {
    render(
      <TestWrapper>
        <SlideItem
          slide={mockSlide}
          index={0}
          selected={true}
          onClick={mockOnClick}
          onAction={mockOnAction}
        />
      </TestWrapper>
    );

    const slideCard = screen.getByText('テストスライドタイトル').closest('.MuiCard-root');
    expect(slideCard).toHaveStyle({ borderLeft: expect.stringContaining('4px solid') });
  });

  test('編集不可モードでドラッグハンドルとアクションが表示されない', () => {
    render(
      <TestWrapper>
        <SlideItem
          slide={mockSlide}
          index={0}
          onClick={mockOnClick}
          onAction={mockOnAction}
          editable={false}
        />
      </TestWrapper>
    );

    expect(screen.queryByLabelText('スライド 1 を移動')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('スライドアクション')).not.toBeInTheDocument();
  });

  test('タイトル未設定の場合のフォールバック表示', () => {
    const slideWithoutTitle: SlideData = {
      ...mockSlide,
      title: '',
    };

    render(
      <TestWrapper>
        <SlideItem
          slide={slideWithoutTitle}
          index={0}
          onClick={mockOnClick}
          onAction={mockOnAction}
        />
      </TestWrapper>
    );

    expect(screen.getByText('タイトル未設定')).toBeInTheDocument();
  });

  test('質問未設定の場合のフォールバック表示', () => {
    const slideWithoutQuestion: SlideData = {
      ...mockSlide,
      question: '',
    };

    render(
      <TestWrapper>
        <SlideItem
          slide={slideWithoutQuestion}
          index={0}
          onClick={mockOnClick}
          onAction={mockOnAction}
        />
      </TestWrapper>
    );

    expect(screen.getByText('質問未設定')).toBeInTheDocument();
  });
});