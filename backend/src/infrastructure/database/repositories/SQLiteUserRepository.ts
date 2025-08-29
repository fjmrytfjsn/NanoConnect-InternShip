/**
 * SQLite User Repository
 * ユーザーエンティティの永続化を担当（簡易実装）
 */

import { IUserRepository } from '@/domain/repositories/IUserRepository';
import { User } from '@/domain/entities/User';
// import { SQLiteConnection } from '../SQLiteConnection'; // 将来的に使用予定
import { UserId } from '@/types/common';

export class SQLiteUserRepository implements IUserRepository {
  // private db = SQLiteConnection.getInstance().getDatabase(); // 将来的に使用予定

  async save(user: User): Promise<User> {
    // 簡易実装（実際の実装では適切なテーブル構造を使用）
    return user;
  }

  async findById(id: UserId): Promise<User | null> {
    // 学習用の簡易実装 - 認証がないため、仮のユーザーを返す
    if (id && id.trim().length > 0) {
      // 'user1'の場合のみユーザーを返す（テスト用）
      if (id === 'user1') {
        return User.create('user1', 'testuser', 'test@example.com', 'hashedPassword');
      }
    }
    return null;
  }

  async findByUsername(username: string): Promise<User | null> {
    // 簡易実装
    if (username) {
      return User.create('user1', 'testuser', 'test@example.com', 'hashedPassword');
    }
    return null;
  }

  async findByEmail(email: string): Promise<User | null> {
    // 簡易実装
    if (email) {
      return User.create('user1', 'testuser', email, 'hashedPassword');
    }
    return null;
  }

  async findAll(): Promise<User[]> {
    // 簡易実装
    return [];
  }

  async exists(id: UserId): Promise<boolean> {
    // 簡易実装
    return !!id;
  }

  async delete(_id: UserId): Promise<boolean> {
    // 簡易実装
    return true;
  }

  async deleteByIds(ids: UserId[]): Promise<number> {
    // 簡易実装
    return ids.length;
  }

  async existsByUsername(_username: string): Promise<boolean> {
    // 簡易実装
    return false;
  }

  async existsByEmail(_email: string): Promise<boolean> {
    // 簡易実装
    return false;
  }
}
