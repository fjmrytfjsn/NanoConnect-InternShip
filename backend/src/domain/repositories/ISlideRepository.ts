/**
 * スライドリポジトリインターフェース
 * スライドエンティティの永続化を担う
 */

import { Repository } from '../Repository';
import { Slide } from '../entities/Slide';
import { SlideId, PresentationId } from '@/types/common';

export interface ISlideRepository extends Repository<Slide, SlideId> {
  /**
   * プレゼンテーションIDによるスライド一覧の取得
   */
  findByPresentationId(_presentationId: PresentationId): Promise<Slide[]>;

  /**
   * プレゼンテーション内のスライド数取得
   */
  countByPresentationId(_presentationId: PresentationId): Promise<number>;

  /**
   * プレゼンテーション内の特定順序のスライド取得
   */
  findByPresentationIdAndOrder(_presentationId: PresentationId, _order: number): Promise<Slide | null>;

  /**
   * プレゼンテーション内のスライド最大順序取得
   */
  getMaxOrderByPresentationId(_presentationId: PresentationId): Promise<number>;

  /**
   * スライドの順序変更
   * 指定されたスライドの順序を変更し、他のスライドの順序も調整する
   */
  updateSlideOrder(_slideId: SlideId, _newOrder: number): Promise<void>;

  /**
   * プレゼンテーション内の複数スライド順序一括更新
   */
  updateSlidesOrder(_slideOrders: Array<{ slideId: SlideId; order: number }>): Promise<void>;

  /**
   * プレゼンテーションのすべてのスライド削除
   */
  deleteByPresentationId(_presentationId: PresentationId): Promise<number>;
}