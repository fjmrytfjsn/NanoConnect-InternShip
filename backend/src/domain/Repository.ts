/**
 * リポジトリベースインターフェース
 * DDDにおけるリポジトリパターンの基底インターフェース
 */

import { Entity } from './Entity';

/**
 * 基本的なリポジトリインターフェース
 */
export interface Repository<T extends Entity<ID>, ID> {
  /**
   * IDによるエンティティの取得
   */
  findById(_id: ID): Promise<T | null>;
  
  /**
   * すべてのエンティティの取得
   */
  findAll(): Promise<T[]>;
  
  /**
   * エンティティの保存（新規作成・更新）
   */
  save(_entity: T): Promise<T>;
  
  /**
   * エンティティの削除
   */
  delete(_id: ID): Promise<boolean>;
  
  /**
   * 存在確認
   */
  exists(_id: ID): Promise<boolean>;
}

/**
 * 検索機能付きリポジトリインターフェース
 */
export interface SearchableRepository<T extends Entity<ID>, ID, SearchCriteria> 
  extends Repository<T, ID> {
  /**
   * 条件による検索
   */
  findByCriteria(_criteria: SearchCriteria): Promise<T[]>;
  
  /**
   * ページネーション付き検索
   */
  findByCriteriaWithPagination(
    _criteria: SearchCriteria,
    _page: number,
    _limit: number
  ): Promise<{
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;
}

/**
 * トランザクション対応リポジトリインターフェース
 */
export interface TransactionalRepository<T extends Entity<ID>, ID> 
  extends Repository<T, ID> {
  /**
   * トランザクション内での操作実行
   */
  executeInTransaction<R>(_operation: () => Promise<R>): Promise<R>;
}