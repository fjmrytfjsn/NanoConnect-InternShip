/**
 * Userエンティティ
 * ドメイン層におけるユーザーの表現
 */

import { Entity } from '../Entity';
import { UserId, Timestamp } from '@/types/common';

export interface UserProps {
  username: string;
  email: string;
  passwordHash: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export class User extends Entity<UserId> {
  private _props: UserProps;

  constructor(id: UserId, props: UserProps) {
    super(id);
    this._props = props;
  }

  // ファクトリメソッド：新規ユーザー作成
  public static create(
    id: UserId,
    username: string,
    email: string,
    passwordHash: string
  ): User {
    const now = new Date().toISOString();
    return new User(id, {
      username,
      email,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    });
  }

  // ファクトリメソッド：既存データからの復元
  public static restore(id: UserId, props: UserProps): User {
    return new User(id, props);
  }

  // ゲッター
  get username(): string {
    return this._props.username;
  }

  get email(): string {
    return this._props.email;
  }

  get passwordHash(): string {
    return this._props.passwordHash;
  }

  get createdAt(): Timestamp {
    return this._props.createdAt;
  }

  get updatedAt(): Timestamp {
    return this._props.updatedAt;
  }

  // ビジネスロジック：ユーザー名の変更
  public changeUsername(newUsername: string): void {
    this.validateUsername(newUsername);
    this._props.username = newUsername;
    this._props.updatedAt = new Date().toISOString();
  }

  // ビジネスロジック：メールアドレスの変更
  public changeEmail(newEmail: string): void {
    this.validateEmail(newEmail);
    this._props.email = newEmail;
    this._props.updatedAt = new Date().toISOString();
  }

  // ビジネスロジック：パスワードの変更
  public changePassword(newPasswordHash: string): void {
    if (!newPasswordHash || newPasswordHash.trim().length === 0) {
      throw new Error('パスワードハッシュは必須です');
    }
    this._props.passwordHash = newPasswordHash;
    this._props.updatedAt = new Date().toISOString();
  }

  // バリデーション：ユーザー名
  private validateUsername(username: string): void {
    if (!username || username.trim().length === 0) {
      throw new Error('ユーザー名は必須です');
    }
    if (username.length < 3 || username.length > 20) {
      throw new Error('ユーザー名は3文字以上20文字以内で入力してください');
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      throw new Error('ユーザー名は英数字、アンダースコア、ハイフンのみ使用可能です');
    }
  }

  // バリデーション：メールアドレス
  private validateEmail(email: string): void {
    if (!email || email.trim().length === 0) {
      throw new Error('メールアドレスは必須です');
    }
    if (email.length > 100) {
      throw new Error('メールアドレスは100文字以内で入力してください');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('有効なメールアドレスを入力してください');
    }
  }

  // プリミティブ型への変換（永続化用）
  public toPrimitives(): UserProps & { id: UserId } {
    return {
      id: this.id,
      username: this._props.username,
      email: this._props.email,
      passwordHash: this._props.passwordHash,
      createdAt: this._props.createdAt,
      updatedAt: this._props.updatedAt,
    };
  }

  // 公開情報のみの取得（パスワードハッシュを除く）
  public toPublicInfo(): {
    id: UserId;
    username: string;
    email: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
  } {
    return {
      id: this.id,
      username: this._props.username,
      email: this._props.email,
      createdAt: this._props.createdAt,
      updatedAt: this._props.updatedAt,
    };
  }
}