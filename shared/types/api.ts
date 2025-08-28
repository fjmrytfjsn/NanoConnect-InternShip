/**
 * API型定義
 * REST APIのリクエスト・レスポンス型定義
 */

import { 
  UserId, 
  PresentationId, 
  SlideId, 
  AccessCode,
  Timestamp,
  ApiResponse,
  CreateResult,
  UpdateResult,
  DeleteResult
} from './common';

// ========== 認証API ==========

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: UserInfo;
  token: string;
  expiresIn: number;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  user: UserInfo;
  token: string;
}

export interface UserInfo {
  id: UserId;
  username: string;
  email: string;
  createdAt: Timestamp;
}

// ========== プレゼンテーションAPI ==========

export interface CreatePresentationRequest {
  title: string;
  description?: string;
}

export interface CreatePresentationResponse extends CreateResult {
  presentation: PresentationInfo;
  accessCode: AccessCode;
}

export interface UpdatePresentationRequest {
  title?: string;
  description?: string;
}

export interface PresentationInfo {
  id: PresentationId;
  title: string;
  description?: string;
  presenterId: UserId;
  accessCode: AccessCode;
  isActive: boolean;
  currentSlideIndex: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface GetPresentationResponse extends ApiResponse<PresentationInfo> {}
export interface GetPresentationsResponse extends ApiResponse<PresentationInfo[]> {}
export interface UpdatePresentationResponse extends UpdateResult {}
export interface DeletePresentationResponse extends DeleteResult {}

// ========== スライドAPI ==========

export interface CreateSlideRequest {
  presentationId: PresentationId;
  title: string;
  type: SlideType;
  content: SlideContent;
  order: number;
}

export interface UpdateSlideRequest {
  title?: string;
  content?: SlideContent;
  order?: number;
}

export interface SlideInfo {
  id: SlideId;
  presentationId: PresentationId;
  title: string;
  type: SlideType;
  content: SlideContent;
  order: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type SlideType = 'multiple_choice' | 'word_cloud';

export interface SlideContent {
  question: string;
  options?: string[]; // 多肢選択式の場合
  settings?: SlideSettings;
}

export interface SlideSettings {
  allowMultiple?: boolean; // 複数選択可能か
  showResults?: boolean;   // 結果を表示するか
  maxWords?: number;       // ワードクラウドの最大単語数
}

export interface CreateSlideResponse extends CreateResult {
  slide: SlideInfo;
}

export interface GetSlideResponse extends ApiResponse<SlideInfo> {}
export interface GetSlidesResponse extends ApiResponse<SlideInfo[]> {}
export interface UpdateSlideResponse extends UpdateResult {}
export interface DeleteSlideResponse extends DeleteResult {}

// ========== 参加者API ==========

export interface JoinPresentationRequest {
  accessCode: AccessCode;
  participantName?: string; // 匿名の場合はオプション
}

export interface JoinPresentationResponse {
  presentationId: PresentationId;
  presentation: PresentationInfo;
  currentSlide?: SlideInfo;
  sessionId: string;
}

export interface SubmitResponseRequest {
  slideId: SlideId;
  responseData: ResponseData;
}

export interface SubmitResponseResponse extends CreateResult {
  accepted: boolean;
  message?: string;
}

export type ResponseData = 
  | { type: 'multiple_choice'; selectedOptions: number[] }
  | { type: 'word_cloud'; words: string[] };

// ========== 分析API ==========

export interface AnalyticsResponse {
  presentationId: PresentationId;
  totalResponses: number;
  slideAnalytics: SlideAnalytics[];
}

export interface SlideAnalytics {
  slideId: SlideId;
  slideTitle: string;
  responseCount: number;
  data: AnalyticsData;
}

export type AnalyticsData = 
  | { type: 'multiple_choice'; optionCounts: { [option: string]: number } }
  | { type: 'word_cloud'; wordFrequencies: { [word: string]: number } };