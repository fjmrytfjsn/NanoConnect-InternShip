// 共通型定義（フロントエンド・バックエンド共通）

// API レスポンス型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
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

// 将来的に追加予定の型定義のプレースホルダー
export interface User extends BaseEntity {
  username: string;
  email: string;
}

export interface Presentation extends BaseEntity {
  title: string;
  description: string;
  accessCode: string;
  isActive: boolean;
  creatorId: number;
}

export interface Slide extends BaseEntity {
  presentationId: number;
  title: string;
  type: 'multiple_choice' | 'word_cloud' | 'open_text';
  content: any;
  order: number;
}

export interface Response extends BaseEntity {
  slideId: number;
  participantName: string;
  answer: string | string[];
  sessionId: string;
}