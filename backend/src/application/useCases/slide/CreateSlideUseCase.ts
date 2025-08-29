/**
 * スライド作成ユースケース
 * 新しいスライドを作成し、適切なバリデーションと順序管理を実行
 */

import { Slide } from '@/domain/entities/Slide';
import { SlideType } from '@/domain/valueObjects/SlideType';
import { ISlideRepository } from '@/domain/repositories/ISlideRepository';
import { IPresentationRepository } from '@/domain/repositories/IPresentationRepository';
import { CreateSlideRequestDto, CreateSlideResponseDto } from '@/application/dtos/slide/CreateSlideDto';
import { SlideMapper } from '@/application/dtos/slide/SlideMapper';
import { SlideId } from '@/types/common';

export class CreateSlideUseCase {
  constructor(
    private slideRepository: ISlideRepository,
    private presentationRepository: IPresentationRepository
  ) {}

  async execute(request: CreateSlideRequestDto): Promise<CreateSlideResponseDto> {
    try {
      // 1. プレゼンテーションの存在確認
      const presentation = await this.presentationRepository.findById(request.presentationId);
      if (!presentation) {
        return {
          success: false,
          message: '指定されたプレゼンテーションが見つかりません',
          slide: null as any
        };
      }

      // 2. スライドタイプのバリデーション
      const slideType = SlideType.fromString(request.type);

      // 3. スライドタイプ別のコンテンツバリデーション
      const validationResult = this.validateSlideContent(slideType, request.content);
      if (!validationResult.valid) {
        return {
          success: false,
          message: validationResult.message,
          slide: null as any
        };
      }

      // 4. 順序の調整（最後尾に追加、または指定順序で挿入）
      let order = request.order;
      if (order < 0) {
        // 順序が指定されていない場合、最後尾に追加
        const maxOrder = await this.slideRepository.getMaxOrderByPresentationId(request.presentationId);
        order = maxOrder + 1;
      }

      // 5. 新しいスライドを作成
      const slideId: SlideId = `slide_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const slide = Slide.create(
        slideId,
        request.presentationId,
        slideType,
        request.title,
        request.content.question,
        order,
        request.content.options
      );

      // 6. スライドを保存
      await this.slideRepository.save(slide);

      // 7. 成功レスポンス
      return {
        success: true,
        message: 'スライドが正常に作成されました',
        slide: SlideMapper.toDto(slide)
      };

    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '予期しないエラーが発生しました',
        slide: null as any
      };
    }
  }

  /**
   * スライドタイプ別のコンテンツバリデーション
   */
  private validateSlideContent(slideType: SlideType, content: any): { valid: boolean; message: string } {
    // 多肢選択式の場合
    if (slideType.isMultipleChoice()) {
      if (!content.options || content.options.length < 2) {
        return {
          valid: false,
          message: '多肢選択式スライドには2つ以上の選択肢が必要です'
        };
      }
      if (content.options.length > 10) {
        return {
          valid: false,
          message: '選択肢は10個以下である必要があります'
        };
      }
      // 空の選択肢チェック
      if (content.options.some((option: string) => !option || option.trim().length === 0)) {
        return {
          valid: false,
          message: '選択肢に空の項目は含められません'
        };
      }
    }

    // ワードクラウドの場合
    if (slideType.isWordCloud()) {
      if (content.settings?.maxWords && content.settings.maxWords < 1) {
        return {
          valid: false,
          message: '最大単語数は1以上である必要があります'
        };
      }
    }

    return { valid: true, message: '' };
  }
}