/**
 * スライド更新のためのDTO
 * shared/types/api.ts の UpdateSlideRequest に基づいて定義
 */

import { SlideId } from '@/types/common';

export interface UpdateSlideRequestDto {
  slideId: SlideId;
  title?: string;
  content?: {
    question: string;
    options?: string[];
    settings?: {
      allowMultiple?: boolean;
      showResults?: boolean;
      maxWords?: number;
    };
  };
  order?: number;
}

export interface UpdateSlideResponseDto {
  success: boolean;
  message: string;
}