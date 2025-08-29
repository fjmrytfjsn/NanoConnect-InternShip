/**
 * スライド取得のためのDTO
 * shared/types/api.ts の GetSlideResponse, GetSlidesResponse に基づいて定義
 */

import { SlideId, PresentationId } from '@/types/common';

export interface GetSlideRequestDto {
  slideId: SlideId;
}

export interface GetSlidesRequestDto {
  presentationId: PresentationId;
}

export interface SlideInfoDto {
  id: SlideId;
  presentationId: PresentationId;
  title: string;
  type: 'multiple_choice' | 'word_cloud';
  content: {
    question: string;
    options?: string[];
    settings?: {
      allowMultiple?: boolean;
      showResults?: boolean;
      maxWords?: number;
    };
  };
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface GetSlideResponseDto {
  success: boolean;
  message: string;
  data: SlideInfoDto;
}

export interface GetSlidesResponseDto {
  success: boolean;
  message: string;
  data: SlideInfoDto[];
}