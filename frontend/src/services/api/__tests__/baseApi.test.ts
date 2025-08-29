/**
 * BaseAPI のテスト
 */

import {
  ApiClient,
  ApiClientError,
  NetworkError,
  HTTP_STATUS,
} from '../baseApi';
import axios from 'axios';

// axiosをモック
jest.mock('axios', () => {
  const mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: {
        use: jest.fn(),
      },
      response: {
        use: jest.fn(),
      },
    },
  };

  return {
    __esModule: true,
    default: {
      create: jest.fn(() => mockAxiosInstance),
      ...mockAxiosInstance,
    },
    create: jest.fn(() => mockAxiosInstance),
  };
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ApiClient', () => {
  let apiClient: ApiClient;

  beforeEach(() => {
    apiClient = new ApiClient({
      baseURL: 'http://localhost:3000/api',
      timeout: 5000,
    });

    // localStorageのモック
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });

    // console.errorのモック
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'log').mockImplementation();

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('デフォルト設定でインスタンスが作成される', () => {
      const client = new ApiClient();
      expect(client).toBeInstanceOf(ApiClient);
    });

    it('カスタム設定でインスタンスが作成される', () => {
      const client = new ApiClient({
        baseURL: 'http://example.com',
        timeout: 10000,
        headers: { 'Custom-Header': 'value' },
      });
      expect(client).toBeInstanceOf(ApiClient);
    });
  });

  describe('認証トークン管理', () => {
    it('トークンを設定できる', () => {
      const token = 'test-token';
      apiClient.setAuthToken(token);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'nanoconnect_auth_token',
        token
      );
    });

    it('トークンをクリアできる', () => {
      apiClient.clearAuthToken();

      expect(localStorage.removeItem).toHaveBeenCalledWith(
        'nanoconnect_auth_token'
      );
    });

    it('認証状態を確認できる', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue('test-token');

      expect(apiClient.isAuthenticated()).toBe(true);

      (localStorage.getItem as jest.Mock).mockReturnValue(null);

      expect(apiClient.isAuthenticated()).toBe(false);
    });
  });

  describe('HTTP メソッド', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockAxiosInstance: any;

    beforeEach(() => {
      // メソッドのモックをリセット
      jest.clearAllMocks();
      // ApiClientが内部で使用するaxiosInstanceを取得
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockAxiosInstance = (apiClient as any).axiosInstance;
    });

    it('GET リクエストが正常に実行される', async () => {
      const responseData = { success: true, data: { id: 1, name: 'test' } };
      mockAxiosInstance.get.mockResolvedValue({ data: responseData });

      const result = await apiClient.get('/test');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', undefined);
      expect(result).toEqual(responseData);
    });

    it('POST リクエストが正常に実行される', async () => {
      const requestData = { name: 'test' };
      const responseData = { success: true, data: { id: 1, name: 'test' } };
      mockAxiosInstance.post.mockResolvedValue({ data: responseData });

      const result = await apiClient.post('/test', requestData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/test',
        requestData,
        undefined
      );
      expect(result).toEqual(responseData);
    });

    it('PUT リクエストが正常に実行される', async () => {
      const requestData = { id: 1, name: 'updated' };
      const responseData = { success: true, data: requestData };
      mockAxiosInstance.put.mockResolvedValue({ data: responseData });

      const result = await apiClient.put('/test/1', requestData);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        '/test/1',
        requestData,
        undefined
      );
      expect(result).toEqual(responseData);
    });

    it('DELETE リクエストが正常に実行される', async () => {
      const responseData = { success: true, message: 'Deleted' };
      mockAxiosInstance.delete.mockResolvedValue({ data: responseData });

      const result = await apiClient.delete('/test/1');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(
        '/test/1',
        undefined
      );
      expect(result).toEqual(responseData);
    });
  });

  describe('リトライ機能', () => {
    it('成功した場合はリトライしない', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      const result = await apiClient.withRetry(mockFn, 3, 100);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('失敗した場合は指定回数リトライする', async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new NetworkError('Network error'))
        .mockRejectedValueOnce(new NetworkError('Network error'))
        .mockResolvedValue('success');

      const result = await apiClient.withRetry(mockFn, 3, 10);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('4xx エラーの場合はリトライしない', async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValue(
          new ApiClientError('Bad Request', HTTP_STATUS.BAD_REQUEST)
        );

      await expect(apiClient.withRetry(mockFn, 3, 10)).rejects.toThrow(
        'Bad Request'
      );
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('最大リトライ回数を超えた場合はエラーを投げる', async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValue(new NetworkError('Network error'));

      await expect(apiClient.withRetry(mockFn, 2, 10)).rejects.toThrow(
        'Network error'
      );
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('エラーハンドリング', () => {
    it('ApiClientError が正しく生成される', () => {
      const error = new ApiClientError('Test error', 400, 'TEST_ERROR', {
        field: 'value',
      });

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('ApiClientError');
      expect(error.message).toBe('Test error');
      expect(error.status).toBe(400);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.details).toEqual({ field: 'value' });
    });

    it('NetworkError が正しく生成される', () => {
      const error = new NetworkError('Custom network error');

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('NetworkError');
      expect(error.message).toBe('Custom network error');
    });

    it('NetworkError はデフォルトメッセージを使用する', () => {
      const error = new NetworkError();

      expect(error.message).toBe('ネットワークエラーが発生しました');
    });
  });

  describe('safeGet メソッド', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockAxiosInstance: any;

    beforeEach(() => {
      // メソッドのモックをリセット
      jest.clearAllMocks();
      // ApiClientが内部で使用するaxiosInstanceを取得
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockAxiosInstance = (apiClient as any).axiosInstance;
    });

    it('成功時は success: true のレスポンスを返す', async () => {
      const responseData = { success: true, data: { id: 1 } };
      mockAxiosInstance.get.mockResolvedValue({ data: responseData });

      const result = await apiClient.safeGet('/test');

      expect(result).toEqual(responseData);
    });

    it('ApiClientError 発生時は success: false のレスポンスを返す', async () => {
      const error = new ApiClientError('Test error', 400, 'TEST_ERROR');
      mockAxiosInstance.get.mockRejectedValue(error);

      const result = await apiClient.safeGet('/test');

      expect(result).toEqual({
        success: false,
        error: {
          code: 'TEST_ERROR',
          message: 'Test error',
          details: undefined,
        },
      });
    });

    it('その他のエラーはそのまま投げる', async () => {
      const error = new Error('Unexpected error');
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(apiClient.safeGet('/test')).rejects.toThrow(
        'Unexpected error'
      );
    });
  });
});
