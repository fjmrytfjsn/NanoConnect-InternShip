/**
 * プレゼンテーション更新ユースケース
 * プレゼンテーション情報の更新を担当
 */

import { IPresentationRepository } from '@/domain/repositories/IPresentationRepository';
import {
  UpdatePresentationDto,
  UpdatePresentationResponseDto,
} from '../../dtos/presentation/UpdatePresentationDto';
import { PresentationId, UserId } from '@/types/common';

export class UpdatePresentationUseCase {
  constructor(private readonly presentationRepository: IPresentationRepository) {}

  async execute(
    presentationId: PresentationId,
    requesterId: UserId,
    updateData: UpdatePresentationDto
  ): Promise<UpdatePresentationResponseDto> {
    const presentation = await this.presentationRepository.findById(presentationId);

    if (!presentation) {
      throw new Error('プレゼンテーションが見つかりません');
    }

    // プレゼンターのみ更新可能
    if (presentation.presenterId !== requesterId) {
      throw new Error('このプレゼンテーションを更新する権限がありません');
    }

    // プレゼンテーション情報を更新
    presentation.updateInfo(updateData.title, updateData.description);

    // 保存
    await this.presentationRepository.save(presentation);

    return {
      success: true,
      message: 'プレゼンテーションが正常に更新されました',
    };
  }
}
