/**
 * プレゼンテーションリポジトリインターフェース
 * プレゼンテーションエンティティの永続化を担う
 */

import { Repository } from '../Repository';
import { Presentation } from '../entities/Presentation';
import { PresentationId, UserId, AccessCode } from '@/types/common';

export interface IPresentationRepository extends Repository<Presentation, PresentationId> {
  /**
   * プレゼンターIDによる検索
   */
  findByPresenterId(_presenterId: UserId): Promise<Presentation[]>;

  /**
   * アクセスコードによる検索
   */
  findByAccessCode(_accessCode: AccessCode): Promise<Presentation | null>;

  /**
   * アクティブなプレゼンテーション一覧の取得
   */
  findActive(): Promise<Presentation[]>;

  /**
   * プレゼンターのアクティブなプレゼンテーション取得
   */
  findActiveByPresenterId(_presenterId: UserId): Promise<Presentation[]>;

  /**
   * アクセスコードの重複チェック
   */
  existsByAccessCode(_accessCode: AccessCode): Promise<boolean>;

  /**
   * プレゼンテーションの統計情報取得
   */
  getStatistics(_presentationId: PresentationId): Promise<{
    totalSlides: number;
    totalResponses: number;
    totalParticipants: number;
    activeParticipants: number;
  } | null>;
}
