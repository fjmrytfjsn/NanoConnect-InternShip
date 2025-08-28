/**
 * プレゼンテーション関連の型定義
 */

// プレゼンテーションカテゴリー
export type PresentationCategory = 
  | 'business'
  | 'education'
  | 'entertainment'
  | 'research'
  | 'other';

// プレゼンテーション設定
export interface PresentationSettings {
  // 匿名回答の有無
  allowAnonymousAnswers: boolean;
  
  // 重複回答制限設定
  preventDuplicateAnswers: boolean;
  
  // 結果公開設定
  showResultsToParticipants: boolean;
  
  // 参加人数制限
  maxParticipants?: number;
  
  // アクセスコード有効期限（分）
  accessCodeExpirationMinutes?: number;
  
  // IPアドレス制限
  ipRestriction?: string[];
  
  // 不適切投稿フィルター
  contentFilter: boolean;
}

// 拡張されたプレゼンテーション型
export interface PresentationFormData {
  // 基本情報
  title: string;
  description?: string;
  category: PresentationCategory;
  tags: string[];
  
  // 設定
  settings: PresentationSettings;
}

// プレゼンテーション作成リクエスト
export interface CreatePresentationRequest {
  title: string;
  description?: string;
  category: PresentationCategory;
  tags: string[];
  settings: PresentationSettings;
}

// プレゼンテーション更新リクエスト  
export interface UpdatePresentationRequest extends Partial<CreatePresentationRequest> {
  id: number;
}

// フォームバリデーションエラー
export interface ValidationError {
  field: string;
  message: string;
}

// フォームバリデーション結果
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// 自動保存関連
export interface AutoSaveData {
  formData: PresentationFormData;
  lastSaved: string;
  isDraft: boolean;
}

// プレビューデータ
export interface PresentationPreview {
  title: string;
  description?: string;
  category: PresentationCategory;
  tags: string[];
  estimatedDuration?: string;
  participantLimit?: number;
}