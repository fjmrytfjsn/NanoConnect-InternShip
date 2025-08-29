// 共通型定義
export interface BaseEntity {
  id: number;
  createdAt: string;
  updatedAt: string;
}

// ユーザー関連の型
export interface User extends BaseEntity {
  username: string;
  email: string;
}

// プレゼンテーション関連の型
export interface Presentation extends BaseEntity {
  title: string;
  description: string;
  accessCode: string;
  isActive: boolean;
  creatorId: number;
  slideCount?: number;
  currentSlideIndex?: number;
  status: PresentationStatus;
}

export type PresentationStatus = 'draft' | 'active' | 'ended';

export type ViewMode = 'grid' | 'list';

export type SortOption = 'createdAt' | 'updatedAt' | 'title' | 'status';

export type SortOrder = 'asc' | 'desc';

// プレゼンテーション状態管理の型
export interface PresentationState {
  presentations: Presentation[];
  isLoading: boolean;
  error: string | null;
  viewMode: ViewMode;
  searchQuery: string;
  sortBy: SortOption;
  sortOrder: SortOrder;
  statusFilter: PresentationStatus | 'all';
}

// スライド関連の型
export interface Slide extends BaseEntity {
  presentationId: number;
  title: string;
  type: SlideType;
  content: SlideContent;
  order: number;
}

export type SlideType = 'multiple_choice' | 'word_cloud' | 'open_text';

export interface SlideContent {
  question: string;
  options?: string[]; // multiple_choice の場合
  maxWords?: number; // word_cloud の場合
}

// 回答関連の型
export interface Response extends BaseEntity {
  slideId: number;
  participantName: string;
  answer: string | string[];
  sessionId: string;
}

// API レスポンス型
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 認証関連の型
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  username: string;
  confirmPassword: string;
}
