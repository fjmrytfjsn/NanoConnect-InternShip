/**
 * 共通型定義
 * フロントエンドとバックエンドで共有される基本的な型定義
 */

// 基本的なID型
export type UserId = string;
export type PresentationId = string;
export type SlideId = string;
export type ResponseId = string;
export type SessionId = string;
export type AccessCode = string;

// 基本的なタイムスタンプ型
export type Timestamp = string; // ISO 8601形式

// エラー型定義
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// レスポンス型の基本形
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: Timestamp;
}

// ページネーション型
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: Pagination;
}

// 基本的なCRUD操作の結果型
export interface CreateResult {
  id: string;
  created: boolean;
}

export interface UpdateResult {
  id: string;
  updated: boolean;
  affectedRows: number;
}

export interface DeleteResult {
  id: string;
  deleted: boolean;
  affectedRows: number;
}