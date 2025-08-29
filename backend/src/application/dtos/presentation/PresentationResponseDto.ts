/**
 * プレゼンテーション レスポンスDTO
 */

import { UserId, PresentationId, AccessCode, Timestamp } from '@/types/common';

export interface PresentationResponseDto {
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

export interface PresentationListResponseDto {
  presentations: PresentationResponseDto[];
  total: number;
}

export interface DeletePresentationResponseDto {
  success: boolean;
  message: string;
}