/**
 * SessionId値オブジェクト
 * 参加者セッション識別用のID
 */

import { ValueObject } from '../ValueObject';
import { v4 as uuidv4 } from 'uuid';

export class SessionId extends ValueObject<string> {
  constructor(value: string) {
    super(value);
  }

  protected validate(value: string): void {
    if (!value) {
      throw new Error('セッションIDは必須です');
    }

    // UUIDv4の形式をチェック
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      throw new Error('セッションIDはUUID形式である必要があります');
    }
  }

  /**
   * 新しいセッションIDを生成
   */
  public static generate(): SessionId {
    return new SessionId(uuidv4());
  }

  /**
   * 既存のIDから作成
   */
  public static from(id: string): SessionId {
    return new SessionId(id);
  }

  /**
   * 文字列への変換
   */
  public toString(): string {
    return this._value;
  }

  /**
   * 短縮形式での表示（最初の8文字）
   */
  public toShortFormat(): string {
    return this._value.slice(0, 8);
  }
}
