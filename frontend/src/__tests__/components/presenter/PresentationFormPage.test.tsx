/**
 * PresentationFormPage コンポーネントのテスト
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PresentationFormPage from '../../../pages/PresentationFormPage';

// MemoryRouter でラップするヘルパー
const renderWithRouter = (initialEntries = ['/presentations/new']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <PresentationFormPage />
    </MemoryRouter>
  );
};

describe('PresentationFormPage', () => {
  // localStorageのモック
  beforeEach(() => {
    // localStorageをクリア
    localStorage.clear();
    
    // console.logをモック
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('新規作成モード', () => {
    it('新規作成用のヘッダーが表示される', () => {
      renderWithRouter(['/presentations/new']);
      
      expect(screen.getByText('プレゼンテーション作成')).toBeInTheDocument();
    });

    it('基本情報フォームが表示される', () => {
      renderWithRouter();
      
      expect(screen.getByLabelText('プレゼンテーションタイトル *')).toBeInTheDocument();
      expect(screen.getByLabelText('説明文')).toBeInTheDocument();
      expect(screen.getByLabelText('カテゴリー')).toBeInTheDocument();
    });

    it('設定フォームが表示される', () => {
      renderWithRouter();
      
      expect(screen.getByText('匿名回答を許可')).toBeInTheDocument();
      expect(screen.getByText('重複回答を防止')).toBeInTheDocument();
      expect(screen.getByText('参加者に結果を表示')).toBeInTheDocument();
    });

    it('プレビューボタンでプレビューが表示される', async () => {
      renderWithRouter();
      
      const previewButton = screen.getByText('プレビュー');
      fireEvent.click(previewButton);

      await waitFor(() => {
        expect(screen.getByText('プレビュー')).toBeInTheDocument();
        expect(screen.getByText('参加者から見た表示内容')).toBeInTheDocument();
      });
    });
  });

  describe('編集モード', () => {
    it('編集用のヘッダーが表示される', () => {
      renderWithRouter(['/presentations/123/edit']);
      
      expect(screen.getByText('プレゼンテーション編集')).toBeInTheDocument();
    });
  });

  describe('バリデーション', () => {
    it('タイトル未入力時にエラーが表示される', async () => {
      renderWithRouter();
      
      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('プレゼンテーションタイトルは必須です')).toBeInTheDocument();
      });
    });

    it('タイトル入力時にバリデーションエラーが解消される', async () => {
      renderWithRouter();
      
      const titleInput = screen.getByLabelText('プレゼンテーションタイトル *');
      
      // 保存ボタンクリック（エラー発生）
      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('プレゼンテーションタイトルは必須です')).toBeInTheDocument();
      });

      // タイトル入力
      fireEvent.change(titleInput, { target: { value: 'テストプレゼンテーション' } });

      await waitFor(() => {
        expect(screen.queryByText('プレゼンテーションタイトルは必須です')).not.toBeInTheDocument();
      });
    });

    it('長すぎるタイトル入力時にエラーが表示される', async () => {
      renderWithRouter();
      
      const titleInput = screen.getByLabelText('プレゼンテーションタイトル *');
      const longTitle = 'あ'.repeat(101); // 101文字

      fireEvent.change(titleInput, { target: { value: longTitle } });
      
      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('プレゼンテーションタイトルは100文字以内で入力してください')).toBeInTheDocument();
      });
    });
  });

  describe('自動保存', () => {
    beforeEach(() => {
      // タイマーをモック
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('フォーム入力時にlocalStorageに保存される', async () => {
      jest.spyOn(Storage.prototype, 'setItem');
      
      renderWithRouter();
      
      const titleInput = screen.getByLabelText('プレゼンテーションタイトル *');
      fireEvent.change(titleInput, { target: { value: 'テストタイトル' } });

      // 30秒進める（自動保存のタイマー）
      jest.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith(
          'presentation-draft',
          expect.stringContaining('テストタイトル')
        );
      });
    });

    it('下書きデータが復元される', () => {
      // 下書きデータをlocalStorageに設定
      const draftData = {
        formData: {
          title: '下書きタイトル',
          description: '下書き説明',
          category: 'business',
          tags: ['テスト'],
          settings: {
            allowAnonymousAnswers: true,
            preventDuplicateAnswers: true,
            showResultsToParticipants: true,
            contentFilter: true
          }
        },
        lastSaved: '2023-01-01T00:00:00.000Z',
        isDraft: true
      };
      
      localStorage.setItem('presentation-draft', JSON.stringify(draftData));
      
      renderWithRouter();
      
      expect(screen.getByDisplayValue('下書きタイトル')).toBeInTheDocument();
      expect(screen.getByDisplayValue('下書き説明')).toBeInTheDocument();
    });
  });
});