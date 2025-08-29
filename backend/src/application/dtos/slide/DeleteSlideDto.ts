/**
 * スライド削除のためのDTO
 * shared/types/api.ts の DeleteSlideResponse に基づいて定義
 */

import { SlideId } from '@/types/common';

export interface DeleteSlideRequestDto {
  slideId: SlideId;
}

export interface DeleteSlideResponseDto {
  success: boolean;
  message: string;
}
