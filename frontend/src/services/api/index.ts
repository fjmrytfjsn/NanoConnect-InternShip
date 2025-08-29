/**
 * API通信レイヤー統合
 * 全てのAPIクライアントと型定義のエクスポート
 */

// 基盤API
export * from './baseApi';

// 各種APIクライアント
export * from './presentationApi';
export * from './slideApi';

// 共通型定義の再エクスポート
export type {
  ApiResponse,
  ApiError,
  PaginatedResponse,
  Pagination,
  BaseEntity,
  CreateResult,
  UpdateResult,
  DeleteResult,
} from '../../../../shared/types/common';

// 型定義のインポート（使用のため）
import type {
  ApiResponse,
  ApiError,
  PaginatedResponse,
  Pagination,
} from '../../../../shared/types/common';

export type {
  // 認証関連
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  UserInfo,
  // プレゼンテーション関連
  CreatePresentationRequest,
  CreatePresentationResponse,
  UpdatePresentationRequest,
  UpdatePresentationResponse,
  DeletePresentationResponse,
  GetPresentationResponse,
  GetPresentationsResponse,
  PresentationInfo,
  JoinPresentationRequest,
  JoinPresentationResponse,
  // スライド関連
  CreateSlideRequest,
  CreateSlideResponse,
  UpdateSlideRequest,
  UpdateSlideResponse,
  DeleteSlideResponse,
  GetSlideResponse,
  GetSlidesResponse,
  SlideInfo,
  SlideContent,
  SlideSettings,
  SlideType,
  // 回答関連
  SubmitResponseRequest,
  SubmitResponseResponse,
  ResponseData,
  // 分析関連
  AnalyticsResponse,
  SlideAnalytics,
  AnalyticsData,
} from '../../../../shared/types/api';

// APIクライアントのデフォルトインスタンス
export { apiClient, api } from './baseApi';
export { presentationApi } from './presentationApi';
export { slideApi } from './slideApi';

/**
 * 全APIクライアントをまとめたオブジェクト
 */
import { apiClient } from './baseApi';
import { presentationApi } from './presentationApi';
import { slideApi } from './slideApi';

export const apiServices = {
  base: apiClient,
  presentations: presentationApi,
  slides: slideApi,
} as const;

/**
 * API通信のヘルパー関数
 */
export const apiHelpers = {
  /**
   * すべてのAPIクライアントの認証トークンを一括設定
   */
  setAuthTokenAll: (token: string) => {
    apiClient.setAuthToken(token);
  },

  /**
   * すべてのAPIクライアントの認証トークンを一括クリア
   */
  clearAuthTokenAll: () => {
    apiClient.clearAuthToken();
  },

  /**
   * 認証状態の確認
   */
  isAuthenticated: () => {
    return apiClient.isAuthenticated();
  },

  /**
   * エラーハンドリングのユーティリティ
   */
  handleApiError: (error: unknown) => {
    if (error instanceof Error) {
      return {
        message: error.message,
        isNetworkError: error.name === 'NetworkError',
        isApiError: error.name === 'ApiClientError',
      };
    }
    return {
      message: '不明なエラーが発生しました',
      isNetworkError: false,
      isApiError: false,
    };
  },
};

/**
 * 型ガード関数
 */
export const typeGuards = {
  /**
   * ApiResponseが成功レスポンスかどうか判定
   */
  isSuccessResponse: <T>(
    response: ApiResponse<T>
  ): response is ApiResponse<T> & { success: true; data: T } => {
    return response.success === true && response.data !== undefined;
  },

  /**
   * ApiResponseがエラーレスポンスかどうか判定
   */
  isErrorResponse: <T>(
    response: ApiResponse<T>
  ): response is ApiResponse<T> & {
    success: false;
    error: ApiError | string;
  } => {
    return response.success === false && response.error !== undefined;
  },

  /**
   * レスポンスがページネーション付きかどうか判定
   */
  isPaginatedResponse: <T>(response: any): response is PaginatedResponse<T> => {
    return response && typeof response === 'object' && 'pagination' in response;
  },
};

/**
 * APIレスポンスのデフォルト値
 */
export const defaultApiResponse = {
  success: false,
  message: '',
  timestamp: new Date().toISOString(),
} satisfies Partial<ApiResponse>;

export const defaultPagination = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
} satisfies Pagination;
