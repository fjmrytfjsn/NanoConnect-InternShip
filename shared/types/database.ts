/**
 * データベース型定義
 * SQLiteデータベースのテーブル定義と型
 */

import { UserId, PresentationId, SlideId, ResponseId, SessionId, AccessCode, Timestamp } from './common';

// ========== テーブル型定義 ==========

// Usersテーブル
export interface UserRecord {
  id: UserId;
  username: string;
  email: string;
  password_hash: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// Presentationsテーブル
export interface PresentationRecord {
  id: PresentationId;
  title: string;
  description?: string;
  presenter_id: UserId;
  access_code: AccessCode;
  is_active: boolean;
  current_slide_index: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// Slidesテーブル
export interface SlideRecord {
  id: SlideId;
  presentation_id: PresentationId;
  title: string;
  type: SlideType;
  content: string; // JSON文字列
  slide_order: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export type SlideType = 'multiple_choice' | 'word_cloud';

// Responsesテーブル
export interface ResponseRecord {
  id: ResponseId;
  slide_id: SlideId;
  session_id: SessionId;
  response_data: string; // JSON文字列
  ip_address?: string;
  user_agent?: string;
  created_at: Timestamp;
}

// Sessionsテーブル（参加者セッション管理）
export interface SessionRecord {
  id: SessionId;
  presentation_id: PresentationId;
  participant_name?: string;
  ip_address?: string;
  user_agent?: string;
  joined_at: Timestamp;
  last_activity: Timestamp;
  is_active: boolean;
}

// ========== 集計・分析用のビュー型 ==========

// スライドごとの回答数
export interface SlideResponseCount {
  slide_id: SlideId;
  slide_title: string;
  slide_type: SlideType;
  response_count: number;
}

// プレゼンテーションの統計情報
export interface PresentationStats {
  presentation_id: PresentationId;
  presentation_title: string;
  total_slides: number;
  total_responses: number;
  total_participants: number;
  active_participants: number;
  created_at: Timestamp;
}

// 多肢選択式の集計結果
export interface MultipleChoiceAnalytics {
  slide_id: SlideId;
  option_index: number;
  option_text: string;
  vote_count: number;
  percentage: number;
}

// ワードクラウドの集計結果
export interface WordCloudAnalytics {
  slide_id: SlideId;
  word: string;
  frequency: number;
  normalized_frequency: number;
}

// ========== SQLクエリ結果型 ==========

// JOINクエリの結果型
export interface PresentationWithPresenter extends PresentationRecord {
  presenter_username: string;
  presenter_email: string;
}

export interface SlideWithPresentation extends SlideRecord {
  presentation_title: string;
  presenter_id: UserId;
  access_code: AccessCode;
}

export interface ResponseWithDetails extends ResponseRecord {
  slide_title: string;
  slide_type: SlideType;
  presentation_id: PresentationId;
  presentation_title: string;
}

// ========== データベース操作型 ==========

// INSERT用の型（IDや自動生成フィールドを除く）
export type CreateUserData = Omit<UserRecord, 'id' | 'created_at' | 'updated_at'>;
export type CreatePresentationData = Omit<PresentationRecord, 'id' | 'created_at' | 'updated_at'>;
export type CreateSlideData = Omit<SlideRecord, 'id' | 'created_at' | 'updated_at'>;
export type CreateResponseData = Omit<ResponseRecord, 'id' | 'created_at'>;
export type CreateSessionData = Omit<SessionRecord, 'id' | 'joined_at' | 'last_activity'>;

// UPDATE用の型（IDや作成日時を除く）
export type UpdateUserData = Partial<Omit<UserRecord, 'id' | 'created_at' | 'updated_at'>> & {
  updated_at: Timestamp;
};
export type UpdatePresentationData = Partial<Omit<PresentationRecord, 'id' | 'created_at' | 'updated_at'>> & {
  updated_at: Timestamp;
};
export type UpdateSlideData = Partial<Omit<SlideRecord, 'id' | 'created_at' | 'updated_at'>> & {
  updated_at: Timestamp;
};
export type UpdateSessionData = Partial<Omit<SessionRecord, 'id' | 'joined_at'>> & {
  last_activity: Timestamp;
};

// ========== データベース設定型 ==========

export interface DatabaseConfig {
  path: string;
  options?: {
    verbose?: (message?: any, ...additionalArgs: any[]) => void;
    fileMustExist?: boolean;
    timeout?: number;
    readonly?: boolean;
  };
}

export interface ConnectionPool {
  maxConnections: number;
  idleTimeout: number;
  connectionTimeout: number;
}