/**
 * プレゼンテーション参加用リクエストDTO
 */

import { AccessCode } from '@/types/common';

export interface JoinPresentationRequestDto {
  accessCode: AccessCode;
  clientIpAddress?: string;
  userAgent?: string;
}

export interface JoinPresentationResponseDto {
  success: boolean;
  sessionId: string;
  presentation: {
    id: string;
    title: string;
    description?: string;
    isActive: boolean;
    currentSlideIndex: number;
  };
  message?: string;
}