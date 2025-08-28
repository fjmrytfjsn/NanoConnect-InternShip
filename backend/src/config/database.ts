/**
 * データベース設定
 * SQLiteデータベースの接続設定
 */

import { config } from './app';
import type { DatabaseConfig } from '@/types/common';

export const databaseConfig: DatabaseConfig = {
  path: config.database.path,
  options: {
    verbose: config.database.verbose ? console.log : undefined,
    fileMustExist: false, // ファイルが存在しない場合は作成
    timeout: 5000, // 5秒のタイムアウト
    readonly: false,
  },
};

// WebContainer環境での制約
export const webContainerConfig = {
  database: {
    path: config.database.path,
    options: {
      verbose: config.nodeEnv === 'development' ? console.log : undefined,
      // WebContainer環境ではファイル作成が制限される場合があるため
      fileMustExist: false,
    }
  },
  server: {
    port: config.port,
    cors: {
      origin: [
        'https://stackblitz.com',
        'https://codesandbox.io',
        ...config.cors.origin
      ],
      credentials: true
    }
  },
  cache: {
    ttl: 3600000, // 1 hour
    maxSize: 1000
  }
};