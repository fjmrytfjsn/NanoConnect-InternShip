/**
 * 参加者コントローラー
 * プレゼンテーション参加関連のHTTPリクエストを処理
 */

import { Request, Response } from 'express';
import { JoinPresentationUseCase } from '@/application/useCases/participant/JoinPresentationUseCase';
import { GetPresentationByAccessCodeUseCase } from '@/application/useCases/participant/GetPresentationByAccessCodeUseCase';
import { JoinPresentationRequestDto } from '@/application/dtos/participant/JoinPresentationDto';
import { recordFailedAttempt } from '../middlewares/securityMiddleware';

export class ParticipantController {
  constructor(
    private readonly joinPresentationUseCase: JoinPresentationUseCase,
    private readonly getPresentationByAccessCodeUseCase: GetPresentationByAccessCodeUseCase
  ) {}

  /**
   * プレゼンテーションへの参加
   * POST /api/join
   */
  async joinPresentation(req: Request, res: Response): Promise<void> {
    try {
      const { accessCode } = req.body;

      if (!accessCode) {
        // 疑わしい活動として記録
        recordFailedAttempt(req);
        
        res.status(400).json({
          success: false,
          sessionId: '',
          presentation: {
            id: '',
            title: '',
            isActive: false,
            currentSlideIndex: 0,
          },
          message: 'アクセスコードは必須です。',
        });
        return;
      }

      // クライアントのIPアドレスを取得
      const clientIpAddress = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent');

      const joinRequest: JoinPresentationRequestDto = {
        accessCode,
        clientIpAddress,
        userAgent,
      };

      const result = await this.joinPresentationUseCase.execute(joinRequest);

      // 失敗時は疑わしい活動として記録
      if (!result.success) {
        recordFailedAttempt(req);
      }

      const statusCode = result.success ? 200 : 400;
      res.status(statusCode).json(result);

    } catch (error) {
      console.error('プレゼンテーション参加エラー:', error);
      
      // エラー時も疑わしい活動として記録
      recordFailedAttempt(req);
      
      res.status(500).json({
        success: false,
        sessionId: '',
        presentation: {
          id: '',
          title: '',
          isActive: false,
          currentSlideIndex: 0,
        },
        message: 'サーバーエラーが発生しました。',
      });
    }
  }

  /**
   * アクセスコードによるプレゼンテーション情報取得
   * GET /api/presentations/code/:accessCode
   */
  async getPresentationByAccessCode(req: Request, res: Response): Promise<void> {
    try {
      const { accessCode } = req.params;

      if (!accessCode) {
        // 疑わしい活動として記録
        recordFailedAttempt(req);
        
        res.status(400).json({
          success: false,
          accessCode: '',
          presentation: {
            id: '',
            title: '',
            isActive: false,
            currentSlideIndex: 0,
          },
          message: 'アクセスコードは必須です。',
        });
        return;
      }

      const result = await this.getPresentationByAccessCodeUseCase.execute(accessCode);

      // 失敗時は疑わしい活動として記録
      if (!result.success) {
        recordFailedAttempt(req);
      }

      const statusCode = result.success ? 200 : 404;
      res.status(statusCode).json(result);

    } catch (error) {
      console.error('アクセスコード情報取得エラー:', error);
      
      // エラー時も疑わしい活動として記録
      recordFailedAttempt(req);
      
      res.status(500).json({
        success: false,
        accessCode: req.params.accessCode || '',
        presentation: {
          id: '',
          title: '',
          isActive: false,
          currentSlideIndex: 0,
        },
        message: 'サーバーエラーが発生しました。',
      });
    }
  }
}