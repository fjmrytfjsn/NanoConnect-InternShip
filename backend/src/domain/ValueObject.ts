/**
 * 値オブジェクトベースクラス
 * DDDにおける値オブジェクトの基底クラス
 */

export abstract class ValueObject<T> {
  protected readonly _value: T;
  
  constructor(value: T) {
    this.validate(value);
    this._value = value;
  }
  
  get value(): T {
    return this._value;
  }
  
  /**
   * 値の検証（サブクラスでオーバーライド）
   */
  protected abstract validate(_value: T): void;
  
  /**
   * 値オブジェクトの等価性判定
   * 値が同じであれば同一の値オブジェクトとみなす
   */
  public equals(object?: ValueObject<T>): boolean {
    if (object === null || object === undefined) {
      return false;
    }
    
    if (this === object) {
      return true;
    }
    
    if (!(object instanceof ValueObject)) {
      return false;
    }
    
    return this.isDeepEqual(this._value, object._value);
  }
  
  /**
   * ディープ等価性判定
   */
  private isDeepEqual(a: T, b: T): boolean {
    if (a === b) {
      return true;
    }
    
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
      return false;
    }
    
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) {
      return false;
    }
    
    for (const key of keysA) {
      if (!keysB.includes(key) || !this.isDeepEqual((a as any)[key], (b as any)[key])) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * 文字列表現
   */
  public toString(): string {
    return JSON.stringify(this._value);
  }
}