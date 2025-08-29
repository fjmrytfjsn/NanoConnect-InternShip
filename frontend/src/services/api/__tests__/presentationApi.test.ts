/**
 * PresentationApi のテスト
 */

import { presentationApi } from '../presentationApi';
import { api } from '../baseApi';

// apiクライアントをモック
jest.mock('../baseApi', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockApi = api as jest.Mocked<typeof api>;

describe('PresentationApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('デフォルトオプションでプレゼンテーション一覧を取得する', async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            id: '1',
            title: 'Test Presentation',
            description: 'Description',
            presenterId: 'user1',
            accessCode: 'ABC123',
            isActive: false,
            currentSlideIndex: 0,
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:00:00Z',
          },
        ],
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await presentationApi.getAll();

      expect(mockApi.get).toHaveBeenCalledWith('/presentations');
      expect(result).toEqual(mockResponse);
    });

    it('検索オプション付きでプレゼンテーション一覧を取得する', async () => {
      const mockResponse = { success: true, data: [] };
      const options = {
        page: 2,
        limit: 20,
        search: 'test',
        status: 'active' as const,
        sortBy: 'title' as const,
        sortOrder: 'desc' as const,
      };

      mockApi.get.mockResolvedValue(mockResponse);

      await presentationApi.getAll(options);

      expect(mockApi.get).toHaveBeenCalledWith(
        '/presentations?page=2&limit=20&search=test&status=active&sortBy=title&sortOrder=desc'
      );
    });

    it('status が "all" の場合はクエリパラメータに含まれない', async () => {
      const mockResponse = { success: true, data: [] };
      mockApi.get.mockResolvedValue(mockResponse);

      await presentationApi.getAll({ status: 'all' });

      expect(mockApi.get).toHaveBeenCalledWith('/presentations');
    });
  });

  describe('getById', () => {
    it('指定IDのプレゼンテーションを取得する', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: '1',
          title: 'Test Presentation',
          description: 'Description',
          presenterId: 'user1',
          accessCode: 'ABC123',
          isActive: false,
          currentSlideIndex: 0,
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await presentationApi.getById(1);

      expect(mockApi.get).toHaveBeenCalledWith('/presentations/1');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('create', () => {
    it('新規プレゼンテーションを作成する', async () => {
      const requestData = {
        title: 'New Presentation',
        description: 'New Description',
      };

      const mockResponse = {
        id: '1',
        created: true,
        presentation: {
          id: '1',
          title: 'New Presentation',
          description: 'New Description',
          presenterId: 'user1',
          accessCode: 'XYZ789',
          isActive: false,
          currentSlideIndex: 0,
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
        accessCode: 'XYZ789',
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await presentationApi.create(requestData);

      expect(mockApi.post).toHaveBeenCalledWith('/presentations', requestData);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('update', () => {
    it('プレゼンテーションを更新する', async () => {
      const requestData = {
        title: 'Updated Title',
        description: 'Updated Description',
      };

      const mockResponse = {
        id: '1',
        updated: true,
        affectedRows: 1,
      };

      mockApi.put.mockResolvedValue(mockResponse);

      const result = await presentationApi.update(1, requestData);

      expect(mockApi.put).toHaveBeenCalledWith('/presentations/1', requestData);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('delete', () => {
    it('プレゼンテーションを削除する', async () => {
      const mockResponse = {
        id: '1',
        deleted: true,
        affectedRows: 1,
      };

      mockApi.delete.mockResolvedValue(mockResponse);

      const result = await presentationApi.delete(1);

      expect(mockApi.delete).toHaveBeenCalledWith('/presentations/1');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('プレゼンテーション制御', () => {
    it('プレゼンテーションを開始する', async () => {
      const mockResponse = {
        success: true,
        data: {
          started: true,
          currentSlideIndex: 0,
        },
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await presentationApi.start(1);

      expect(mockApi.post).toHaveBeenCalledWith('/presentations/1/start');
      expect(result).toEqual(mockResponse);
    });

    it('プレゼンテーションを停止する', async () => {
      const mockResponse = {
        success: true,
        data: {
          stopped: true,
        },
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await presentationApi.stop(1);

      expect(mockApi.post).toHaveBeenCalledWith('/presentations/1/stop');
      expect(result).toEqual(mockResponse);
    });

    it('現在のスライドを変更する', async () => {
      const mockResponse = {
        success: true,
        data: {
          slideIndex: 2,
        },
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await presentationApi.changeSlide(1, 2);

      expect(mockApi.post).toHaveBeenCalledWith('/presentations/1/slide', {
        slideIndex: 2,
      });
      expect(result).toEqual(mockResponse);
    });

    it('次のスライドに移動する', async () => {
      const mockResponse = {
        success: true,
        data: {
          slideIndex: 1,
          hasNext: true,
        },
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await presentationApi.nextSlide(1);

      expect(mockApi.post).toHaveBeenCalledWith('/presentations/1/next-slide');
      expect(result).toEqual(mockResponse);
    });

    it('前のスライドに移動する', async () => {
      const mockResponse = {
        success: true,
        data: {
          slideIndex: 0,
          hasPrevious: false,
        },
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await presentationApi.previousSlide(1);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/presentations/1/previous-slide'
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('join', () => {
    it('プレゼンテーションに参加する', async () => {
      const requestData = {
        accessCode: 'ABC123',
        participantName: 'Test User',
      };

      const mockResponse = {
        presentationId: '1',
        presentation: {
          id: '1',
          title: 'Test Presentation',
          description: 'Description',
          presenterId: 'user1',
          accessCode: 'ABC123',
          isActive: true,
          currentSlideIndex: 0,
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
        sessionId: 'session123',
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await presentationApi.join(requestData);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/presentations/join',
        requestData
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getAnalytics', () => {
    it('プレゼンテーションの分析データを取得する', async () => {
      const mockResponse = {
        presentationId: '1',
        totalResponses: 50,
        slideAnalytics: [
          {
            slideId: 'slide1',
            slideTitle: 'Question 1',
            responseCount: 25,
            data: {
              type: 'multiple_choice',
              optionCounts: {
                'Option A': 15,
                'Option B': 10,
              },
            },
          },
        ],
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await presentationApi.getAnalytics(1);

      expect(mockApi.get).toHaveBeenCalledWith('/presentations/1/analytics');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('search', () => {
    it('基本的な検索を実行する', async () => {
      const mockResponse = {
        success: true,
        data: [],
      };

      mockApi.get.mockResolvedValue(mockResponse);

      await presentationApi.search('test query');

      expect(mockApi.get).toHaveBeenCalledWith(
        '/presentations/search?q=test+query'
      );
    });

    it('フィルター付きの検索を実行する', async () => {
      const mockResponse = {
        success: true,
        data: [],
      };

      const filters = {
        tags: ['tag1', 'tag2'],
        dateFrom: '2023-01-01',
        dateTo: '2023-12-31',
        minParticipants: 5,
        maxParticipants: 100,
      };

      mockApi.get.mockResolvedValue(mockResponse);

      await presentationApi.search('test query', filters);

      expect(mockApi.get).toHaveBeenCalledWith(
        '/presentations/search?q=test+query&tags=tag1&tags=tag2&dateFrom=2023-01-01&dateTo=2023-12-31&minParticipants=5&maxParticipants=100'
      );
    });
  });

  describe('duplicate', () => {
    it('プレゼンテーションを複製する', async () => {
      const mockResponse = {
        id: '2',
        created: true,
        presentation: {
          id: '2',
          title: 'Copy of Test Presentation',
          description: 'Description',
          presenterId: 'user1',
          accessCode: 'DEF456',
          isActive: false,
          currentSlideIndex: 0,
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
        accessCode: 'DEF456',
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await presentationApi.duplicate(
        1,
        'Copy of Test Presentation'
      );

      expect(mockApi.post).toHaveBeenCalledWith('/presentations/1/duplicate', {
        title: 'Copy of Test Presentation',
      });
      expect(result).toEqual(mockResponse);
    });
  });
});
