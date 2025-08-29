/**
 * スライド順序変更のためのDTO
 * プレゼンテーション内でのスライド順序変更API用
 */

import { SlideId, PresentationId } from '@/types/common';

export interface ReorderSlidesRequestDto {
  presentationId: PresentationId;
  slideOrders: Array<{
    slideId: SlideId;
    order: number;
  }>;
}

export interface ReorderSlidesResponseDto {
  success: boolean;
  message: string;
}
