/**
 * プレゼンテーション削除ユースケース
 * プレゼンテーションの削除を担当
 */

import { IPresentationRepository } from '@/domain/repositories/IPresentationRepository';
import { DeletePresentationResponseDto } from '../../dtos/presentation/PresentationResponseDto';
import { PresentationId, UserId } from '@/types/common';

export class DeletePresentationUseCase {
  constructor(
    private readonly presentationRepository: IPresentationRepository
  ) {}

  async execute(
    presentationId: PresentationId, 
    requesterId: UserId
  ): Promise<DeletePresentationResponseDto> {
    const presentation = await this.presentationRepository.findById(presentationId);
    
    if (!presentation) {
      throw new Error('プレゼンテーションが見つかりません');
    }

    // プレゼンターのみ削除可能
    if (presentation.presenterId !== requesterId) {
      throw new Error('このプレゼンテーションを削除する権限がありません');
    }

    // アクティブなプレゼンテーションは削除不可
    if (presentation.isActive) {
      throw new Error('アクティブなプレゼンテーションは削除できません。まず停止してください');
    }

    // 削除実行
    const deleted = await this.presentationRepository.delete(presentationId);
    
    if (!deleted) {
      throw new Error('プレゼンテーションの削除に失敗しました');
    }

    return {
      success: true,
      message: 'プレゼンテーションが正常に削除されました'
    };
  }
}