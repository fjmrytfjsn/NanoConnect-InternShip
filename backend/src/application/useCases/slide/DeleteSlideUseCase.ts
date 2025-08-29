/**
 * スライド削除ユースケース
 * スライド削除時の整合性チェックと順序再調整
 */

import { ISlideRepository } from '@/domain/repositories/ISlideRepository';
import { IPresentationRepository } from '@/domain/repositories/IPresentationRepository';
import {
  DeleteSlideRequestDto,
  DeleteSlideResponseDto,
} from '@/application/dtos/slide/DeleteSlideDto';

export class DeleteSlideUseCase {
  constructor(
    private slideRepository: ISlideRepository,
    private presentationRepository: IPresentationRepository
  ) {}

  async execute(request: DeleteSlideRequestDto): Promise<DeleteSlideResponseDto> {
    try {
      // 1. スライドの存在確認
      const slide = await this.slideRepository.findById(request.slideId);
      if (!slide) {
        return {
          success: false,
          message: '指定されたスライドが見つかりません',
        };
      }

      // 2. プレゼンテーションの存在確認
      const presentation = await this.presentationRepository.findById(slide.presentationId);
      if (!presentation) {
        return {
          success: false,
          message: '関連するプレゼンテーションが見つかりません',
        };
      }

      // 3. 削除前の整合性チェック
      const slideCount = await this.slideRepository.countByPresentationId(slide.presentationId);
      if (slideCount <= 1) {
        return {
          success: false,
          message: 'プレゼンテーションには最低1つのスライドが必要です',
        };
      }

      // 4. スライドを削除
      const deleted = await this.slideRepository.delete(request.slideId);
      if (!deleted) {
        return {
          success: false,
          message: 'スライドの削除に失敗しました',
        };
      }

      // 5. 削除後の順序調整
      await this.reorderSlidesAfterDeletion(slide.presentationId, slide.slideOrder);

      return {
        success: true,
        message: 'スライドが正常に削除されました',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '予期しないエラーが発生しました',
      };
    }
  }

  /**
   * スライド削除後の順序再調整
   * 削除されたスライドより後の順序のスライドを前に詰める
   */
  private async reorderSlidesAfterDeletion(
    presentationId: string,
    deletedOrder: number
  ): Promise<void> {
    try {
      // 削除されたスライドより後の順序のスライドを取得
      const allSlides = await this.slideRepository.findByPresentationId(presentationId);
      const slidesToReorder = allSlides.filter(s => s.slideOrder > deletedOrder);

      if (slidesToReorder.length === 0) {
        return; // 調整不要
      }

      // 順序を1つずつ前に詰める
      const reorderData = slidesToReorder.map(slide => ({
        slideId: slide.id,
        order: slide.slideOrder - 1,
      }));

      await this.slideRepository.updateSlidesOrder(reorderData);
    } catch (error) {
      // 順序調整でエラーが発生しても削除処理自体は成功とする
      console.error('スライド順序調整でエラーが発生しました:', error);
    }
  }
}
