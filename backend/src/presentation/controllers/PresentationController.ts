/**
 * プレゼンテーションコントローラー
 * プレゼンテーション関連のHTTPリクエストを処理
 */

import { Request, Response } from 'express';
import { CreatePresentationUseCase } from '@/application/useCases/presentation/CreatePresentationUseCase';
import { GetPresentationUseCase } from '@/application/useCases/presentation/GetPresentationUseCase';
import { UpdatePresentationUseCase } from '@/application/useCases/presentation/UpdatePresentationUseCase';
import { DeletePresentationUseCase } from '@/application/useCases/presentation/DeletePresentationUseCase';
import { ListPresentationsUseCase } from '@/application/useCases/presentation/ListPresentationsUseCase';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { CreatePresentationDto } from '@/application/dtos/presentation/CreatePresentationDto';
import { UpdatePresentationDto } from '@/application/dtos/presentation/UpdatePresentationDto';

export class PresentationController {
  constructor(
    private readonly createPresentationUseCase: CreatePresentationUseCase,
    private readonly getPresentationUseCase: GetPresentationUseCase,
    private readonly updatePresentationUseCase: UpdatePresentationUseCase,
    private readonly deletePresentationUseCase: DeletePresentationUseCase,
    private readonly listPresentationsUseCase: ListPresentationsUseCase
  ) {}

  /**
   * プレゼンテーション新規作成
   * POST /api/presentations
   */
  async createPresentation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { title, description } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: '認証が必要です',
        });
        return;
      }

      if (!title || typeof title !== 'string') {
        res.status(400).json({
          success: false,
          error: 'タイトルは必須です',
        });
        return;
      }

      const createDto: CreatePresentationDto = {
        title: title.trim(),
        description: description?.trim(),
        presenterId: userId,
      };

      const result = await this.createPresentationUseCase.execute(createDto);

      res.status(201).json({
        success: true,
        data: result,
        message: 'プレゼンテーションが正常に作成されました',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '不明なエラーが発生しました';
      res.status(400).json({
        success: false,
        error: message,
      });
    }
  }

  /**
   * プレゼンテーション一覧取得
   * GET /api/presentations
   */
  async getPresentations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: '認証が必要です',
        });
        return;
      }

      const result = await this.listPresentationsUseCase.execute(userId);

      res.status(200).json({
        success: true,
        data: result.presentations,
        message: 'プレゼンテーション一覧を正常に取得しました',
        meta: {
          total: result.total,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '不明なエラーが発生しました';
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  }

  /**
   * 特定プレゼンテーション取得
   * GET /api/presentations/:id
   */
  async getPresentation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const presentationId = req.params.id;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: '認証が必要です',
        });
        return;
      }

      if (!presentationId) {
        res.status(400).json({
          success: false,
          error: 'プレゼンテーションIDが必要です',
        });
        return;
      }

      const result = await this.getPresentationUseCase.execute(presentationId, userId);

      res.status(200).json({
        success: true,
        data: result,
        message: 'プレゼンテーション情報を正常に取得しました',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '不明なエラーが発生しました';

      // エラーメッセージに基づいて適切なステータスコードを設定
      if (message.includes('見つかりません')) {
        res.status(404).json({
          success: false,
          error: message,
        });
      } else if (message.includes('権限がありません')) {
        res.status(403).json({
          success: false,
          error: message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: message,
        });
      }
    }
  }

  /**
   * プレゼンテーション更新
   * PUT /api/presentations/:id
   */
  async updatePresentation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const presentationId = req.params.id;
      const { title, description } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: '認証が必要です',
        });
        return;
      }

      if (!presentationId) {
        res.status(400).json({
          success: false,
          error: 'プレゼンテーションIDが必要です',
        });
        return;
      }

      const updateDto: UpdatePresentationDto = {
        title: title?.trim(),
        description: description?.trim(),
      };

      const result = await this.updatePresentationUseCase.execute(
        presentationId,
        userId,
        updateDto
      );

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '不明なエラーが発生しました';

      // エラーメッセージに基づいて適切なステータスコードを設定
      if (message.includes('見つかりません')) {
        res.status(404).json({
          success: false,
          error: message,
        });
      } else if (message.includes('権限がありません')) {
        res.status(403).json({
          success: false,
          error: message,
        });
      } else {
        res.status(400).json({
          success: false,
          error: message,
        });
      }
    }
  }

  /**
   * プレゼンテーション削除
   * DELETE /api/presentations/:id
   */
  async deletePresentation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const presentationId = req.params.id;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: '認証が必要です',
        });
        return;
      }

      if (!presentationId) {
        res.status(400).json({
          success: false,
          error: 'プレゼンテーションIDが必要です',
        });
        return;
      }

      const result = await this.deletePresentationUseCase.execute(presentationId, userId);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '不明なエラーが発生しました';

      // エラーメッセージに基づいて適切なステータスコードを設定
      if (message.includes('見つかりません')) {
        res.status(404).json({
          success: false,
          error: message,
        });
      } else if (message.includes('権限がありません')) {
        res.status(403).json({
          success: false,
          error: message,
        });
      } else if (message.includes('削除できません')) {
        res.status(400).json({
          success: false,
          error: message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: message,
        });
      }
    }
  }
}
