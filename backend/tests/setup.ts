/**
 * Jest テスト環境セットアップ
 * テスト実行前に実行される設定
 */

// テスト環境でのログレベルを設定
process.env.LOG_LEVEL = 'error';

// テスト用データベース設定
process.env.DATABASE_PATH = ':memory:';
process.env.NODE_ENV = 'test';

// その他のテスト環境変数
process.env.JWT_SECRET = 'test-secret-key';
process.env.BCRYPT_ROUNDS = '4'; // テストでは軽量化

// グローバルなテストタイムアウト設定
jest.setTimeout(10000);