/**
 * SlideType値オブジェクト
 * スライドタイプの種類を管理する値オブジェクト
 */

import { ValueObject } from '../ValueObject';

export class SlideType extends ValueObject<string> {
  public static readonly MULTIPLE_CHOICE = new SlideType('multiple_choice');
  public static readonly WORD_CLOUD = new SlideType('word_cloud');
  public static readonly OPEN_TEXT = new SlideType('open_text');

  private constructor(value: string) {
    super(value);
  }

  protected validate(value: string): void {
    const validTypes = ['multiple_choice', 'word_cloud', 'open_text'];
    if (!validTypes.includes(value)) {
      throw new Error(`無効なスライドタイプ: ${value}`);
    }
  }

  /**
   * 文字列からSlideTypeを作成
   */
  public static fromString(value: string): SlideType {
    switch (value) {
      case 'multiple_choice':
        return SlideType.MULTIPLE_CHOICE;
      case 'word_cloud':
        return SlideType.WORD_CLOUD;
      case 'open_text':
        return SlideType.OPEN_TEXT;
      default:
        throw new Error(`無効なスライドタイプ: ${value}`);
    }
  }

  /**
   * 多肢選択式かどうかの判定
   */
  public isMultipleChoice(): boolean {
    return this._value === 'multiple_choice';
  }

  /**
   * ワードクラウドかどうかの判定
   */
  public isWordCloud(): boolean {
    return this._value === 'word_cloud';
  }

  /**
   * 自由記述かどうかの判定
   */
  public isOpenText(): boolean {
    return this._value === 'open_text';
  }

  /**
   * 選択肢が必要なタイプかどうかの判定
   */
  public requiresOptions(): boolean {
    return this.isMultipleChoice();
  }

  /**
   * 文字列への変換
   */
  public toString(): string {
    return this._value;
  }
}
