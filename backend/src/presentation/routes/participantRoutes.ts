/**
 * 参加者ルーティング
 * プレゼンテーション参加関連のAPIエンドポイント定義
 */

import { Router, Request, Response } from 'express';
import { ParticipantController } from '../controllers/ParticipantController';
import { accessCodeRateLimit } from '../middlewares/rateLimitMiddleware';
import {
  ipRestrictionMiddleware,
  suspiciousActivityMiddleware,
  securityHeadersMiddleware,
} from '../middlewares/securityMiddleware';

export function createParticipantRoutes(participantController: ParticipantController): Router {
  const router = Router();

  // 全てのルートにセキュリティミドルウェアを適用
  router.use(securityHeadersMiddleware);
  router.use(ipRestrictionMiddleware);
  router.use(suspiciousActivityMiddleware);

  // プレゼンテーション参加（認証不要、レート制限あり）
  router.post('/join', accessCodeRateLimit, (req: Request, res: Response) =>
    participantController.joinPresentation(req, res)
  );

  // アクセスコードによるプレゼンテーション情報取得（認証不要、レート制限あり）
  router.get(
    '/presentations/code/:accessCode',
    accessCodeRateLimit,
    (req: Request, res: Response) => participantController.getPresentationByAccessCode(req, res)
  );

  return router;
}
