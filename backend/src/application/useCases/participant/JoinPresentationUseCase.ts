/**
 * プレゼンテーション参加ユースケース
 * 参加者がアクセスコードを使ってプレゼンテーションに参加する機能を提供
 */

import { IPresentationRepository } from '@/domain/repositories/IPresentationRepository';
import { AccessCode } from '@/domain/valueObjects/AccessCode';
import { SessionId } from '@/domain/valueObjects/SessionId';
import {
  JoinPresentationRequestDto,
  JoinPresentationResponseDto,
} from '../../dtos/participant/JoinPresentationDto';

export class JoinPresentationUseCase {
  constructor(private readonly presentationRepository: IPresentationRepository) {}

  async execute(request: JoinPresentationRequestDto): Promise<JoinPresentationResponseDto> {
    try {
      // アクセスコードの検証
      const accessCode = AccessCode.from(request.accessCode);

      // アクセスコードでプレゼンテーションを検索
      const presentation = await this.presentationRepository.findByAccessCode(
        accessCode.toString()
      );

      if (!presentation) {
        return {
          success: false,
          sessionId: '',
          presentation: {
            id: '',
            title: '',
            isActive: false,
            currentSlideIndex: 0,
          },
          message: 'アクセスコードが無効です。正しいコードを入力してください。',
        };
      }

      // プレゼンテーションがアクティブかチェック
      if (!presentation.isActive) {
        return {
          success: false,
          sessionId: '',
          presentation: {
            id: presentation.id,
            title: presentation.title,
            description: presentation.description,
            isActive: false,
            currentSlideIndex: presentation.currentSlideIndex,
          },
          message: 'このプレゼンテーションは現在アクティブではありません。',
        };
      }

      // アクセスコードの有効期限チェック
      if (!presentation.isAccessCodeValid()) {
        const remainingMinutes = presentation.getAccessCodeRemainingMinutes();
        const message =
          remainingMinutes === 0
            ? 'アクセスコードの有効期限が切れています。'
            : 'アクセスコードの有効期限が切れています。新しいコードを取得してください。';

        return {
          success: false,
          sessionId: '',
          presentation: {
            id: presentation.id,
            title: presentation.title,
            description: presentation.description,
            isActive: presentation.isActive,
            currentSlideIndex: presentation.currentSlideIndex,
          },
          message,
        };
      }

      // セッションIDを生成
      const sessionId = SessionId.generate();

      // 成功レスポンス
      return {
        success: true,
        sessionId: sessionId.toString(),
        presentation: {
          id: presentation.id,
          title: presentation.title,
          description: presentation.description,
          isActive: presentation.isActive,
          currentSlideIndex: presentation.currentSlideIndex,
        },
        message: 'プレゼンテーションに正常に参加しました。',
      };
    } catch (error) {
      // エラーハンドリング
      return {
        success: false,
        sessionId: '',
        presentation: {
          id: '',
          title: '',
          isActive: false,
          currentSlideIndex: 0,
        },
        message:
          error instanceof Error
            ? error.message
            : 'プレゼンテーションへの参加中にエラーが発生しました。',
      };
    }
  }
}
