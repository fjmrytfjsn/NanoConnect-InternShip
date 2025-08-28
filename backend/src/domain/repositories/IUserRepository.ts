/**
 * ユーザーリポジトリインターフェース
 * ユーザーエンティティの永続化を担う
 */

import { Repository } from '../Repository';
import { User } from '../entities/User';
import { UserId } from '@/types/common';

export interface IUserRepository extends Repository<User, UserId> {
  /**
   * ユーザー名による検索
   */
  findByUsername(username: string): Promise<User | null>;

  /**
   * メールアドレスによる検索
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * ユーザー名の重複チェック
   */
  existsByUsername(username: string): Promise<boolean>;

  /**
   * メールアドレスの重複チェック
   */
  existsByEmail(email: string): Promise<boolean>;

  /**
   * ユーザーの一括削除（管理機能用）
   */
  deleteByIds(ids: UserId[]): Promise<number>;
}