/**
 * セキュリティミドルウェア
 * 不正アクセス検知とIP制限機能を提供
 */

import { Request, Response, NextFunction } from 'express';

interface SecurityOptions {
  blockedIPs?: string[];
  allowedIPs?: string[];
  maxSuspiciousAttempts?: number;
  suspiciousWindowMs?: number;
}

interface SuspiciousActivity {
  count: number;
  resetTime: number;
  blocked: boolean;
}

class SecurityManager {
  private suspiciousActivities: { [ip: string]: SuspiciousActivity } = {};
  private options: SecurityOptions;

  constructor(options: SecurityOptions = {}) {
    this.options = {
      maxSuspiciousAttempts: 10,
      suspiciousWindowMs: 30 * 60 * 1000, // 30分
      ...options,
    };

    // クリーンアップを定期実行
    setInterval(() => this.cleanup(), this.options.suspiciousWindowMs! / 2);
  }

  private cleanup(): void {
    const now = Date.now();
    Object.keys(this.suspiciousActivities).forEach(ip => {
      const activity = this.suspiciousActivities[ip];
      if (activity.resetTime < now && !activity.blocked) {
        delete this.suspiciousActivities[ip];
      }
    });
  }

  private getClientIP(req: Request): string {
    // X-Forwarded-For, X-Real-IP, などのヘッダーも考慮
    const forwarded = req.headers['x-forwarded-for'] as string;
    const realIP = req.headers['x-real-ip'] as string;
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    if (realIP) {
      return realIP;
    }
    
    return req.ip || req.connection.remoteAddress || 'unknown';
  }

  public isIPBlocked(req: Request): boolean {
    const ip = this.getClientIP(req);

    // 明示的にブロックされたIPの確認
    if (this.options.blockedIPs?.includes(ip)) {
      return true;
    }

    // 許可リストがある場合、そこに含まれていない場合はブロック
    if (this.options.allowedIPs && this.options.allowedIPs.length > 0) {
      return !this.options.allowedIPs.includes(ip);
    }

    // 疑わしい活動によるブロック確認
    const activity = this.suspiciousActivities[ip];
    return activity?.blocked || false;
  }

  public recordSuspiciousActivity(req: Request): void {
    const ip = this.getClientIP(req);
    const now = Date.now();
    
    if (!this.suspiciousActivities[ip]) {
      this.suspiciousActivities[ip] = {
        count: 1,
        resetTime: now + this.options.suspiciousWindowMs!,
        blocked: false,
      };
    } else {
      const activity = this.suspiciousActivities[ip];
      
      if (activity.resetTime < now) {
        // リセット時間を過ぎている場合、カウンターをリセット
        activity.count = 1;
        activity.resetTime = now + this.options.suspiciousWindowMs!;
        activity.blocked = false;
      } else {
        activity.count++;
        
        // 制限を超えた場合ブロック
        if (activity.count >= this.options.maxSuspiciousAttempts!) {
          activity.blocked = true;
          console.warn(`🚫 疑わしい活動により IP ${ip} をブロックしました (${activity.count}回の試行)`);
        }
      }
    }
  }

  public getSuspiciousActivityInfo(req: Request): SuspiciousActivity | null {
    const ip = this.getClientIP(req);
    return this.suspiciousActivities[ip] || null;
  }
}

// グローバルセキュリティマネージャー
const securityManager = new SecurityManager();

/**
 * IP制限チェックミドルウェア
 */
export function ipRestrictionMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (securityManager.isIPBlocked(req)) {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    console.warn(`🚫 ブロックされたIPからのアクセス: ${ip}`);
    
    res.status(403).json({
      success: false,
      message: 'アクセスが拒否されました。',
      error: 'FORBIDDEN',
    });
    return;
  }

  next();
}

/**
 * 疑わしい活動の記録（失敗時に使用）
 */
export function recordFailedAttempt(req: Request): void {
  securityManager.recordSuspiciousActivity(req);
}

/**
 * 疑わしい活動の検知ミドルウェア
 */
export function suspiciousActivityMiddleware(req: Request, res: Response, next: NextFunction): void {
  const info = securityManager.getSuspiciousActivityInfo(req);
  
  if (info?.blocked) {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    console.warn(`🚫 ブロック済みIPからのアクセス: ${ip}`);
    
    res.status(403).json({
      success: false,
      message: '疑わしい活動が検出されたため、一時的にアクセスを制限しています。',
      error: 'SUSPICIOUS_ACTIVITY',
    });
    return;
  }

  next();
}

/**
 * 基本的なセキュリティヘッダー設定
 */
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction): void {
  // セキュリティヘッダーの設定
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // API用なのでキャッシュを無効化
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  next();
}