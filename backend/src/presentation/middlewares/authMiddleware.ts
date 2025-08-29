/**
 * JWT認証ミドルウェア
 * APIエンドポイントへのアクセスを認証で保護
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserId } from '@/types/common';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: UserId;
    username: string;
  };
}

export interface JwtPayload {
  userId: UserId;
  username: string;
  iat?: number;
  exp?: number;
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'アクセストークンが提供されていません'
    });
    return;
  }

  // 本来はJWT_SECRETを環境変数から取得すべきですが、学習用として固定値を使用
  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = {
      userId: decoded.userId,
      username: decoded.username
    };
    next();
  } catch (error) {
    res.status(403).json({
      success: false,
      error: '無効なアクセストークンです'
    });
  }
}