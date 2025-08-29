/**
 * アクセスコード情報取得ユースケース
 * アクセスコードからプレゼンテーション情報を取得する機能を提供
 */

import { IPresentationRepository } from '@/domain/repositories/IPresentationRepository';
import { AccessCode } from '@/domain/valueObjects/AccessCode';
import { AccessCodeInfoResponseDto } from '../../dtos/participant/AccessCodeInfoDto';

export class GetPresentationByAccessCodeUseCase {
  constructor(private readonly presentationRepository: IPresentationRepository) {}

  async execute(accessCodeStr: string): Promise<AccessCodeInfoResponseDto> {
    try {
      // アクセスコードの検証
      const accessCode = AccessCode.from(accessCodeStr);

      // アクセスコードでプレゼンテーションを検索
      const presentation = await this.presentationRepository.findByAccessCode(
        accessCode.toString()
      );

      if (!presentation) {
        return {
          success: false,
          accessCode: accessCodeStr,
          presentation: {
            id: '',
            title: '',
            isActive: false,
            currentSlideIndex: 0,
          },
          message: 'アクセスコードが無効です。正しいコードを入力してください。',
        };
      }

      // プレゼンテーション統計情報を取得
      const statistics = await this.presentationRepository.getStatistics(presentation.id);

      // アクセスコードの有効期限情報を取得
      const remainingMinutes = presentation.getAccessCodeRemainingMinutes();
      const isExpired = !presentation.isAccessCodeValid();

      // 成功レスポンス（有効期限切れでも情報は返す）
      return {
        success: !isExpired, // 有効期限切れの場合はfalse
        accessCode: accessCode.toDisplayFormat(),
        presentation: {
          id: presentation.id,
          title: presentation.title,
          description: presentation.description,
          isActive: presentation.isActive,
          currentSlideIndex: presentation.currentSlideIndex,
          totalSlides: statistics?.totalSlides || 0,
          participantCount: statistics?.totalParticipants || 0,
        },
        message: isExpired
          ? 'アクセスコードの有効期限が切れています。'
          : remainingMinutes !== null
            ? `アクセスコードの有効期限まで約${remainingMinutes}分です。`
            : undefined,
      };
    } catch (error) {
      // エラーハンドリング
      return {
        success: false,
        accessCode: accessCodeStr,
        presentation: {
          id: '',
          title: '',
          isActive: false,
          currentSlideIndex: 0,
        },
        message:
          error instanceof Error
            ? error.message
            : 'アクセスコード情報の取得中にエラーが発生しました。',
      };
    }
  }
}
