/**
 * 共通型定義（フロントエンド・バックエンド共通）
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

// スライドタイプ型
export type SlideTypeValue = 'multiple_choice' | 'word_cloud' | 'open_text';

// エラー型定義
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// API レスポンス型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError | string;
  message?: string;
  timestamp?: Timestamp;
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

// WebSocket メッセージ型
export interface SocketMessage {
  type: string;
  payload: any;
  timestamp: string;
}

// データベース共通型
export interface BaseEntity {
  id: number;
  createdAt: string;
  updatedAt: string;
}

// ユーザー型
export interface User extends BaseEntity {
  username: string;
  email: string;
}

// プレゼンテーション型
export interface Presentation extends BaseEntity {
  title: string;
  description: string;
  accessCode: string;
  isActive: boolean;
  creatorId: number;
  currentSlideIndex: number;
}

// スライド型
export interface Slide extends BaseEntity {
  presentationId: number;
  title: string;
  type: SlideTypeValue;
  question: string;
  options?: string[];
  order: number;
}

// 回答型
export interface Response extends BaseEntity {
  slideId: number;
  participantName: string;
  answer: string | string[];
  sessionId: string;
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
