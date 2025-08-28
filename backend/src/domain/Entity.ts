/**
 * エンティティベースクラス
 * DDDにおけるエンティティの基底クラス
 */

export abstract class Entity<T> {
  protected readonly _id: T;
  
  constructor(id: T) {
    this._id = id;
  }
  
  get id(): T {
    return this._id;
  }
  
  /**
   * エンティティの等価性判定
   * IDが同じであれば同一のエンティティとみなす
   */
  public equals(object?: Entity<T>): boolean {
    if (object === null || object === undefined) {
      return false;
    }
    
    if (this === object) {
      return true;
    }
    
    if (!(object instanceof Entity)) {
      return false;
    }
    
    return this._id === object._id;
  }
  
  /**
   * ドメインイベントの発生（将来的な拡張用）
   */
  protected addDomainEvent(_event: any): void {
    // 将来的にドメインイベントを実装する場合の基盤
    // 現在のフェーズでは未実装
  }
}