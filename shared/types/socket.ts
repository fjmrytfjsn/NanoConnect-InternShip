/**
 * WebSocket型定義
 * Socket.IOイベントの型定義
 */

import { 
  PresentationId, 
  SlideId, 
  SessionId, 
  AccessCode,
  Timestamp 
} from './common';
import { SlideInfo, ResponseData, AnalyticsData } from './api';

// ========== Socket.IOイベント ==========

export interface ServerToClientEvents {
  // プレゼンテーション関連
  'presentation:updated': (data: PresentationUpdateEvent) => void;
  'presentation:started': (data: PresentationStartEvent) => void;
  'presentation:stopped': (data: PresentationStopEvent) => void;
  
  // スライド関連
  'slide:changed': (data: SlideChangeEvent) => void;
  'slide:updated': (data: SlideUpdateEvent) => void;
  
  // 回答関連
  'response:received': (data: ResponseReceivedEvent) => void;
  'analytics:updated': (data: AnalyticsUpdateEvent) => void;
  
  // 参加者関連
  'participant:joined': (data: ParticipantJoinedEvent) => void;
  'participant:left': (data: ParticipantLeftEvent) => void;
  
  // エラー・通知
  'error': (data: SocketErrorEvent) => void;
  'notification': (data: NotificationEvent) => void;
}

export interface ClientToServerEvents {
  // 参加者のアクション
  'join:presentation': (data: JoinPresentationEvent, callback: (response: JoinResponse) => void) => void;
  'submit:response': (data: SubmitResponseEvent, callback: (response: SubmitResponse) => void) => void;
  'leave:presentation': (data: LeavePresentationEvent) => void;
  
  // プレゼンターのアクション
  'control:start': (data: StartPresentationEvent) => void;
  'control:stop': (data: StopPresentationEvent) => void;
  'control:next-slide': (data: NextSlideEvent) => void;
  'control:prev-slide': (data: PrevSlideEvent) => void;
  'control:goto-slide': (data: GotoSlideEvent) => void;
}

// ========== イベントデータ型 ==========

// プレゼンテーション関連イベント
export interface PresentationUpdateEvent {
  presentationId: PresentationId;
  title: string;
  description?: string;
  timestamp: Timestamp;
}

export interface PresentationStartEvent {
  presentationId: PresentationId;
  currentSlideIndex: number;
  currentSlide: SlideInfo;
  timestamp: Timestamp;
}

export interface PresentationStopEvent {
  presentationId: PresentationId;
  timestamp: Timestamp;
}

// スライド関連イベント
export interface SlideChangeEvent {
  presentationId: PresentationId;
  slideId: SlideId;
  slideIndex: number;
  slide: SlideInfo;
  timestamp: Timestamp;
}

export interface SlideUpdateEvent {
  presentationId: PresentationId;
  slideId: SlideId;
  slide: SlideInfo;
  timestamp: Timestamp;
}

// 回答関連イベント
export interface ResponseReceivedEvent {
  presentationId: PresentationId;
  slideId: SlideId;
  responseId: string;
  responseData: ResponseData;
  timestamp: Timestamp;
}

export interface AnalyticsUpdateEvent {
  presentationId: PresentationId;
  slideId: SlideId;
  analytics: AnalyticsData;
  totalResponses: number;
  timestamp: Timestamp;
}

// 参加者関連イベント
export interface ParticipantJoinedEvent {
  presentationId: PresentationId;
  sessionId: SessionId;
  participantCount: number;
  timestamp: Timestamp;
}

export interface ParticipantLeftEvent {
  presentationId: PresentationId;
  sessionId: SessionId;
  participantCount: number;
  timestamp: Timestamp;
}

// クライアントからのイベント
export interface JoinPresentationEvent {
  accessCode: AccessCode;
  participantName?: string;
}

export interface SubmitResponseEvent {
  presentationId: PresentationId;
  slideId: SlideId;
  responseData: ResponseData;
  sessionId: SessionId;
}

export interface LeavePresentationEvent {
  presentationId: PresentationId;
  sessionId: SessionId;
}

export interface StartPresentationEvent {
  presentationId: PresentationId;
}

export interface StopPresentationEvent {
  presentationId: PresentationId;
}

export interface NextSlideEvent {
  presentationId: PresentationId;
}

export interface PrevSlideEvent {
  presentationId: PresentationId;
}

export interface GotoSlideEvent {
  presentationId: PresentationId;
  slideIndex: number;
}

// レスポンス型
export interface JoinResponse {
  success: boolean;
  presentationId?: PresentationId;
  sessionId?: SessionId;
  currentSlide?: SlideInfo;
  error?: string;
}

export interface SubmitResponse {
  success: boolean;
  accepted?: boolean;
  message?: string;
  error?: string;
}

// エラー・通知イベント
export interface SocketErrorEvent {
  code: string;
  message: string;
  details?: any;
  timestamp: Timestamp;
}

export interface NotificationEvent {
  id?: string; // オプションでIDを追加
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Timestamp;
  read?: boolean; // 既読状態を追加
}