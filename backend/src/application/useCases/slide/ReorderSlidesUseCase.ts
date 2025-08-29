/**
 * スライド順序変更ユースケース
 * プレゼンテーション内でのスライド順序の一括変更
 */

import { ISlideRepository } from '@/domain/repositories/ISlideRepository';
import { IPresentationRepository } from '@/domain/repositories/IPresentationRepository';
import { ReorderSlidesRequestDto, ReorderSlidesResponseDto } from '@/application/dtos/slide/ReorderSlidesDto';

export class ReorderSlidesUseCase {
  constructor(
    private slideRepository: ISlideRepository,
    private presentationRepository: IPresentationRepository
  ) {}

  async execute(request: ReorderSlidesRequestDto): Promise<ReorderSlidesResponseDto> {
    try {
      // 1. プレゼンテーションの存在確認
      const presentation = await this.presentationRepository.findById(request.presentationId);
      if (!presentation) {
        return {
          success: false,
          message: '指定されたプレゼンテーションが見つかりません'
        };
      }

      // 2. プレゼンテーション内の現在のスライドを取得
      const currentSlides = await this.slideRepository.findByPresentationId(request.presentationId);
      
      // 3. リクエストの検証
      const validationResult = await this.validateReorderRequest(currentSlides, request.slideOrders);
      if (!validationResult.valid) {
        return {
          success: false,
          message: validationResult.message
        };
      }

      // 4. スライド順序の一括更新
      await this.slideRepository.updateSlidesOrder(request.slideOrders);

      return {
        success: true,
        message: `${request.slideOrders.length}個のスライドの順序が正常に更新されました`
      };

    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '予期しないエラーが発生しました'
      };
    }
  }

  /**
   * 順序変更リクエストのバリデーション
   */
  private async validateReorderRequest(
    currentSlides: any[], 
    slideOrders: Array<{ slideId: string; order: number }>
  ): Promise<{ valid: boolean; message: string }> {
    
    // 1. 重複するスライドIDのチェック
    const slideIds = slideOrders.map(so => so.slideId);
    const uniqueSlideIds = new Set(slideIds);
    if (slideIds.length !== uniqueSlideIds.size) {
      return {
        valid: false,
        message: '重複するスライドIDが含まれています'
      };
    }

    // 2. すべてのスライドIDがプレゼンテーション内に存在するかチェック
    const currentSlideIds = new Set(currentSlides.map(s => s.id));
    for (const { slideId } of slideOrders) {
      if (!currentSlideIds.has(slideId)) {
        return {
          valid: false,
          message: `スライドID ${slideId} はこのプレゼンテーション内に存在しません`
        };
      }
    }

    // 3. 順序が負の値でないかチェック
    for (const { order } of slideOrders) {
      if (order < 0) {
        return {
          valid: false,
          message: 'スライド順序は0以上である必要があります'
        };
      }
    }

    // 4. 順序が重複していないかチェック
    const orders = slideOrders.map(so => so.order);
    const uniqueOrders = new Set(orders);
    if (orders.length !== uniqueOrders.size) {
      return {
        valid: false,
        message: '重複する順序が含まれています'
      };
    }

    // 5. 順序が連続しているかチェック（0から始まる連番）
    const sortedOrders = orders.sort((a, b) => a - b);
    for (let i = 0; i < sortedOrders.length; i++) {
      if (sortedOrders[i] !== i) {
        return {
          valid: false,
          message: 'スライド順序は0から始まる連続した番号である必要があります'
        };
      }
    }

    return { valid: true, message: '' };
  }
}