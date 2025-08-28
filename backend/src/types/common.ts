/**
 * バックエンド用型定義
 * 共通型定義からバックエンドで必要な型のみをインポート
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

// データベース設定型
export interface DatabaseConfig {
  path: string;
  options?: {
    verbose?: (_message?: any, ..._additionalArgs: any[]) => void;
    fileMustExist?: boolean;
    timeout?: number;
    readonly?: boolean;
  };
}
