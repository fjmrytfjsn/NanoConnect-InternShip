/**
 * エラーハンドリングの標準化
 * API通信、アプリケーション全体のエラー処理を統一
 */

import { ApiClientError, NetworkError } from './baseApi';

/**
 * アプリケーション全体で使用するエラー型
 */
export type AppError = {
  type: 'api' | 'network' | 'validation' | 'business' | 'unknown';
  message: string;
  code?: string;
  details?: Record<string, unknown>;
  originalError?: Error;
  timestamp: string;
  userFriendlyMessage: string;
  recoverable: boolean;
  retryable: boolean;
};

/**
 * エラーコード定数
 */
export const ERROR_CODES = {
  // ネットワークエラー
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  CONNECTION_REFUSED: 'CONNECTION_REFUSED',

  // 認証エラー
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',

  // バリデーションエラー
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  REQUIRED_FIELD: 'REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // ビジネスロジックエラー
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // サーバーエラー
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // アプリケーションエラー
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
} as const;

/**
 * ユーザーフレンドリーなエラーメッセージのマッピング
 */
const ERROR_MESSAGE_MAP: Record<string, string> = {
  [ERROR_CODES.NETWORK_ERROR]: 'インターネット接続を確認してください',
  [ERROR_CODES.TIMEOUT_ERROR]:
    'リクエストがタイムアウトしました。しばらく待ってから再度お試しください',
  [ERROR_CODES.CONNECTION_REFUSED]: 'サーバーに接続できませんでした',

  [ERROR_CODES.AUTHENTICATION_FAILED]: 'ログイン情報が正しくありません',
  [ERROR_CODES.TOKEN_EXPIRED]:
    'セッションの有効期限が切れました。再度ログインしてください',
  [ERROR_CODES.UNAUTHORIZED]: 'ログインが必要です',
  [ERROR_CODES.FORBIDDEN]: 'この操作を実行する権限がありません',

  [ERROR_CODES.VALIDATION_ERROR]: '入力内容に問題があります',
  [ERROR_CODES.REQUIRED_FIELD]: '必須項目を入力してください',
  [ERROR_CODES.INVALID_FORMAT]: '入力形式が正しくありません',

  [ERROR_CODES.RESOURCE_NOT_FOUND]: '指定されたリソースが見つかりません',
  [ERROR_CODES.RESOURCE_ALREADY_EXISTS]: '既に存在するリソースです',
  [ERROR_CODES.OPERATION_NOT_ALLOWED]: 'この操作は許可されていません',
  [ERROR_CODES.INSUFFICIENT_PERMISSIONS]: '必要な権限がありません',

  [ERROR_CODES.INTERNAL_SERVER_ERROR]: 'サーバーでエラーが発生しました',
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 'サービスが一時的に利用できません',
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]:
    'リクエスト制限を超えました。しばらく待ってから再度お試しください',

  [ERROR_CODES.UNKNOWN_ERROR]: '予期しないエラーが発生しました',
  [ERROR_CODES.CONFIGURATION_ERROR]: 'システム設定にエラーがあります',
};

/**
 * エラー変換関数
 */
export const convertToAppError = (error: unknown): AppError => {
  const timestamp = new Date().toISOString();

  // ApiClientError の場合
  if (error instanceof ApiClientError) {
    return {
      type: 'api',
      message: error.message,
      code: error.code,
      details: error.details,
      originalError: error,
      timestamp,
      userFriendlyMessage: getUserFriendlyMessage(error.code, error.message),
      recoverable: isRecoverableError(error.status),
      retryable: isRetryableError(error.status),
    };
  }

  // NetworkError の場合
  if (error instanceof NetworkError) {
    return {
      type: 'network',
      message: error.message,
      code: ERROR_CODES.NETWORK_ERROR,
      originalError: error,
      timestamp,
      userFriendlyMessage: ERROR_MESSAGE_MAP[ERROR_CODES.NETWORK_ERROR],
      recoverable: true,
      retryable: true,
    };
  }

  // 通常のError の場合
  if (error instanceof Error) {
    // 特定のエラーパターンを識別
    if (error.message.includes('timeout')) {
      return {
        type: 'network',
        message: error.message,
        code: ERROR_CODES.TIMEOUT_ERROR,
        originalError: error,
        timestamp,
        userFriendlyMessage: ERROR_MESSAGE_MAP[ERROR_CODES.TIMEOUT_ERROR],
        recoverable: true,
        retryable: true,
      };
    }

    if (error.message.includes('validation')) {
      return {
        type: 'validation',
        message: error.message,
        code: ERROR_CODES.VALIDATION_ERROR,
        originalError: error,
        timestamp,
        userFriendlyMessage: ERROR_MESSAGE_MAP[ERROR_CODES.VALIDATION_ERROR],
        recoverable: true,
        retryable: false,
      };
    }

    return {
      type: 'unknown',
      message: error.message,
      code: ERROR_CODES.UNKNOWN_ERROR,
      originalError: error,
      timestamp,
      userFriendlyMessage: ERROR_MESSAGE_MAP[ERROR_CODES.UNKNOWN_ERROR],
      recoverable: false,
      retryable: false,
    };
  }

  // その他の場合
  return {
    type: 'unknown',
    message: String(error),
    code: ERROR_CODES.UNKNOWN_ERROR,
    timestamp,
    userFriendlyMessage: ERROR_MESSAGE_MAP[ERROR_CODES.UNKNOWN_ERROR],
    recoverable: false,
    retryable: false,
  };
};

/**
 * ユーザーフレンドリーメッセージの取得
 */
const getUserFriendlyMessage = (
  code?: string,
  originalMessage?: string
): string => {
  if (code && ERROR_MESSAGE_MAP[code]) {
    return ERROR_MESSAGE_MAP[code];
  }
  return originalMessage || ERROR_MESSAGE_MAP[ERROR_CODES.UNKNOWN_ERROR];
};

/**
 * エラーが回復可能かどうか判定
 */
const isRecoverableError = (status?: number): boolean => {
  if (!status) return false;

  // 4xx系のクライアントエラーは基本的に回復不可能
  // ただし、401(認証), 403(権限)は再ログインで回復可能
  if (status >= 400 && status < 500) {
    return status === 401 || status === 403;
  }

  // 5xx系のサーバーエラーは回復可能
  return status >= 500;
};

/**
 * エラーがリトライ可能かどうか判定
 */
const isRetryableError = (status?: number): boolean => {
  if (!status) return false;

  // リトライ可能なステータスコード
  const retryableStatuses = [
    408, // Request Timeout
    429, // Too Many Requests
    500, // Internal Server Error
    502, // Bad Gateway
    503, // Service Unavailable
    504, // Gateway Timeout
  ];

  return retryableStatuses.includes(status);
};

/**
 * エラーログの記録
 */
export const logError = (appError: AppError, context?: string): void => {
  const logData = {
    ...appError,
    context,
    url: window.location.href,
    userAgent: navigator.userAgent,
  };

  // 開発環境では詳細ログを出力
  if (process.env.NODE_ENV === 'development') {
    console.error('🚨 Application Error:', logData);

    // オリジナルエラーがある場合はスタックトレースも出力
    if (appError.originalError) {
      console.error('Original error stack:', appError.originalError.stack);
    }
  } else {
    // 本番環境では必要最小限のログ
    console.error('Application Error:', {
      type: appError.type,
      code: appError.code,
      message: appError.message,
      timestamp: appError.timestamp,
      context,
    });
  }

  // 本番環境では外部ログサービスに送信（例：Sentry, LogRocket）
  // if (process.env.NODE_ENV === 'production' && typeof window.Sentry !== 'undefined') {
  //   window.Sentry.captureException(appError.originalError || new Error(appError.message), {
  //     tags: {
  //       type: appError.type,
  //       code: appError.code,
  //     },
  //     extra: {
  //       details: appError.details,
  //       context,
  //     },
  //   });
  // }
};

/**
 * エラー表示用のヘルパー関数
 */
export const getErrorDisplay = (
  error: unknown
): { title: string; message: string; canRetry: boolean } => {
  const appError = convertToAppError(error);

  return {
    title: getErrorTitle(appError.type),
    message: appError.userFriendlyMessage,
    canRetry: appError.retryable,
  };
};

/**
 * エラータイプ別のタイトル取得
 */
const getErrorTitle = (type: AppError['type']): string => {
  const titles: Record<AppError['type'], string> = {
    api: 'APIエラー',
    network: '通信エラー',
    validation: '入力エラー',
    business: '操作エラー',
    unknown: 'エラー',
  };

  return titles[type];
};

/**
 * グローバルエラーハンドラー
 */
export const setupGlobalErrorHandler = (): void => {
  // 未処理のPromise拒否をキャッチ
  window.addEventListener('unhandledrejection', (event) => {
    const appError = convertToAppError(event.reason);
    logError(appError, 'unhandledrejection');

    // 開発環境以外ではデフォルトの動作を防ぐ
    if (process.env.NODE_ENV !== 'development') {
      event.preventDefault();
    }
  });

  // 未処理のエラーをキャッチ
  window.addEventListener('error', (event) => {
    const appError = convertToAppError(event.error);
    logError(appError, 'global error handler');
  });
};

/**
 * エラーリカバリーのヘルパー関数
 */
export const errorRecovery = {
  /**
   * 認証エラーからの復旧
   */
  handleAuthError: () => {
    // トークンクリア
    localStorage.removeItem('nanoconnect_auth_token');

    // ログイン画面にリダイレクト
    if (window.location.pathname !== '/login') {
      window.location.href =
        '/login?redirect=' + encodeURIComponent(window.location.pathname);
    }
  },

  /**
   * ネットワークエラーからの復旧
   */
  handleNetworkError: (retryFn?: () => void) => {
    // 一定時間後にリトライを提案
    if (retryFn) {
      setTimeout(() => {
        if (navigator.onLine) {
          retryFn();
        }
      }, 3000);
    }
  },

  /**
   * サーバーエラーからの復旧
   */
  handleServerError: () => {
    // サービス状況を確認するメッセージを表示
    console.warn(
      'サーバーエラーが発生しました。システム管理者に連絡してください。'
    );
  },
};
