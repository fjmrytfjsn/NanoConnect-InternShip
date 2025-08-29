/**
 * Presentationエンティティ
 * ドメイン層におけるプレゼンテーションの表現
 */

import { Entity } from '../Entity';
import { PresentationId, UserId, AccessCode, Timestamp } from '@/types/common';

export interface PresentationProps {
  title: string;
  description?: string;
  presenterId: UserId;
  accessCode: AccessCode;
  isActive: boolean;
  currentSlideIndex: number;
  accessCodeExpirationAt?: Timestamp; // アクセスコード有効期限
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export class Presentation extends Entity<PresentationId> {
  private _props: PresentationProps;

  constructor(id: PresentationId, props: PresentationProps) {
    super(id);
    this._props = props;
  }

  // ファクトリメソッド：新規プレゼンテーション作成
  public static create(
    id: PresentationId,
    title: string,
    presenterId: UserId,
    accessCode: AccessCode,
    description?: string
  ): Presentation {
    // バリデーション
    if (!title || title.trim().length === 0) {
      throw new Error('プレゼンテーションのタイトルは必須です');
    }

    if (title.length > 100) {
      throw new Error('プレゼンテーションのタイトルは100文字以内で入力してください');
    }

    if (description && description.length > 1000) {
      throw new Error('プレゼンテーションの説明は1000文字以内で入力してください');
    }

    if (!presenterId || presenterId.trim().length === 0) {
      throw new Error('プレゼンターIDは必須です');
    }

    const now = new Date().toISOString();
    return new Presentation(id, {
      title: title.trim(),
      description: description?.trim(),
      presenterId,
      accessCode,
      isActive: false,
      currentSlideIndex: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  // ファクトリメソッド：既存データからの復元
  public static restore(id: PresentationId, props: PresentationProps): Presentation {
    return new Presentation(id, props);
  }

  // ゲッター
  get title(): string {
    return this._props.title;
  }

  get description(): string | undefined {
    return this._props.description;
  }

  get presenterId(): UserId {
    return this._props.presenterId;
  }

  get accessCode(): AccessCode {
    return this._props.accessCode;
  }

  get isActive(): boolean {
    return this._props.isActive;
  }

  get currentSlideIndex(): number {
    return this._props.currentSlideIndex;
  }

  get createdAt(): Timestamp {
    return this._props.createdAt;
  }

  get updatedAt(): Timestamp {
    return this._props.updatedAt;
  }

  get accessCodeExpirationAt(): Timestamp | undefined {
    return this._props.accessCodeExpirationAt;
  }

  // アクセスコードの有効性チェック
  public isAccessCodeValid(): boolean {
    // 有効期限が設定されていない場合は常に有効
    if (!this._props.accessCodeExpirationAt) {
      return true;
    }

    const now = new Date();
    const expirationDate = new Date(this._props.accessCodeExpirationAt);
    
    return now <= expirationDate;
  }

  // アクセスコード有効期限の設定
  public setAccessCodeExpiration(expirationMinutes: number | null): void {
    if (expirationMinutes === null || expirationMinutes <= 0) {
      // 無期限に設定
      this._props.accessCodeExpirationAt = undefined;
    } else {
      // 現在時刻から指定分後の時刻を設定
      const expirationDate = new Date();
      expirationDate.setMinutes(expirationDate.getMinutes() + expirationMinutes);
      this._props.accessCodeExpirationAt = expirationDate.toISOString();
    }

    this._props.updatedAt = new Date().toISOString();
  }

  // アクセスコードの残り有効期限（分）を取得
  public getAccessCodeRemainingMinutes(): number | null {
    if (!this._props.accessCodeExpirationAt) {
      return null; // 無期限
    }

    const now = new Date();
    const expirationDate = new Date(this._props.accessCodeExpirationAt);
    const diffMs = expirationDate.getTime() - now.getTime();
    
    if (diffMs <= 0) {
      return 0; // 期限切れ
    }

    return Math.ceil(diffMs / (1000 * 60)); // 分に変換（切り上げ）
  }

  // ビジネスロジック：プレゼンテーション情報の更新
  public updateInfo(title?: string, description?: string): void {
    if (title !== undefined) {
      this.validateTitle(title);
      this._props.title = title;
    }

    if (description !== undefined) {
      this.validateDescription(description);
      this._props.description = description;
    }

    this._props.updatedAt = new Date().toISOString();
  }

  // ビジネスロジック：プレゼンテーション開始
  public start(): void {
    if (this._props.isActive) {
      throw new Error('プレゼンテーションは既にアクティブです');
    }
    this._props.isActive = true;
    this._props.currentSlideIndex = 0;
    this._props.updatedAt = new Date().toISOString();
  }

  // ビジネスロジック：プレゼンテーション停止
  public stop(): void {
    if (!this._props.isActive) {
      throw new Error('プレゼンテーションはアクティブではありません');
    }
    this._props.isActive = false;
    this._props.updatedAt = new Date().toISOString();
  }

  // ビジネスロジック：次のスライドへ移動
  public nextSlide(maxSlideIndex: number): void {
    if (!this._props.isActive) {
      throw new Error('プレゼンテーションがアクティブでないため、スライドを変更できません');
    }

    if (this._props.currentSlideIndex >= maxSlideIndex) {
      throw new Error('既に最後のスライドです');
    }

    this._props.currentSlideIndex += 1;
    this._props.updatedAt = new Date().toISOString();
  }

  // ビジネスロジック：前のスライドへ移動
  public previousSlide(): void {
    if (!this._props.isActive) {
      throw new Error('プレゼンテーションがアクティブでないため、スライドを変更できません');
    }

    if (this._props.currentSlideIndex <= 0) {
      throw new Error('既に最初のスライドです');
    }

    this._props.currentSlideIndex -= 1;
    this._props.updatedAt = new Date().toISOString();
  }

  // ビジネスロジック：指定したスライドへ移動
  public gotoSlide(slideIndex: number, maxSlideIndex: number): void {
    if (!this._props.isActive) {
      throw new Error('プレゼンテーションがアクティブでないため、スライドを変更できません');
    }

    if (slideIndex < 0 || slideIndex > maxSlideIndex) {
      throw new Error(`スライドインデックスは0から${maxSlideIndex}の間で指定してください`);
    }

    this._props.currentSlideIndex = slideIndex;
    this._props.updatedAt = new Date().toISOString();
  }

  // ビジネスロジック：プレゼンターかどうかの確認
  public isPresenter(userId: UserId): boolean {
    return this._props.presenterId === userId;
  }

  // バリデーション：タイトル
  private validateTitle(title: string): void {
    if (!title || title.trim().length === 0) {
      throw new Error('プレゼンテーションタイトルは必須です');
    }
    if (title.length > 100) {
      throw new Error('プレゼンテーションタイトルは100文字以内で入力してください');
    }
  }

  // バリデーション：説明
  private validateDescription(description: string): void {
    if (description && description.length > 500) {
      throw new Error('プレゼンテーション説明は500文字以内で入力してください');
    }
  }

  // プリミティブ型への変換（永続化用）
  public toPrimitives(): PresentationProps & { id: PresentationId } {
    return {
      id: this.id,
      title: this._props.title,
      description: this._props.description,
      presenterId: this._props.presenterId,
      accessCode: this._props.accessCode,
      isActive: this._props.isActive,
      currentSlideIndex: this._props.currentSlideIndex,
      createdAt: this._props.createdAt,
      updatedAt: this._props.updatedAt,
    };
  }
}
