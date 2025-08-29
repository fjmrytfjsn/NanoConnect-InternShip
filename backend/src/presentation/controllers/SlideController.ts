/**
 * スライドコントローラー
 * スライドCRUDとreorder操作のHTTPエンドポイントを提供
 */

import { Request, Response } from 'express';
import { CreateSlideUseCase } from '@/application/useCases/slide/CreateSlideUseCase';
import { GetSlideUseCase } from '@/application/useCases/slide/GetSlideUseCase';
import { UpdateSlideUseCase } from '@/application/useCases/slide/UpdateSlideUseCase';
import { DeleteSlideUseCase } from '@/application/useCases/slide/DeleteSlideUseCase';
import { ReorderSlidesUseCase } from '@/application/useCases/slide/ReorderSlidesUseCase';
import { CreateSlideRequestDto } from '@/application/dtos/slide/CreateSlideDto';
import { GetSlideRequestDto, GetSlidesRequestDto } from '@/application/dtos/slide/GetSlideDto';
import { UpdateSlideRequestDto } from '@/application/dtos/slide/UpdateSlideDto';
import { DeleteSlideRequestDto } from '@/application/dtos/slide/DeleteSlideDto';
import { ReorderSlidesRequestDto } from '@/application/dtos/slide/ReorderSlidesDto';

export class SlideController {
  constructor(
    private createSlideUseCase: CreateSlideUseCase,
    private getSlideUseCase: GetSlideUseCase,
    private updateSlideUseCase: UpdateSlideUseCase,
    private deleteSlideUseCase: DeleteSlideUseCase,
    private reorderSlidesUseCase: ReorderSlidesUseCase
  ) {}

  /**
   * POST /api/presentations/:presentationId/slides
   * スライド新規作成
   */
  public createSlide = async (req: Request, res: Response): Promise<void> => {
    try {
      const { presentationId } = req.params;
      const { title, type, content, order } = req.body;

      // リクエストDTOの構築
      const requestDto: CreateSlideRequestDto = {
        presentationId,
        title,
        type,
        content,
        order: order ?? -1, // デフォルトは最後尾追加
      };

      // バリデーション
      const validation = this.validateCreateSlideRequest(requestDto);
      if (!validation.valid) {
        res.status(400).json({
          success: false,
          message: validation.message,
        });
        return;
      }

      // ユースケース実行
      const result = await this.createSlideUseCase.execute(requestDto);

      const statusCode = result.success ? 201 : 400;
      res.status(statusCode).json(result);
    } catch (error) {
      console.error('スライド作成エラー:', error);
      res.status(500).json({
        success: false,
        message: '内部サーバーエラーが発生しました',
      });
    }
  };

  /**
   * GET /api/presentations/:presentationId/slides
   * プレゼンテーション内のスライド一覧取得
   */
  public getSlidesByPresentation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { presentationId } = req.params;

      const requestDto: GetSlidesRequestDto = { presentationId };

      const result = await this.getSlideUseCase.getSlidesByPresentationId(requestDto);

      const statusCode = result.success ? 200 : 404;
      res.status(statusCode).json(result);
    } catch (error) {
      console.error('スライド一覧取得エラー:', error);
      res.status(500).json({
        success: false,
        message: '内部サーバーエラーが発生しました',
      });
    }
  };

  /**
   * GET /api/slides/:id
   * 特定スライド取得
   */
  public getSlideById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const requestDto: GetSlideRequestDto = { slideId: id };

      const result = await this.getSlideUseCase.getSlideById(requestDto);

      const statusCode = result.success ? 200 : 404;
      res.status(statusCode).json(result);
    } catch (error) {
      console.error('スライド取得エラー:', error);
      res.status(500).json({
        success: false,
        message: '内部サーバーエラーが発生しました',
      });
    }
  };

  /**
   * PUT /api/slides/:id
   * スライド更新
   */
  public updateSlide = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { title, content, order } = req.body;

      const requestDto: UpdateSlideRequestDto = {
        slideId: id,
        ...(title && { title }),
        ...(content && { content }),
        ...(order !== undefined && { order }),
      };

      // 更新データが空でないかチェック
      if (!title && !content && order === undefined) {
        res.status(400).json({
          success: false,
          message: '更新するデータが指定されていません',
        });
        return;
      }

      const result = await this.updateSlideUseCase.execute(requestDto);

      const statusCode = result.success ? 200 : 400;
      res.status(statusCode).json(result);
    } catch (error) {
      console.error('スライド更新エラー:', error);
      res.status(500).json({
        success: false,
        message: '内部サーバーエラーが発生しました',
      });
    }
  };

  /**
   * DELETE /api/slides/:id
   * スライド削除
   */
  public deleteSlide = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const requestDto: DeleteSlideRequestDto = { slideId: id };

      const result = await this.deleteSlideUseCase.execute(requestDto);

      const statusCode = result.success ? 200 : 400;
      res.status(statusCode).json(result);
    } catch (error) {
      console.error('スライド削除エラー:', error);
      res.status(500).json({
        success: false,
        message: '内部サーバーエラーが発生しました',
      });
    }
  };

  /**
   * PATCH /api/presentations/:presentationId/slides/reorder
   * スライド順序変更
   */
  public reorderSlides = async (req: Request, res: Response): Promise<void> => {
    try {
      const { presentationId } = req.params;
      const { slideOrders } = req.body;

      // リクエストの基本バリデーション
      if (!Array.isArray(slideOrders)) {
        res.status(400).json({
          success: false,
          message: 'slideOrdersは配列である必要があります',
        });
        return;
      }

      const requestDto: ReorderSlidesRequestDto = {
        presentationId,
        slideOrders,
      };

      const result = await this.reorderSlidesUseCase.execute(requestDto);

      const statusCode = result.success ? 200 : 400;
      res.status(statusCode).json(result);
    } catch (error) {
      console.error('スライド順序変更エラー:', error);
      res.status(500).json({
        success: false,
        message: '内部サーバーエラーが発生しました',
      });
    }
  };

  /**
   * スライド作成リクエストのバリデーション
   */
  private validateCreateSlideRequest(request: CreateSlideRequestDto): {
    valid: boolean;
    message: string;
  } {
    if (!request.presentationId) {
      return { valid: false, message: 'presentationIdは必須です' };
    }

    if (!request.title || request.title.trim().length === 0) {
      return { valid: false, message: 'titleは必須です' };
    }

    if (!['multiple_choice', 'word_cloud'].includes(request.type)) {
      return {
        valid: false,
        message: 'typeは multiple_choice または word_cloud である必要があります',
      };
    }

    if (
      !request.content ||
      !request.content.question ||
      request.content.question.trim().length === 0
    ) {
      return { valid: false, message: 'content.questionは必須です' };
    }

    return { valid: true, message: '' };
  }
}
