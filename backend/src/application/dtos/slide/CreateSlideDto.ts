/**
 * スライド作成のためのDTO
 * shared/types/api.ts の CreateSlideRequest に基づいて定義
 */

import { PresentationId, SlideId } from '@/types/common';

export interface CreateSlideRequestDto {
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
}

export interface CreateSlideResponseDto {
  success: boolean;
  message: string;
  slide: {
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
  };
}