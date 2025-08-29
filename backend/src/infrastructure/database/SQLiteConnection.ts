/**
 * SQLiteデータベース接続
 * better-sqlite3を使用したデータベース接続とマイグレーション
 */

import Database from 'better-sqlite3';
import { databaseConfig } from '@/config/database';
import path from 'path';
import fs from 'fs';

export class SQLiteConnection {
  private static _instance: SQLiteConnection;
  private _database: Database.Database;

  /**
   * コンストラクタ（テスト用パスを指定可能）
   */
  constructor(databasePath?: string) {
    if (databasePath) {
      // テスト用のインメモリデータベース
      this._database = new Database(databasePath);
      this._database.pragma('foreign_keys = ON');
      console.log(`📦 SQLiteデータベースに接続しました: ${databasePath}`);
    } else {
      // 通常のデータベース
      this.ensureDatabaseDirectory();
      this._database = new Database(databaseConfig.path, databaseConfig.options);
      this._database.pragma('journal_mode = WAL');
      this._database.pragma('synchronous = NORMAL');
      this._database.pragma('cache_size = 1000');
      this._database.pragma('foreign_keys = ON');
      console.log(`📦 SQLiteデータベースに接続しました: ${databaseConfig.path}`);
    }
  }

  /**
   * シングルトンインスタンスの取得
   */
  public static getInstance(): SQLiteConnection {
    if (!SQLiteConnection._instance) {
      SQLiteConnection._instance = new SQLiteConnection();
    }
    return SQLiteConnection._instance;
  }

  /**
   * データベースインスタンスの取得
   */
  public get database(): Database.Database {
    return this._database;
  }

  /**
   * データベースインスタンスの取得
   */
  public getDatabase(): Database.Database {
    return this._database;
  }

  /**
   * データベースディレクトリの作成
   */
  private ensureDatabaseDirectory(): void {
    const dbPath = databaseConfig.path;
    if (dbPath !== ':memory:' && !dbPath.includes('?mode=memory')) {
      const dbDir = path.dirname(dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
        console.log(`📁 データベースディレクトリを作成しました: ${dbDir}`);
      }
    }
  }

  /**
   * マイグレーション実行
   */
  public async runMigrations(): Promise<void> {
    const migrationsDir = path.join(__dirname, 'migrations');

    // マイグレーション管理テーブルの作成
    this.createMigrationsTable();

    if (!fs.existsSync(migrationsDir)) {
      console.log('⚠️ マイグレーションディレクトリが存在しません');
      return;
    }

    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    for (const file of migrationFiles) {
      const migrationName = file.replace('.sql', '');

      // 既に実行済みかチェック
      const existing = this._database
        .prepare('SELECT name FROM migrations WHERE name = ?')
        .get(migrationName);

      if (existing) {
        continue;
      }

      console.log(`🔄 マイグレーション実行中: ${migrationName}`);

      const migrationSql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

      try {
        // トランザクション内でマイグレーションを実行
        const transaction = this._database.transaction(() => {
          this._database.exec(migrationSql);
          this._database
            .prepare('INSERT INTO migrations (name, executed_at) VALUES (?, ?)')
            .run(migrationName, new Date().toISOString());
        });

        transaction();
        console.log(`✅ マイグレーション完了: ${migrationName}`);
      } catch (error) {
        console.error(`❌ マイグレーション失敗: ${migrationName}`, error);
        throw error;
      }
    }
  }

  /**
   * マイグレーション管理テーブルの作成
   */
  private createMigrationsTable(): void {
    const sql = `
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        executed_at TEXT NOT NULL
      )
    `;
    this._database.exec(sql);
  }

  /**
   * データベースの初期化（開発・テスト用）
   */
  public async initialize(): Promise<void> {
    console.log('🔧 データベースを初期化しています...');
    await this.runMigrations();
    console.log('✅ データベースの初期化が完了しました');
  }

  /**
   * データベース接続のクローズ
   */
  public close(): void {
    if (this._database) {
      this._database.close();
      console.log('📦 SQLiteデータベース接続を閉じました');
    }
  }

  /**
   * トランザクション実行
   */
  public executeTransaction<T>(operation: () => T): T {
    const transaction = this._database.transaction(operation);
    return transaction();
  }

  /**
   * 健全性チェック
   */
  public healthCheck(): { status: 'healthy' | 'error'; message: string } {
    try {
      this._database.prepare('SELECT 1').get();
      return { status: 'healthy', message: 'Database connection is healthy' };
    } catch (error) {
      return {
        status: 'error',
        message: `Database connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}
