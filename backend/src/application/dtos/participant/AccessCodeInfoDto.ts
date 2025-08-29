/**
 * アクセスコード情報取得用レスポンスDTO
 */

export interface AccessCodeInfoResponseDto {
  success: boolean;
  presentation: {
    id: string;
    title: string;
    description?: string;
    isActive: boolean;
    currentSlideIndex: number;
    totalSlides?: number;
    participantCount?: number;
  };
  accessCode: string;
  message?: string;
}