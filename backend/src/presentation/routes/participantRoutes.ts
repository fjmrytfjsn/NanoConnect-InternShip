/**
 * 参加者ルーティング
 * プレゼンテーション参加関連のAPIエンドポイント定義
 */

import { Router, Request, Response } from 'express';
import { ParticipantController } from '../controllers/ParticipantController';

export function createParticipantRoutes(participantController: ParticipantController): Router {
  const router = Router();

  // プレゼンテーション参加（認証不要）
  router.post('/join', (req: Request, res: Response) =>
    participantController.joinPresentation(req, res)
  );

  // アクセスコードによるプレゼンテーション情報取得（認証不要）
  router.get('/presentations/code/:accessCode', (req: Request, res: Response) =>
    participantController.getPresentationByAccessCode(req, res)
  );

  return router;
}