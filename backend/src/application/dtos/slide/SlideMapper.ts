/**
 * ドメインエンティティとDTOの変換を行うマッパー
 */

import { Slide } from '@/domain/entities/Slide';
import { SlideInfoDto } from './GetSlideDto';

export class SlideMapper {
  /**
   * Slideエンティティを SlideInfoDto に変換
   */
  public static toDto(slide: Slide): SlideInfoDto {
    return {
      id: slide.id,
      presentationId: slide.presentationId,
      title: slide.title,
      type: slide.type.toString() as 'multiple_choice' | 'word_cloud',
      content: {
        question: slide.question,
        ...(slide.options && { options: slide.options }),
        settings: slide.isMultipleChoice()
          ? { allowMultiple: false, showResults: true }
          : { maxWords: 100 },
      },
      order: slide.slideOrder,
      createdAt: slide.createdAt,
      updatedAt: slide.updatedAt,
    };
  }

  /**
   * 複数のSlideエンティティを SlideInfoDto配列 に変換
   */
  public static toDtoArray(slides: Slide[]): SlideInfoDto[] {
    return slides.map(slide => this.toDto(slide));
  }
}
