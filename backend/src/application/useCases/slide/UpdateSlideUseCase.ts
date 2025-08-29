/**
 * スライド更新ユースケース
 * 既存スライドの更新とスライドタイプ別バリデーション
 */

import { SlideType } from '@/domain/valueObjects/SlideType';
import { ISlideRepository } from '@/domain/repositories/ISlideRepository';
import { IPresentationRepository } from '@/domain/repositories/IPresentationRepository';
import {
  UpdateSlideRequestDto,
  UpdateSlideResponseDto,
} from '@/application/dtos/slide/UpdateSlideDto';

export class UpdateSlideUseCase {
  constructor(
    private slideRepository: ISlideRepository,
    private presentationRepository: IPresentationRepository
  ) {}

  async execute(request: UpdateSlideRequestDto): Promise<UpdateSlideResponseDto> {
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

      // 3. 更新内容のバリデーション
      if (request.content) {
        const validationResult = this.validateSlideContent(slide.type, request.content);
        if (!validationResult.valid) {
          return {
            success: false,
            message: validationResult.message,
          };
        }
      }

      // 4. スライドの更新
      slide.update(request.title, request.content?.question, request.content?.options);

      // 5. 順序変更がある場合
      if (request.order !== undefined && request.order !== slide.slideOrder) {
        if (request.order < 0) {
          return {
            success: false,
            message: 'スライド順序は0以上である必要があります',
          };
        }

        // 順序変更処理
        await this.slideRepository.updateSlideOrder(request.slideId, request.order);
      } else {
        // 通常の更新処理
        await this.slideRepository.save(slide);
      }

      return {
        success: true,
        message: 'スライドが正常に更新されました',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '予期しないエラーが発生しました',
      };
    }
  }

  /**
   * スライドタイプ別のコンテンツバリデーション
   */
  private validateSlideContent(
    slideType: SlideType,
    content: any
  ): { valid: boolean; message: string } {
    // 多肢選択式の場合
    if (slideType.isMultipleChoice()) {
      if (content.options && content.options.length > 0) {
        if (content.options.length < 2) {
          return {
            valid: false,
            message: '多肢選択式スライドには2つ以上の選択肢が必要です',
          };
        }
        if (content.options.length > 10) {
          return {
            valid: false,
            message: '選択肢は10個以下である必要があります',
          };
        }
        // 空の選択肢チェック
        if (content.options.some((option: string) => !option || option.trim().length === 0)) {
          return {
            valid: false,
            message: '選択肢に空の項目は含められません',
          };
        }
      }
    }

    // ワードクラウドの場合
    if (slideType.isWordCloud()) {
      if (content.settings?.maxWords && content.settings.maxWords < 1) {
        return {
          valid: false,
          message: '最大単語数は1以上である必要があります',
        };
      }
    }

    return { valid: true, message: '' };
  }
}
