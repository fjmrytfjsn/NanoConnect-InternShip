/**
 * プレゼンテーション一覧取得ユースケース
 * プレゼンターのプレゼンテーション一覧取得を担当
 */

import { IPresentationRepository } from '@/domain/repositories/IPresentationRepository';
import { PresentationListResponseDto } from '../../dtos/presentation/PresentationResponseDto';
import { UserId } from '@/types/common';

export class ListPresentationsUseCase {
  constructor(private readonly presentationRepository: IPresentationRepository) {}

  async execute(presenterId: UserId): Promise<PresentationListResponseDto> {
    const presentations = await this.presentationRepository.findByPresenterId(presenterId);

    const presentationDtos = presentations.map(presentation => ({
      id: presentation.id,
      title: presentation.title,
      description: presentation.description,
      presenterId: presentation.presenterId,
      accessCode: presentation.accessCode,
      isActive: presentation.isActive,
      currentSlideIndex: presentation.currentSlideIndex,
      createdAt: presentation.createdAt,
      updatedAt: presentation.updatedAt,
    }));

    return {
      presentations: presentationDtos,
      total: presentations.length,
    };
  }
}
