/**
 * プレゼンテーションリアルタイム制御ユースケース
 * プレゼンターによるプレゼンテーション開始/停止、スライド制御を担当
 */

import { IPresentationRepository } from '@/domain/repositories/IPresentationRepository';
import { ISlideRepository } from '@/domain/repositories/ISlideRepository';
import { PresentationId, UserId } from '@/types/common';

/**
 * プレゼンテーション制御リクエストの基底インターフェース
 */
export interface BaseControlRequest {
  presentationId: PresentationId;
  presenterId: UserId;
}

/**
 * プレゼンテーション開始リクエスト
 */
export interface StartPresentationRequest extends BaseControlRequest {}

/**
 * プレゼンテーション停止リクエスト
 */
export interface StopPresentationRequest extends BaseControlRequest {}

/**
 * スライド切り替えリクエスト
 */
export interface ChangeSlideRequest extends BaseControlRequest {
  slideIndex: number;
}

/**
 * 次のスライドリクエスト
 */
export interface NextSlideRequest extends BaseControlRequest {}

/**
 * 前のスライドリクエスト
 */
export interface PrevSlideRequest extends BaseControlRequest {}

/**
 * 制御結果レスポンス
 */
export interface ControlPresentationResponse {
  success: boolean;
  message: string;
  presentationId: PresentationId;
  currentSlideIndex?: number;
  totalSlides?: number;
  isActive?: boolean;
}

/**
 * プレゼンテーション状態情報
 */
export interface PresentationState {
  presentationId: PresentationId;
  isActive: boolean;
  currentSlideIndex: number;
  totalSlides: number;
  title: string;
}

/**
 * プレゼンテーションリアルタイム制御ユースケース
 */
export class ControlPresentationRealtimeUseCase {
  constructor(
    private readonly presentationRepository: IPresentationRepository,
    private readonly slideRepository: ISlideRepository
  ) {}

  /**
   * プレゼンテーションを開始する
   */
  async startPresentation(request: StartPresentationRequest): Promise<ControlPresentationResponse> {
    const presentation = await this.presentationRepository.findById(request.presentationId);

    if (!presentation) {
      return {
        success: false,
        message: 'プレゼンテーションが見つかりません',
        presentationId: request.presentationId,
      };
    }

    // プレゼンター権限確認
    if (presentation.presenterId !== request.presenterId) {
      return {
        success: false,
        message: 'このプレゼンテーションを制御する権限がありません',
        presentationId: request.presentationId,
      };
    }

    // スライド数を取得
    const slides = await this.slideRepository.findByPresentationId(request.presentationId);
    const totalSlides = slides.length;

    if (totalSlides === 0) {
      return {
        success: false,
        message: 'スライドが存在しないため、プレゼンテーションを開始できません',
        presentationId: request.presentationId,
      };
    }

    // プレゼンテーションを開始状態に更新
    presentation.start();
    await this.presentationRepository.save(presentation);

    return {
      success: true,
      message: 'プレゼンテーションを開始しました',
      presentationId: request.presentationId,
      currentSlideIndex: presentation.currentSlideIndex,
      totalSlides,
      isActive: true,
    };
  }

  /**
   * プレゼンテーションを停止する
   */
  async stopPresentation(request: StopPresentationRequest): Promise<ControlPresentationResponse> {
    const presentation = await this.presentationRepository.findById(request.presentationId);

    if (!presentation) {
      return {
        success: false,
        message: 'プレゼンテーションが見つかりません',
        presentationId: request.presentationId,
      };
    }

    // プレゼンター権限確認
    if (presentation.presenterId !== request.presenterId) {
      return {
        success: false,
        message: 'このプレゼンテーションを制御する権限がありません',
        presentationId: request.presentationId,
      };
    }

    // プレゼンテーションを停止状態に更新
    presentation.stop();
    await this.presentationRepository.save(presentation);

    return {
      success: true,
      message: 'プレゼンテーションを停止しました',
      presentationId: request.presentationId,
      currentSlideIndex: presentation.currentSlideIndex,
      isActive: false,
    };
  }

  /**
   * 指定スライドに移動する
   */
  async goToSlide(request: ChangeSlideRequest): Promise<ControlPresentationResponse> {
    const presentation = await this.presentationRepository.findById(request.presentationId);

    if (!presentation) {
      return {
        success: false,
        message: 'プレゼンテーションが見つかりません',
        presentationId: request.presentationId,
      };
    }

    // プレゼンター権限確認
    if (presentation.presenterId !== request.presenterId) {
      return {
        success: false,
        message: 'このプレゼンテーションを制御する権限がありません',
        presentationId: request.presentationId,
      };
    }

    // スライド数を確認
    const slides = await this.slideRepository.findByPresentationId(request.presentationId);
    const totalSlides = slides.length;

    if (request.slideIndex < 0 || request.slideIndex >= totalSlides) {
      return {
        success: false,
        message: `無効なスライド番号です (範囲: 0-${totalSlides - 1})`,
        presentationId: request.presentationId,
        currentSlideIndex: presentation.currentSlideIndex,
        totalSlides,
      };
    }

    // スライドを移動
    presentation.goToSlide(request.slideIndex);
    await this.presentationRepository.save(presentation);

    return {
      success: true,
      message: `スライド ${request.slideIndex + 1} に移動しました`,
      presentationId: request.presentationId,
      currentSlideIndex: presentation.currentSlideIndex,
      totalSlides,
      isActive: presentation.isActive,
    };
  }

  /**
   * 次のスライドに移動する
   */
  async nextSlide(request: NextSlideRequest): Promise<ControlPresentationResponse> {
    const presentation = await this.presentationRepository.findById(request.presentationId);

    if (!presentation) {
      return {
        success: false,
        message: 'プレゼンテーションが見つかりません',
        presentationId: request.presentationId,
      };
    }

    // プレゼンター権限確認
    if (presentation.presenterId !== request.presenterId) {
      return {
        success: false,
        message: 'このプレゼンテーションを制御する権限がありません',
        presentationId: request.presentationId,
      };
    }

    // スライド数を確認
    const slides = await this.slideRepository.findByPresentationId(request.presentationId);
    const totalSlides = slides.length;

    if (presentation.currentSlideIndex >= totalSlides - 1) {
      return {
        success: false,
        message: '最後のスライドです',
        presentationId: request.presentationId,
        currentSlideIndex: presentation.currentSlideIndex,
        totalSlides,
        isActive: presentation.isActive,
      };
    }

    // 次のスライドに移動
    presentation.goToSlide(presentation.currentSlideIndex + 1);
    await this.presentationRepository.save(presentation);

    return {
      success: true,
      message: `スライド ${presentation.currentSlideIndex + 1} に移動しました`,
      presentationId: request.presentationId,
      currentSlideIndex: presentation.currentSlideIndex,
      totalSlides,
      isActive: presentation.isActive,
    };
  }

  /**
   * 前のスライドに移動する
   */
  async prevSlide(request: PrevSlideRequest): Promise<ControlPresentationResponse> {
    const presentation = await this.presentationRepository.findById(request.presentationId);

    if (!presentation) {
      return {
        success: false,
        message: 'プレゼンテーションが見つかりません',
        presentationId: request.presentationId,
      };
    }

    // プレゼンター権限確認
    if (presentation.presenterId !== request.presenterId) {
      return {
        success: false,
        message: 'このプレゼンテーションを制御する権限がありません',
        presentationId: request.presentationId,
      };
    }

    if (presentation.currentSlideIndex <= 0) {
      const slides = await this.slideRepository.findByPresentationId(request.presentationId);
      return {
        success: false,
        message: '最初のスライドです',
        presentationId: request.presentationId,
        currentSlideIndex: presentation.currentSlideIndex,
        totalSlides: slides.length,
        isActive: presentation.isActive,
      };
    }

    // 前のスライドに移動
    presentation.goToSlide(presentation.currentSlideIndex - 1);
    await this.presentationRepository.save(presentation);

    const slides = await this.slideRepository.findByPresentationId(request.presentationId);

    return {
      success: true,
      message: `スライド ${presentation.currentSlideIndex + 1} に移動しました`,
      presentationId: request.presentationId,
      currentSlideIndex: presentation.currentSlideIndex,
      totalSlides: slides.length,
      isActive: presentation.isActive,
    };
  }

  /**
   * プレゼンテーション状態を取得する
   */
  async getPresentationState(
    presentationId: PresentationId,
    requesterId: UserId
  ): Promise<PresentationState | null> {
    const presentation = await this.presentationRepository.findById(presentationId);

    if (!presentation) {
      return null;
    }

    // プレゼンター権限確認
    if (presentation.presenterId !== requesterId) {
      return null;
    }

    const slides = await this.slideRepository.findByPresentationId(presentationId);

    return {
      presentationId,
      isActive: presentation.isActive,
      currentSlideIndex: presentation.currentSlideIndex,
      totalSlides: slides.length,
      title: presentation.title,
    };
  }
}