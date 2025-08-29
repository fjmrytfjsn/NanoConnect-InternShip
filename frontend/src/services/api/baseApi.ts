/**
 * 共通API基盤
 * HTTP通信、エラーハンドリング、インターセプターの実装
 */

import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from 'axios';
import { ApiResponse, ApiError } from '../../../../shared/types/common';
import { API_BASE_URL } from '../../constants/api';

// 認証トークンを保持するストレージキー
const AUTH_TOKEN_KEY = 'nanoconnect_auth_token';

// HTTP状態コード定数
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// カスタムエラークラス
export class ApiClientError extends Error {
  public status: number;
  public code: string;
  public details?: Record<string, any>;

  constructor(
    message: string,
    status: number,
    code: string = 'UNKNOWN_ERROR',
    details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// ネットワークエラークラス
export class NetworkError extends Error {
  constructor(message: string = 'ネットワークエラーが発生しました') {
    super(message);
    this.name = 'NetworkError';
  }
}

// APIクライアント設定インターface
export interface ApiClientConfig {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
  retryCount?: number;
  retryDelay?: number;
}

// APIクライアントクラス
export class ApiClient {
  private axiosInstance: AxiosInstance;
  private config: ApiClientConfig;

  constructor(config: ApiClientConfig = {}) {
    this.config = {
      baseURL: API_BASE_URL,
      timeout: 10000, // 10秒
      retryCount: 3,
      retryDelay: 1000, // 1秒
      ...config,
    };

    this.axiosInstance = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers,
      },
    });

    this.setupInterceptors();
  }

  /**
   * インターセプターのセットアップ
   */
  private setupInterceptors(): void {
    // リクエストインターセプター
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // 認証トークンの自動付与
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // リクエストログ（開発時のみ）
        if (process.env.NODE_ENV === 'development') {
          console.log(
            `🔄 API Request: ${config.method?.toUpperCase()} ${config.url}`,
            {
              data: config.data,
              params: config.params,
            }
          );
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // レスポンスインターセプター
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        // レスポンスログ（開発時のみ）
        if (process.env.NODE_ENV === 'development') {
          console.log(
            `✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`,
            {
              status: response.status,
              data: response.data,
            }
          );
        }

        return response;
      },
      (error: AxiosError) => {
        return this.handleResponseError(error);
      }
    );
  }

  /**
   * レスポンスエラーのハンドリング
   */
  private async handleResponseError(error: AxiosError): Promise<never> {
    // ネットワークエラーの場合
    if (!error.response) {
      throw new NetworkError('サーバーとの通信ができませんでした');
    }

    const { response } = error;
    const status = response.status;
    const data = response.data as any;

    // エラーログ（開発時のみ）
    if (process.env.NODE_ENV === 'development') {
      console.error(
        `❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`,
        {
          status,
          data,
        }
      );
    }

    // 認証エラーの場合、トークンをクリア
    if (status === HTTP_STATUS.UNAUTHORIZED) {
      this.clearAuthToken();
      // ログイン画面にリダイレクト（必要に応じて）
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    // APIエラーレスポンスの場合
    if (data && data.error) {
      const apiError = data.error as ApiError;
      throw new ApiClientError(
        apiError.message || 'APIエラーが発生しました',
        status,
        apiError.code,
        apiError.details
      );
    }

    // その他のHTTPエラー
    const errorMessages: Record<number, string> = {
      [HTTP_STATUS.BAD_REQUEST]: 'リクエストが正しくありません',
      [HTTP_STATUS.UNAUTHORIZED]: '認証が必要です',
      [HTTP_STATUS.FORBIDDEN]: 'アクセス権限がありません',
      [HTTP_STATUS.NOT_FOUND]: 'リソースが見つかりません',
      [HTTP_STATUS.CONFLICT]: 'リソースが競合しています',
      [HTTP_STATUS.INTERNAL_SERVER_ERROR]: 'サーバーエラーが発生しました',
      [HTTP_STATUS.SERVICE_UNAVAILABLE]: 'サービスが利用できません',
    };

    const errorMessage = errorMessages[status] || `HTTPエラー (${status})`;
    throw new ApiClientError(errorMessage, status);
  }

  /**
   * 認証トークンの取得
   */
  private getAuthToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }

  /**
   * 認証トークンの設定
   */
  public setAuthToken(token: string): void {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  }

  /**
   * 認証トークンのクリア
   */
  public clearAuthToken(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }

  /**
   * 認証状態の確認
   */
  public isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }

  /**
   * GETリクエスト
   */
  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.get<T>(url, config);
    return response.data;
  }

  /**
   * POSTリクエスト
   */
  public async post<T, D = any>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.axiosInstance.post<T>(url, data, config);
    return response.data;
  }

  /**
   * PUTリクエスト
   */
  public async put<T, D = any>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.axiosInstance.put<T>(url, data, config);
    return response.data;
  }

  /**
   * PATCHリクエスト
   */
  public async patch<T, D = any>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.axiosInstance.patch<T>(url, data, config);
    return response.data;
  }

  /**
   * DELETEリクエスト
   */
  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.delete<T>(url, config);
    return response.data;
  }

  /**
   * ファイルアップロード
   */
  public async uploadFile<T>(
    url: string,
    file: File,
    onUploadProgress?: (progressEvent: any) => void
  ): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    };

    return this.post<T>(url, formData, config);
  }

  /**
   * レスポンス型安全性のためのヘルパー
   */
  public async safeGet<T>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const data = await this.get<ApiResponse<T>>(url, config);
      return data;
    } catch (error) {
      if (error instanceof ApiClientError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
          },
        };
      }
      throw error;
    }
  }

  /**
   * リトライ機能付きリクエスト
   */
  public async withRetry<T>(
    requestFn: () => Promise<T>,
    retryCount: number = this.config.retryCount || 3,
    delay: number = this.config.retryDelay || 1000
  ): Promise<T> {
    let lastError: Error;

    for (let i = 0; i < retryCount; i++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error as Error;

        // 最後の試行の場合はエラーを投げる
        if (i === retryCount - 1) {
          throw error;
        }

        // 4xx エラーの場合はリトライしない
        if (
          error instanceof ApiClientError &&
          error.status >= 400 &&
          error.status < 500
        ) {
          throw error;
        }

        // 指定された時間待機
        await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
      }
    }

    throw lastError!;
  }
}

// デフォルトAPIクライアントインスタンス
export const apiClient = new ApiClient();

// エクスポート用のヘルパー関数
export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    apiClient.get<T>(url, config),
  post: <T, D = any>(url: string, data?: D, config?: AxiosRequestConfig) =>
    apiClient.post<T, D>(url, data, config),
  put: <T, D = any>(url: string, data?: D, config?: AxiosRequestConfig) =>
    apiClient.put<T, D>(url, data, config),
  patch: <T, D = any>(url: string, data?: D, config?: AxiosRequestConfig) =>
    apiClient.patch<T, D>(url, data, config),
  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    apiClient.delete<T>(url, config),
  setAuthToken: (token: string) => apiClient.setAuthToken(token),
  clearAuthToken: () => apiClient.clearAuthToken(),
  isAuthenticated: () => apiClient.isAuthenticated(),
};
