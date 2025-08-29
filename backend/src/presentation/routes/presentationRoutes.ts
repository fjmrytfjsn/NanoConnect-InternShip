/**
 * プレゼンテーションルーティング
 * プレゼンテーション関連のAPIエンドポイント定義
 */

import { Router, Request, Response } from 'express';
import { PresentationController } from '../controllers/PresentationController';
import { authenticateToken, AuthenticatedRequest } from '../middlewares/authMiddleware';

export function createPresentationRoutes(presentationController: PresentationController): Router {
  const router = Router();

  // 全てのルートで認証を要求
  router.use(authenticateToken);

  // プレゼンテーション一覧取得
  router.get('/', (req: AuthenticatedRequest, res: Response) =>
    presentationController.getPresentations(req, res)
  );

  // 特定プレゼンテーション取得
  router.get('/:id', (req: AuthenticatedRequest, res: Response) =>
    presentationController.getPresentation(req, res)
  );

  // プレゼンテーション新規作成
  router.post('/', (req: AuthenticatedRequest, res: Response) =>
    presentationController.createPresentation(req, res)
  );

  // プレゼンテーション更新
  router.put('/:id', (req: AuthenticatedRequest, res: Response) =>
    presentationController.updatePresentation(req, res)
  );

  // プレゼンテーション削除
  router.delete('/:id', (req: AuthenticatedRequest, res: Response) =>
    presentationController.deletePresentation(req, res)
  );

  return router;
}
