/**
 * エラーハンドリングのテスト
 */

import {
  convertToAppError,
  logError,
  getErrorDisplay,
  setupGlobalErrorHandler,
  errorRecovery,
  ERROR_CODES,
} from '../errorHandler';
import { ApiClientError, NetworkError } from '../baseApi';

// console.errorのモック
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

describe('ErrorHandler', () => {
  beforeEach(() => {
    console.error = jest.fn();
    console.warn = jest.fn();

    // localStorageのモック
    Object.defineProperty(window, 'localStorage', {
      value: {
        removeItem: jest.fn(),
      },
      writable: true,
    });

    // locationのモック
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/dashboard',
        href: 'http://localhost:3000/dashboard',
      },
      writable: true,
    });

    jest.clearAllMocks();
  });

  afterEach(() => {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });

  describe('convertToAppError', () => {
    it('ApiClientError を AppError に変換する', () => {
      const originalError = new ApiClientError(
        'API Error',
        400,
        'BAD_REQUEST',
        { field: 'value' }
      );

      const appError = convertToAppError(originalError);

      expect(appError).toMatchObject({
        type: 'api',
        message: 'API Error',
        code: 'BAD_REQUEST',
        details: { field: 'value' },
        originalError,
        recoverable: false, // 400 は認証エラーでも権限エラーでもないためfalse
        retryable: false, // 4xx なので基本的にリトライ不可
      });
      expect(appError.timestamp).toBeDefined();
      expect(appError.userFriendlyMessage).toBeDefined();
    });

    it('NetworkError を AppError に変換する', () => {
      const originalError = new NetworkError('Connection failed');

      const appError = convertToAppError(originalError);

      expect(appError).toMatchObject({
        type: 'network',
        message: 'Connection failed',
        code: ERROR_CODES.NETWORK_ERROR,
        originalError,
        recoverable: true,
        retryable: true,
      });
    });

    it('タイムアウトエラーを識別する', () => {
      const originalError = new Error('Request timeout occurred');

      const appError = convertToAppError(originalError);

      expect(appError).toMatchObject({
        type: 'network',
        code: ERROR_CODES.TIMEOUT_ERROR,
        recoverable: true,
        retryable: true,
      });
    });

    it('バリデーションエラーを識別する', () => {
      const originalError = new Error('validation failed');

      const appError = convertToAppError(originalError);

      expect(appError).toMatchObject({
        type: 'validation',
        code: ERROR_CODES.VALIDATION_ERROR,
        recoverable: true,
        retryable: false,
      });
    });

    it('一般的な Error を AppError に変換する', () => {
      const originalError = new Error('Something went wrong');

      const appError = convertToAppError(originalError);

      expect(appError).toMatchObject({
        type: 'unknown',
        message: 'Something went wrong',
        code: ERROR_CODES.UNKNOWN_ERROR,
        originalError,
        recoverable: false,
        retryable: false,
      });
    });

    it('文字列エラーを AppError に変換する', () => {
      const appError = convertToAppError('String error');

      expect(appError).toMatchObject({
        type: 'unknown',
        message: 'String error',
        code: ERROR_CODES.UNKNOWN_ERROR,
        recoverable: false,
        retryable: false,
      });
    });

    it('null/undefined エラーを AppError に変換する', () => {
      const appError = convertToAppError(null);

      expect(appError).toMatchObject({
        type: 'unknown',
        message: 'null',
        code: ERROR_CODES.UNKNOWN_ERROR,
        recoverable: false,
        retryable: false,
      });
    });
  });

  describe('logError', () => {
    const mockError = {
      type: 'api' as const,
      message: 'Test error',
      code: 'TEST_ERROR',
      timestamp: '2023-01-01T00:00:00Z',
      userFriendlyMessage: 'Test error occurred',
      recoverable: true,
      retryable: false,
      originalError: new Error('Original error'),
    };

    it('開発環境で詳細ログを出力する', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      logError(mockError, 'test context');

      expect(console.error).toHaveBeenCalledWith(
        '🚨 Application Error:',
        expect.objectContaining({
          ...mockError,
          context: 'test context',
          url: 'http://localhost:3000/dashboard',
        })
      );

      expect(console.error).toHaveBeenCalledWith(
        'Original error stack:',
        mockError.originalError.stack
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('本番環境で最小限のログを出力する', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      logError(mockError);

      expect(console.error).toHaveBeenCalledWith('Application Error:', {
        type: 'api',
        code: 'TEST_ERROR',
        message: 'Test error',
        timestamp: '2023-01-01T00:00:00Z',
        context: undefined,
      });

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('getErrorDisplay', () => {
    it('ApiClientError の表示情報を取得する', () => {
      const error = new ApiClientError('API Error', 400, 'BAD_REQUEST');

      const display = getErrorDisplay(error);

      expect(display).toMatchObject({
        title: 'APIエラー',
        message: expect.any(String),
        canRetry: false, // 400 なのでリトライ不可
      });
    });

    it('NetworkError の表示情報を取得する', () => {
      const error = new NetworkError('Connection failed');

      const display = getErrorDisplay(error);

      expect(display).toMatchObject({
        title: '通信エラー',
        message: 'インターネット接続を確認してください',
        canRetry: true,
      });
    });

    it('一般エラーの表示情報を取得する', () => {
      const error = new Error('Unknown error');

      const display = getErrorDisplay(error);

      expect(display).toMatchObject({
        title: 'エラー',
        message: '予期しないエラーが発生しました',
        canRetry: false,
      });
    });
  });

  describe('setupGlobalErrorHandler', () => {
    it('グローバルエラーハンドラーを設定する', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

      setupGlobalErrorHandler();

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'unhandledrejection',
        expect.any(Function)
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'error',
        expect.any(Function)
      );

      addEventListenerSpy.mockRestore();
    });
  });

  describe('errorRecovery', () => {
    describe('handleAuthError', () => {
      it('認証トークンをクリアして適切にリダイレクトする', () => {
        // location.href のセッターをモック
        const mockLocationHref = jest.fn();
        delete (window as any).location;
        (window as any).location = {
          pathname: '/dashboard',
          set href(url: string) {
            mockLocationHref(url);
          },
          get href() {
            return '';
          },
        };

        errorRecovery.handleAuthError();

        expect(localStorage.removeItem).toHaveBeenCalledWith(
          'nanoconnect_auth_token'
        );
        expect(mockLocationHref).toHaveBeenCalledWith(
          '/login?redirect=%2Fdashboard'
        );
      });

      it('ログインページにいる場合はリダイレクトしない', () => {
        const mockLocationHref = jest.fn();
        delete (window as any).location;
        (window as any).location = {
          pathname: '/login',
          set href(url: string) {
            mockLocationHref(url);
          },
          get href() {
            return '';
          },
        };

        errorRecovery.handleAuthError();

        expect(localStorage.removeItem).toHaveBeenCalledWith(
          'nanoconnect_auth_token'
        );
        expect(mockLocationHref).not.toHaveBeenCalled();
      });
    });

    describe('handleNetworkError', () => {
      it('リトライ関数が提供されていて、オンラインの場合にリトライを実行する', (done) => {
        const mockRetryFn = jest.fn();
        Object.defineProperty(navigator, 'onLine', {
          value: true,
          writable: true,
        });

        errorRecovery.handleNetworkError(mockRetryFn);

        setTimeout(() => {
          expect(mockRetryFn).toHaveBeenCalled();
          done();
        }, 3100); // 3秒 + バッファ
      });

      it('オフラインの場合はリトライしない', (done) => {
        const mockRetryFn = jest.fn();
        Object.defineProperty(navigator, 'onLine', {
          value: false,
          writable: true,
        });

        errorRecovery.handleNetworkError(mockRetryFn);

        setTimeout(() => {
          expect(mockRetryFn).not.toHaveBeenCalled();
          done();
        }, 3100);
      });
    });

    describe('handleServerError', () => {
      it('サーバーエラーの警告メッセージを出力する', () => {
        errorRecovery.handleServerError();

        expect(console.warn).toHaveBeenCalledWith(
          'サーバーエラーが発生しました。システム管理者に連絡してください。'
        );
      });
    });
  });
});
