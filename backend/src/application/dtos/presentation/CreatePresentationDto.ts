/**
 * プレゼンテーション作成用DTO
 */

import { UserId } from '@/types/common';

export interface CreatePresentationDto {
  title: string;
  description?: string;
  presenterId: UserId;
}

export interface CreatePresentationResponseDto {
  id: string;
  title: string;
  description?: string;
  presenterId: UserId;
  accessCode: string;
  isActive: boolean;
  currentSlideIndex: number;
  createdAt: string;
  updatedAt: string;
}