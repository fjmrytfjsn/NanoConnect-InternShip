/**
 * プレゼンテーション更新用DTO
 */

export interface UpdatePresentationDto {
  title?: string;
  description?: string;
}

export interface UpdatePresentationResponseDto {
  success: boolean;
  message: string;
}