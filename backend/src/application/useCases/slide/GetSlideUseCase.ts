/**
 * スライド取得ユースケース
 * 特定のスライドまたはプレゼンテーション内の全スライドを取得
 */

import { ISlideRepository } from '@/domain/repositories/ISlideRepository';
import { IPresentationRepository } from '@/domain/repositories/IPresentationRepository';
import {
  GetSlideRequestDto,
  GetSlideResponseDto,
  GetSlidesRequestDto,
  GetSlidesResponseDto,
} from '@/application/dtos/slide/GetSlideDto';
import { SlideMapper } from '@/application/dtos/slide/SlideMapper';

export class GetSlideUseCase {
  constructor(
    private slideRepository: ISlideRepository,
    private presentationRepository: IPresentationRepository
  ) {}

  /**
   * 特定のスライドを取得
   */
  async getSlideById(request: GetSlideRequestDto): Promise<GetSlideResponseDto> {
    try {
      const slide = await this.slideRepository.findById(request.slideId);

      if (!slide) {
        return {
          success: false,
          message: '指定されたスライドが見つかりません',
          data: null as any,
        };
      }

      return {
        success: true,
        message: 'スライドを正常に取得しました',
        data: SlideMapper.toDto(slide),
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '予期しないエラーが発生しました',
        data: null as any,
      };
    }
  }

  /**
   * プレゼンテーション内の全スライドを取得（順序付き）
   */
  async getSlidesByPresentationId(request: GetSlidesRequestDto): Promise<GetSlidesResponseDto> {
    try {
      // 1. プレゼンテーションの存在確認
      const presentation = await this.presentationRepository.findById(request.presentationId);
      if (!presentation) {
        return {
          success: false,
          message: '指定されたプレゼンテーションが見つかりません',
          data: [],
        };
      }

      // 2. プレゼンテーション内のスライドを順序付きで取得
      const slides = await this.slideRepository.findByPresentationId(request.presentationId);

      // 順序でソート（念のため）
      slides.sort((a, b) => a.slideOrder - b.slideOrder);

      return {
        success: true,
        message: `スライド一覧を正常に取得しました（${slides.length}件）`,
        data: SlideMapper.toDtoArray(slides),
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '予期しないエラーが発生しました',
        data: [],
      };
    }
  }
}
