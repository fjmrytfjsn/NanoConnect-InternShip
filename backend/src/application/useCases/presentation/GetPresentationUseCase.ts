/**
 * プレゼンテーション取得ユースケース
 * 特定のプレゼンテーション情報の取得を担当
 */

import { IPresentationRepository } from '@/domain/repositories/IPresentationRepository';
import { PresentationResponseDto } from '../../dtos/presentation/PresentationResponseDto';
import { PresentationId, UserId } from '@/types/common';

export class GetPresentationUseCase {
  constructor(private readonly presentationRepository: IPresentationRepository) {}

  async execute(
    presentationId: PresentationId,
    requesterId: UserId
  ): Promise<PresentationResponseDto> {
    const presentation = await this.presentationRepository.findById(presentationId);

    if (!presentation) {
      throw new Error('プレゼンテーションが見つかりません');
    }

    // プレゼンターのみアクセス可能
    if (presentation.presenterId !== requesterId) {
      throw new Error('このプレゼンテーションにアクセスする権限がありません');
    }

    return {
      id: presentation.id,
      title: presentation.title,
      description: presentation.description,
      presenterId: presentation.presenterId,
      accessCode: presentation.accessCode,
      isActive: presentation.isActive,
      currentSlideIndex: presentation.currentSlideIndex,
      createdAt: presentation.createdAt,
      updatedAt: presentation.updatedAt,
    };
  }
}
