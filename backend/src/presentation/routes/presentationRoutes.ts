/**
 * プレゼンテーションルーティング
 * プレゼンテーション関連のAPIエンドポイント定義
 */

import { Router } from 'express';
import { PresentationController } from '../controllers/PresentationController';
import { authenticateToken } from '../middlewares/authMiddleware';

export function createPresentationRoutes(presentationController: PresentationController): Router {
  const router = Router();

  // 全てのルートで認証を要求
  router.use(authenticateToken);

  // プレゼンテーション一覧取得
  router.get('/', (req, res) => presentationController.getPresentations(req, res));

  // 特定プレゼンテーション取得
  router.get('/:id', (req, res) => presentationController.getPresentation(req, res));

  // プレゼンテーション新規作成
  router.post('/', (req, res) => presentationController.createPresentation(req, res));

  // プレゼンテーション更新
  router.put('/:id', (req, res) => presentationController.updatePresentation(req, res));

  // プレゼンテーション削除
  router.delete('/:id', (req, res) => presentationController.deletePresentation(req, res));

  return router;
}