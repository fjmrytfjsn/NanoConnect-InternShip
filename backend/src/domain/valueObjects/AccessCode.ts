/**
 * AccessCode値オブジェクト
 * プレゼンテーション参加用の6桁コード
 */

import { ValueObject } from '../ValueObject';

export class AccessCode extends ValueObject<string> {
  private static readonly CODE_LENGTH = 6;
  private static readonly CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 紛らわしい文字を除外

  constructor(value: string) {
    super(value);
  }

  protected validate(value: string): void {
    if (!value) {
      throw new Error('アクセスコードは必須です');
    }
    
    if (value.length !== AccessCode.CODE_LENGTH) {
      throw new Error(`アクセスコードは${AccessCode.CODE_LENGTH}桁である必要があります`);
    }
    
    if (!/^[A-Z0-9]+$/.test(value)) {
      throw new Error('アクセスコードは英数字（大文字）のみ使用可能です');
    }
  }

  /**
   * ランダムなアクセスコードを生成
   */
  public static generate(): AccessCode {
    let result = '';
    for (let i = 0; i < AccessCode.CODE_LENGTH; i++) {
      const randomIndex = Math.floor(Math.random() * AccessCode.CHARACTERS.length);
      result += AccessCode.CHARACTERS[randomIndex];
    }
    return new AccessCode(result);
  }

  /**
   * 既存のコードから作成
   */
  public static from(code: string): AccessCode {
    return new AccessCode(code.toUpperCase());
  }

  /**
   * 文字列への変換
   */
  public toString(): string {
    return this._value;
  }

  /**
   * 表示用の形式（3桁-3桁）
   */
  public toDisplayFormat(): string {
    return `${this._value.slice(0, 3)}-${this._value.slice(3)}`;
  }
}