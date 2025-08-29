/**
 * レート制限ミドルウェア
 * アクセスコード検証のためのレート制限を実装
 * 総当たり攻撃を防止する
 */

import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

interface RateLimitOptions {
  windowMs: number; // 時間ウィンドウ（ミリ秒）
  maxRequests: number; // 最大リクエスト数
  keyGenerator?: (req: Request) => string; // キー生成関数
  skipOnSuccess?: boolean; // 成功時にカウントをスキップするか
}

class RateLimiter {
  private store: RateLimitStore = {};
  private options: RateLimitOptions;

  constructor(options: RateLimitOptions) {
    this.options = {
      ...options,
      windowMs: options.windowMs || 15 * 60 * 1000, // デフォルト15分
      maxRequests: options.maxRequests || 5, // デフォルト5回
      keyGenerator: options.keyGenerator || ((req) => req.ip || req.connection.remoteAddress || 'unknown'),
    };

    // 期限切れエントリのクリーンアップを定期実行
    setInterval(() => this.cleanup(), this.options.windowMs);
  }

  private cleanup(): void {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    });
  }

  private getKey(req: Request): string {
    return this.options.keyGenerator!(req);
  }

  public isAllowed(req: Request): boolean {
    const key = this.getKey(req);
    const now = Date.now();
    const entry = this.store[key];

    if (!entry || entry.resetTime < now) {
      // 新しいエントリまたは期限切れ
      this.store[key] = {
        count: 1,
        resetTime: now + this.options.windowMs,
      };
      return true;
    }

    if (entry.count >= this.options.maxRequests) {
      return false; // 制限に達している
    }

    entry.count++;
    return true;
  }

  public getRemainingTime(req: Request): number {
    const key = this.getKey(req);
    const entry = this.store[key];
    
    if (!entry) {
      return 0;
    }

    return Math.max(0, entry.resetTime - Date.now());
  }

  public getCurrentCount(req: Request): number {
    const key = this.getKey(req);
    const entry = this.store[key];
    
    return entry?.count || 0;
  }
}

// アクセスコード検証用のレート制限
const accessCodeRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15分間
  maxRequests: 5, // 5回まで
  keyGenerator: (req) => {
    // IPアドレス + アクセスコードの組み合わせでキーを生成
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const accessCode = req.body?.accessCode || req.params?.accessCode || '';
    return `${ip}:${accessCode}`;
  },
});

// レート制限ミドルウェア関数
export function createRateLimitMiddleware(limiter: RateLimiter) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!limiter.isAllowed(req)) {
      const remainingTime = Math.ceil(limiter.getRemainingTime(req) / 1000 / 60); // 分に変換
      const currentCount = limiter.getCurrentCount(req);

      res.status(429).json({
        success: false,
        message: `アクセス回数が上限に達しました。${remainingTime}分後に再試行してください。`,
        error: 'TOO_MANY_REQUESTS',
        retryAfter: remainingTime,
        currentCount,
        maxRequests: limiter['options'].maxRequests,
      });
      return;
    }

    next();
  };
}

// アクセスコード検証用レート制限ミドルウェア
export const accessCodeRateLimit = createRateLimitMiddleware(accessCodeRateLimiter);