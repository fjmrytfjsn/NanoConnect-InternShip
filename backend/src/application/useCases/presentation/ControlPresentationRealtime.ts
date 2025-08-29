/**
 * プレゼンテーションリアルタイム制御ユースケース
 * プレゼンテーションの開始・停止・スライド制御のリアルタイム機能を提供
 */

import { IPresentationRepository } from '@/domain/repositories/IPresentationRepository';
import { ISlideRepository } from '@/domain/repositories/ISlideRepository';
import { PresentationId, UserId } from '@/types/common';
import {
  PresentationStartEvent,
  PresentationStopEvent,
  SlideChangeEvent,
} from 'shared/types/socket';
import { SlideInfo } from 'shared/types/api';

export interface IRealtimeBroadcaster {
  broadcastToPresentationParticipants<K extends string>(
    presentationId: PresentationId,
    event: K,
    data: any
  ): void;
  broadcastToPresentationPresenters<K extends string>(
    presentationId: PresentationId,
    event: K,
    data: any
  ): void;
  getPresentationParticipantCount(presentationId: PresentationId): Promise<number>;
}

export class ControlPresentationRealtimeUseCase {
  constructor(
    private readonly presentationRepository: IPresentationRepository,
    private readonly slideRepository: ISlideRepository,
    private readonly realtimeBroadcaster: IRealtimeBroadcaster
  ) {}

  /**
   * プレゼンテーションを開始
   */
  async startPresentation(
    presentationId: PresentationId,
    presenterId: UserId
  ): Promise<{ success: boolean; message?: string }> {
    try {
      // プレゼンテーション存在チェックと権限確認
      const presentation = await this.presentationRepository.findById(presentationId);
      if (!presentation) {
        return { success: false, message: 'プレゼンテーションが見つかりません' };
      }

      if (presentation.presenterId !== presenterId) {
        return { success: false, message: 'このプレゼンテーションを制御する権限がありません' };
      }

      // 既に開始されている場合のチェック
      if (presentation.isActive) {
        return { success: false, message: 'プレゼンテーションは既に開始されています' };
      }

      // 最初のスライドを取得
      const firstSlide = await this.slideRepository.findByPresentationIdAndOrder(
        presentationId,
        0
      );

      if (!firstSlide) {
        return { success: false, message: 'プレゼンテーションにスライドがありません' };
      }

      // プレゼンテーションをアクティブに設定
      presentation.start();
      await this.presentationRepository.save(presentation);

      // 参加者数を取得
      const participantCount = await this.realtimeBroadcaster.getPresentationParticipantCount(
        presentationId
      );

      // イベントデータを構築
      const slideInfo: SlideInfo = {
        id: firstSlide.id,
        type: firstSlide.type.toString(),
        title: firstSlide.title,
        question: firstSlide.question,
        options: firstSlide.options,
        order: firstSlide.order,
      };

      const startEvent: PresentationStartEvent = {
        presentationId,
        currentSlideIndex: 0,
        currentSlide: slideInfo,
        timestamp: new Date().toISOString(),
      };

      // 参加者とプレゼンターにブロードキャスト
      this.realtimeBroadcaster.broadcastToPresentationParticipants(
        presentationId,
        'presentation:started',
        startEvent
      );
      this.realtimeBroadcaster.broadcastToPresentationPresenters(
        presentationId,
        'presentation:started',
        startEvent
      );

      console.log(
        `📢 プレゼンテーション開始: ${presentationId} (参加者数: ${participantCount})`
      );

      return { success: true };
    } catch (error) {
      console.error('プレゼンテーション開始エラー:', error);
      return { success: false, message: 'プレゼンテーションの開始中にエラーが発生しました' };
    }
  }

  /**
   * プレゼンテーションを停止
   */
  async stopPresentation(
    presentationId: PresentationId,
    presenterId: UserId
  ): Promise<{ success: boolean; message?: string }> {
    try {
      // プレゼンテーション存在チェックと権限確認
      const presentation = await this.presentationRepository.findById(presentationId);
      if (!presentation) {
        return { success: false, message: 'プレゼンテーションが見つかりません' };
      }

      if (presentation.presenterId !== presenterId) {
        return { success: false, message: 'このプレゼンテーションを制御する権限がありません' };
      }

      // 既に停止されている場合のチェック
      if (!presentation.isActive) {
        return { success: false, message: 'プレゼンテーションは既に停止されています' };
      }

      // プレゼンテーションを非アクティブに設定
      presentation.stop();
      await this.presentationRepository.save(presentation);

      // イベントデータを構築
      const stopEvent: PresentationStopEvent = {
        presentationId,
        timestamp: new Date().toISOString(),
      };

      // 参加者とプレゼンターにブロードキャスト
      this.realtimeBroadcaster.broadcastToPresentationParticipants(
        presentationId,
        'presentation:stopped',
        stopEvent
      );
      this.realtimeBroadcaster.broadcastToPresentationPresenters(
        presentationId,
        'presentation:stopped',
        stopEvent
      );

      console.log(`🛑 プレゼンテーション停止: ${presentationId}`);

      return { success: true };
    } catch (error) {
      console.error('プレゼンテーション停止エラー:', error);
      return { success: false, message: 'プレゼンテーションの停止中にエラーが発生しました' };
    }
  }

  /**
   * 次のスライドに移動
   */
  async nextSlide(
    presentationId: PresentationId,
    presenterId: UserId
  ): Promise<{ success: boolean; message?: string }> {
    return this.changeSlide(presentationId, presenterId, 'next');
  }

  /**
   * 前のスライドに移動
   */
  async prevSlide(
    presentationId: PresentationId,
    presenterId: UserId
  ): Promise<{ success: boolean; message?: string }> {
    return this.changeSlide(presentationId, presenterId, 'prev');
  }

  /**
   * 指定スライドに移動
   */
  async gotoSlide(
    presentationId: PresentationId,
    slideIndex: number,
    presenterId: UserId
  ): Promise<{ success: boolean; message?: string }> {
    return this.changeSlide(presentationId, presenterId, 'goto', slideIndex);
  }

  /**
   * スライド変更の共通処理
   */
  private async changeSlide(
    presentationId: PresentationId,
    presenterId: UserId,
    action: 'next' | 'prev' | 'goto',
    targetIndex?: number
  ): Promise<{ success: boolean; message?: string }> {
    try {
      // プレゼンテーション存在チェックと権限確認
      const presentation = await this.presentationRepository.findById(presentationId);
      if (!presentation) {
        return { success: false, message: 'プレゼンテーションが見つかりません' };
      }

      if (presentation.presenterId !== presenterId) {
        return { success: false, message: 'このプレゼンテーションを制御する権限がありません' };
      }

      if (!presentation.isActive) {
        return { success: false, message: 'プレゼンテーションが開始されていません' };
      }

      // 新しいスライドインデックスを計算
      let newSlideIndex: number;
      switch (action) {
        case 'next':
          newSlideIndex = presentation.currentSlideIndex + 1;
          break;
        case 'prev':
          newSlideIndex = Math.max(0, presentation.currentSlideIndex - 1);
          break;
        case 'goto':
          if (targetIndex === undefined || targetIndex < 0) {
            return { success: false, message: '無効なスライドインデックスです' };
          }
          newSlideIndex = targetIndex;
          break;
        default:
          return { success: false, message: '無効なアクションです' };
      }

      // 対象スライドの存在確認
      const targetSlide = await this.slideRepository.findByPresentationIdAndOrder(
        presentationId,
        newSlideIndex
      );

      if (!targetSlide) {
        const message = action === 'next' ? '最後のスライドです' : 'スライドが見つかりません';
        return { success: false, message };
      }

      // プレゼンテーションの現在スライドを更新
      const updatedPresentation = presentation.changeCurrentSlide(newSlideIndex);
      await this.presentationRepository.save(updatedPresentation);

      // イベントデータを構築
      const slideInfo: SlideInfo = {
        id: targetSlide.id,
        type: targetSlide.type.toString(),
        title: targetSlide.title,
        question: targetSlide.question,
        options: targetSlide.options,
        order: targetSlide.order,
      };

      const slideChangeEvent: SlideChangeEvent = {
        presentationId,
        slideId: targetSlide.id,
        slideIndex: newSlideIndex,
        slide: slideInfo,
        timestamp: new Date().toISOString(),
      };

      // 参加者とプレゼンターにブロードキャスト
      this.realtimeBroadcaster.broadcastToPresentationParticipants(
        presentationId,
        'slide:changed',
        slideChangeEvent
      );
      this.realtimeBroadcaster.broadcastToPresentationPresenters(
        presentationId,
        'slide:changed',
        slideChangeEvent
      );

      console.log(`🎯 スライド変更: ${presentationId} -> スライド ${newSlideIndex}`);

      return { success: true };
    } catch (error) {
      console.error('スライド変更エラー:', error);
      return { success: false, message: 'スライド変更中にエラーが発生しました' };
    }
  }

  /**
   * 参加者数のリアルタイム更新を通知
   */
  async notifyParticipantCountUpdate(
    presentationId: PresentationId,
    sessionId: string,
    action: 'joined' | 'left'
  ): Promise<void> {
    try {
      const participantCount = await this.realtimeBroadcaster.getPresentationParticipantCount(
        presentationId
      );

      const eventData = {
        presentationId,
        sessionId,
        participantCount,
        timestamp: new Date().toISOString(),
      };

      const event = action === 'joined' ? 'participant:joined' : 'participant:left';

      // プレゼンターにのみ参加者数変更を通知
      this.realtimeBroadcaster.broadcastToPresentationPresenters(
        presentationId,
        event,
        eventData
      );

      console.log(`👥 参加者数更新通知: ${presentationId} (${action}) - 現在: ${participantCount}人`);
    } catch (error) {
      console.error('参加者数更新通知エラー:', error);
    }
  }
}