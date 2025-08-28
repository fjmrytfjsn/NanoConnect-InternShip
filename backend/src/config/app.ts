/**
 * アプリケーション設定
 * 環境変数とデフォルト値の定義
 */

import dotenv from 'dotenv';
import path from 'path';

// 環境変数の読み込み
dotenv.config();

// 設定型定義
export interface AppConfig {
  port: number;
  nodeEnv: string;
  database: {
    path: string;
    verbose: boolean;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  bcrypt: {
    rounds: number;
  };
  cors: {
    origin: string[];
    credentials: boolean;
  };
  logging: {
    level: string;
    format: string;
  };
  session: {
    maxAge: number; // セッションの有効期限（ミリ秒）
    cleanupInterval: number; // セッションクリーンアップ間隔（ミリ秒）
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
}

// デフォルト設定
const defaultConfig: AppConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    path: process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'nanoconnect.db'),
    verbose: process.env.NODE_ENV === 'development',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'nanoconnect-default-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  },
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://stackblitz.com',
      'https://codesandbox.io'
    ],
    credentials: true,
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined',
  },
  session: {
    maxAge: parseInt(process.env.SESSION_MAX_AGE || '3600000', 10), // 1時間
    cleanupInterval: parseInt(process.env.SESSION_CLEANUP_INTERVAL || '300000', 10), // 5分
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15分
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
};

// 設定の検証
function validateConfig(config: AppConfig): void {
  if (!config.jwt.secret || config.jwt.secret.length < 32) {
    console.warn('JWT_SECRET が設定されていないか短すぎます。本番環境では強力な秘密鍵を使用してください。');
  }
  
  if (config.nodeEnv === 'production' && config.database.verbose) {
    console.warn('本番環境でデータベースのverboseモードが有効になっています。');
  }
  
  if (config.bcrypt.rounds < 10 && config.nodeEnv === 'production') {
    console.warn('本番環境でbcryptのラウンド数が少なすぎます。セキュリティリスクがあります。');
  }
}

// 設定をエクスポート
export const config = defaultConfig;

// 設定の検証を実行
validateConfig(config);

// 開発環境でのログ出力
if (config.nodeEnv === 'development') {
  console.log('🔧 アプリケーション設定:', {
    port: config.port,
    nodeEnv: config.nodeEnv,
    databasePath: config.database.path,
    jwtExpiresIn: config.jwt.expiresIn,
    corsOrigins: config.cors.origin,
  });
}