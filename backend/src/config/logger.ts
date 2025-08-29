import winston from 'winston';
import { config } from './app';

// ログレベルの定義
const logLevel = config.nodeEnv === 'production' ? 'info' : 'debug';

// ログフォーマットの設定
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Winstonロガーの設定
export const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  transports: [
    // コンソール出力
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  ],
  // 未キャッチ例外とPromise rejectionのハンドリング
  exitOnError: false,
});

// 本番環境以外では詳細ログを出力
if (config.nodeEnv !== 'production') {
  logger.debug('🚀 Logger initialized', {
    level: logLevel,
    environment: config.nodeEnv,
  });
}
