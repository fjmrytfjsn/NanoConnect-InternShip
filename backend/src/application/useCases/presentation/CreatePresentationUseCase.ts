/**
 * プレゼンテーション作成ユースケース
 * 新規プレゼンテーションの作成を担当
 */

import { Presentation } from '@/domain/entities/Presentation';
import { AccessCode } from '@/domain/valueObjects/AccessCode';
import { IPresentationRepository } from '@/domain/repositories/IPresentationRepository';
import { IUserRepository } from '@/domain/repositories/IUserRepository';
import { CreatePresentationDto, CreatePresentationResponseDto } from '../../dtos/presentation/CreatePresentationDto';
import { PresentationId } from '@/types/common';

export class CreatePresentationUseCase {
  constructor(
    private readonly presentationRepository: IPresentationRepository,
    private readonly userRepository: IUserRepository
  ) {}

  async execute(request: CreatePresentationDto): Promise<CreatePresentationResponseDto> {
    // プレゼンターの存在確認
    const presenter = await this.userRepository.findById(request.presenterId);
    if (!presenter) {
      throw new Error('プレゼンターが見つかりません');
    }

    // ユニークなアクセスコードを生成
    let accessCode: AccessCode;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      if (attempts >= maxAttempts) {
        throw new Error('アクセスコードの生成に失敗しました。後でもう一度お試しください');
      }
      accessCode = AccessCode.generate();
      attempts++;
    } while (await this.presentationRepository.existsByAccessCode(accessCode.toString()));

    // プレゼンテーション作成
    const presentationId = this.generatePresentationId();
    const presentation = Presentation.create(
      presentationId,
      request.title,
      request.presenterId,
      accessCode.toString(),
      request.description
    );

    // 保存
    const savedPresentation = await this.presentationRepository.save(presentation);

    // レスポンス作成
    return {
      id: savedPresentation.id,
      title: savedPresentation.title,
      description: savedPresentation.description,
      presenterId: savedPresentation.presenterId,
      accessCode: savedPresentation.accessCode,
      isActive: savedPresentation.isActive,
      currentSlideIndex: savedPresentation.currentSlideIndex,
      createdAt: savedPresentation.createdAt,
      updatedAt: savedPresentation.updatedAt
    };
  }

  private generatePresentationId(): PresentationId {
    return `pres_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}