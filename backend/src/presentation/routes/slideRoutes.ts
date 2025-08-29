/**
 * スライドのルーティング設定
 * API仕様に基づいたスライドCRUDエンドポイントの定義
 */

import { Router } from 'express';
import { SlideController } from '@/presentation/controllers/SlideController';
import { CreateSlideUseCase } from '@/application/useCases/slide/CreateSlideUseCase';
import { GetSlideUseCase } from '@/application/useCases/slide/GetSlideUseCase';
import { UpdateSlideUseCase } from '@/application/useCases/slide/UpdateSlideUseCase';
import { DeleteSlideUseCase } from '@/application/useCases/slide/DeleteSlideUseCase';
import { ReorderSlidesUseCase } from '@/application/useCases/slide/ReorderSlidesUseCase';
import { SQLiteSlideRepository } from '@/infrastructure/database/repositories/SQLiteSlideRepository';
import { SQLitePresentationRepository } from '@/infrastructure/database/repositories/SQLitePresentationRepository';
import { SQLiteConnection } from '@/infrastructure/database/SQLiteConnection';

// ルーター作成
export const slideRoutes = Router();

// データベース接続の取得
const dbConnection = SQLiteConnection.getInstance();

// リポジトリのインスタンス化
const slideRepository = new SQLiteSlideRepository(dbConnection);
const presentationRepository = new SQLitePresentationRepository(dbConnection);

// ユースケースのインスタンス化
const createSlideUseCase = new CreateSlideUseCase(slideRepository, presentationRepository);
const getSlideUseCase = new GetSlideUseCase(slideRepository, presentationRepository);
const updateSlideUseCase = new UpdateSlideUseCase(slideRepository, presentationRepository);
const deleteSlideUseCase = new DeleteSlideUseCase(slideRepository, presentationRepository);
const reorderSlidesUseCase = new ReorderSlidesUseCase(slideRepository, presentationRepository);

// コントローラーのインスタンス化
const slideController = new SlideController(
  createSlideUseCase,
  getSlideUseCase,
  updateSlideUseCase,
  deleteSlideUseCase,
  reorderSlidesUseCase
);

// ルート定義
// プレゼンテーション関連のスライド操作
slideRoutes.get('/presentations/:presentationId/slides', slideController.getSlidesByPresentation);
slideRoutes.post('/presentations/:presentationId/slides', slideController.createSlide);
slideRoutes.patch('/presentations/:presentationId/slides/reorder', slideController.reorderSlides);

// 個別スライド操作
slideRoutes.get('/slides/:id', slideController.getSlideById);
slideRoutes.put('/slides/:id', slideController.updateSlide);
slideRoutes.delete('/slides/:id', slideController.deleteSlide);
