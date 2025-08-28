/**
 * Slideエンティティ
 * ドメイン層におけるスライドの表現
 */

import { Entity } from '../Entity';
import { SlideId, PresentationId, Timestamp } from '@/types/common';
import { SlideType } from '../valueObjects/SlideType';

export interface SlideProps {
  presentationId: PresentationId;
  type: SlideType;
  title: string;
  question: string;
  options?: string[];
  slideOrder: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export class Slide extends Entity<SlideId> {
  private _props: SlideProps;

  constructor(id: SlideId, props: SlideProps) {
    super(id);
    this.validateSlide(props);
    this._props = props;
  }

  // ファクトリメソッド：新規スライド作成
  public static create(
    id: SlideId,
    presentationId: PresentationId,
    type: SlideType,
    title: string,
    question: string,
    slideOrder: number,
    options?: string[]
  ): Slide {
    const now = new Date().toISOString();
    return new Slide(id, {
      presentationId,
      type,
      title,
      question,
      options,
      slideOrder,
      createdAt: now,
      updatedAt: now,
    });
  }

  // ファクトリメソッド：既存データからの復元
  public static restore(id: SlideId, props: SlideProps): Slide {
    return new Slide(id, props);
  }

  // ファクトリメソッド：データベースからの復元
  public static fromDatabase(data: {
    id: string;
    presentation_id: string;
    type: string;
    title: string;
    question: string;
    options: string | null;
    slide_order: number;
    created_at: string;
    updated_at: string;
  }): Slide {
    const options = data.options ? JSON.parse(data.options) : undefined;
    return new Slide(data.id, {
      presentationId: data.presentation_id,
      type: SlideType.fromString(data.type),
      title: data.title,
      question: data.question,
      options,
      slideOrder: data.slide_order,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });
  }

  // ゲッター
  get presentationId(): PresentationId {
    return this._props.presentationId;
  }

  get type(): SlideType {
    return this._props.type;
  }

  get title(): string {
    return this._props.title;
  }

  get question(): string {
    return this._props.question;
  }

  get options(): string[] | undefined {
    return this._props.options;
  }

  get slideOrder(): number {
    return this._props.slideOrder;
  }

  get createdAt(): Timestamp {
    return this._props.createdAt;
  }

  get updatedAt(): Timestamp {
    return this._props.updatedAt;
  }

  // ビジネスロジック：スライド情報の更新
  public update(title?: string, question?: string, options?: string[]): void {
    if (title !== undefined) {
      this.validateTitle(title);
      this._props.title = title;
    }

    if (question !== undefined) {
      this.validateQuestion(question);
      this._props.question = question;
    }

    if (options !== undefined) {
      this.validateOptions(this._props.type, options);
      this._props.options = options;
    }

    this._props.updatedAt = new Date().toISOString();
  }

  // ビジネスロジック：スライド順序の変更
  public changeOrder(newOrder: number): void {
    if (newOrder < 0) {
      throw new Error('スライド順序は0以上である必要があります');
    }

    this._props.slideOrder = newOrder;
    this._props.updatedAt = new Date().toISOString();
  }

  // ビジネスロジック：多肢選択式かどうかの判定
  public isMultipleChoice(): boolean {
    return this._props.type.isMultipleChoice();
  }

  // ビジネスロジック：ワードクラウドかどうかの判定
  public isWordCloud(): boolean {
    return this._props.type.isWordCloud();
  }

  // ビジネスロジック：自由記述かどうかの判定
  public isOpenText(): boolean {
    return this._props.type.isOpenText();
  }

  // プリミティブ型への変換（永続化用）
  public toPrimitives(): SlideProps & { id: SlideId } {
    return {
      id: this.id,
      presentationId: this._props.presentationId,
      type: this._props.type,
      title: this._props.title,
      question: this._props.question,
      options: this._props.options,
      slideOrder: this._props.slideOrder,
      createdAt: this._props.createdAt,
      updatedAt: this._props.updatedAt,
    };
  }

  // バリデーション：スライド全体
  private validateSlide(props: SlideProps): void {
    this.validateTitle(props.title);
    this.validateQuestion(props.question);
    this.validateOptions(props.type, props.options);

    if (props.slideOrder < 0) {
      throw new Error('スライド順序は0以上である必要があります');
    }
  }

  // バリデーション：タイトル
  private validateTitle(title: string): void {
    if (!title || title.trim().length === 0) {
      throw new Error('スライドタイトルは必須です');
    }
    if (title.length > 100) {
      throw new Error('スライドタイトルは100文字以内で入力してください');
    }
  }

  // バリデーション：質問
  private validateQuestion(question: string): void {
    if (!question || question.trim().length === 0) {
      throw new Error('質問は必須です');
    }
    if (question.length > 500) {
      throw new Error('質問は500文字以内で入力してください');
    }
  }

  // バリデーション：選択肢
  private validateOptions(type: SlideType, options?: string[]): void {
    if (type.requiresOptions()) {
      if (!options || options.length < 2) {
        throw new Error('多肢選択式スライドには2つ以上の選択肢が必要です');
      }
      if (options.length > 10) {
        throw new Error('選択肢は10個以下である必要があります');
      }
      // 空の選択肢がないかチェック
      if (options.some(option => !option || option.trim().length === 0)) {
        throw new Error('選択肢に空の項目は含められません');
      }
    }
  }
}
