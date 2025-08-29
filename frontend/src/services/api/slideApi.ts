/**
 * スライド関連API
 * スライドのCRUD操作、順序変更、回答処理
 */

import { api } from './baseApi';
import { API_ENDPOINTS } from '../../constants/api';
import {
  CreateSlideRequest,
  CreateSlideResponse,
  UpdateSlideRequest,
  UpdateSlideResponse,
  DeleteSlideResponse,
  GetSlideResponse,
  GetSlidesResponse,
  SlideInfo,
  SlideContent,
  SubmitResponseRequest,
  SubmitResponseResponse,
  ResponseData,
} from '../../../../shared/types/api';
import { ApiResponse } from '../../../../shared/types/common';

/**
 * スライド並び替えのリクエスト型
 */
export interface ReorderSlidesRequest {
  slideIds: string[];
}

/**
 * スライド一覧取得オプション
 */
export interface GetSlidesOptions {
  sortBy?: 'order' | 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
  includeResponses?: boolean;
  includeAnalytics?: boolean;
}

/**
 * スライド関連のAPIクライアント
 */
export class SlideApi {
  /**
   * プレゼンテーション内のスライド一覧取得
   */
  async getAll(
    presentationId: number, 
    options: GetSlidesOptions = {}
  ): Promise<GetSlidesResponse> {
    const params = new URLSearchParams();
    
    if (options.sortBy) params.append('sortBy', options.sortBy);
    if (options.sortOrder) params.append('sortOrder', options.sortOrder);
    if (options.includeResponses) params.append('includeResponses', 'true');
    if (options.includeAnalytics) params.append('includeAnalytics', 'true');

    const queryString = params.toString();
    const url = queryString 
      ? `${API_ENDPOINTS.slides.list(presentationId)}?${queryString}` 
      : API_ENDPOINTS.slides.list(presentationId);

    return api.get<GetSlidesResponse>(url);
  }

  /**
   * スライド詳細取得
   */
  async getById(presentationId: number, slideId: number): Promise<GetSlideResponse> {
    return api.get<GetSlideResponse>(
      API_ENDPOINTS.slides.detail(presentationId, slideId)
    );
  }

  /**
   * スライド作成
   */
  async create(presentationId: number, data: Omit<CreateSlideRequest, 'presentationId'>): Promise<CreateSlideResponse> {
    const requestData: CreateSlideRequest = {
      ...data,
      presentationId: presentationId.toString(),
    };

    return api.post<CreateSlideResponse, CreateSlideRequest>(
      API_ENDPOINTS.slides.create(presentationId),
      requestData
    );
  }

  /**
   * スライド更新
   */
  async update(
    presentationId: number, 
    slideId: number, 
    data: UpdateSlideRequest
  ): Promise<UpdateSlideResponse> {
    return api.put<UpdateSlideResponse, UpdateSlideRequest>(
      API_ENDPOINTS.slides.update(presentationId, slideId),
      data
    );
  }

  /**
   * スライド部分更新
   */
  async patch(
    presentationId: number, 
    slideId: number, 
    data: Partial<UpdateSlideRequest>
  ): Promise<UpdateSlideResponse> {
    return api.patch<UpdateSlideResponse, Partial<UpdateSlideRequest>>(
      API_ENDPOINTS.slides.update(presentationId, slideId),
      data
    );
  }

  /**
   * スライド削除
   */
  async delete(presentationId: number, slideId: number): Promise<DeleteSlideResponse> {
    return api.delete<DeleteSlideResponse>(
      API_ENDPOINTS.slides.delete(presentationId, slideId)
    );
  }

  /**
   * スライド複製
   */
  async duplicate(
    presentationId: number, 
    slideId: number, 
    newTitle?: string
  ): Promise<CreateSlideResponse> {
    return api.post<CreateSlideResponse>(
      `${API_ENDPOINTS.slides.detail(presentationId, slideId)}/duplicate`,
      { title: newTitle }
    );
  }

  /**
   * スライド順序変更
   */
  async reorder(presentationId: number, slideIds: string[]): Promise<ApiResponse<{ reordered: boolean }>> {
    return api.post<ApiResponse<{ reordered: boolean }>, ReorderSlidesRequest>(
      `${API_ENDPOINTS.slides.list(presentationId)}/reorder`,
      { slideIds }
    );
  }

  /**
   * スライドの順序を一つ上に移動
   */
  async moveUp(presentationId: number, slideId: number): Promise<ApiResponse<{ moved: boolean; newOrder: number }>> {
    return api.post<ApiResponse<{ moved: boolean; newOrder: number }>>(
      `${API_ENDPOINTS.slides.detail(presentationId, slideId)}/move-up`
    );
  }

  /**
   * スライドの順序を一つ下に移動
   */
  async moveDown(presentationId: number, slideId: number): Promise<ApiResponse<{ moved: boolean; newOrder: number }>> {
    return api.post<ApiResponse<{ moved: boolean; newOrder: number }>>(
      `${API_ENDPOINTS.slides.detail(presentationId, slideId)}/move-down`
    );
  }

  /**
   * スライドコンテンツのプレビュー更新
   */
  async updateContent(
    presentationId: number, 
    slideId: number, 
    content: SlideContent
  ): Promise<ApiResponse<{ updated: boolean }>> {
    return api.patch<ApiResponse<{ updated: boolean }>, { content: SlideContent }>(
      API_ENDPOINTS.slides.update(presentationId, slideId),
      { content }
    );
  }

  /**
   * スライドへの回答送信（参加者向け）
   */
  async submitResponse(data: SubmitResponseRequest): Promise<SubmitResponseResponse> {
    return api.post<SubmitResponseResponse, SubmitResponseRequest>(
      '/slides/response',
      data
    );
  }

  /**
   * スライドの回答一覧取得
   */
  async getResponses(
    presentationId: number, 
    slideId: number
  ): Promise<ApiResponse<Array<{
    id: string;
    participantName: string;
    responseData: ResponseData;
    submittedAt: string;
    sessionId: string;
  }>>> {
    return api.get<ApiResponse<Array<{
      id: string;
      participantName: string;
      responseData: ResponseData;
      submittedAt: string;
      sessionId: string;
    }>>>(
      `${API_ENDPOINTS.slides.detail(presentationId, slideId)}/responses`
    );
  }

  /**
   * スライドの集計結果取得
   */
  async getAnalytics(
    presentationId: number, 
    slideId: number
  ): Promise<ApiResponse<{
    totalResponses: number;
    responseRate: number;
    data: {
      type: 'multiple_choice';
      optionCounts: { [option: string]: number };
      optionPercentages: { [option: string]: number };
    } | {
      type: 'word_cloud';
      wordFrequencies: { [word: string]: number };
      topWords: Array<{ word: string; count: number; percentage: number }>;
    };
    lastUpdated: string;
  }>> {
    return api.get<ApiResponse<{
      totalResponses: number;
      responseRate: number;
      data: {
        type: 'multiple_choice';
        optionCounts: { [option: string]: number };
        optionPercentages: { [option: string]: number };
      } | {
        type: 'word_cloud';
        wordFrequencies: { [word: string]: number };
        topWords: Array<{ word: string; count: number; percentage: number }>;
      };
      lastUpdated: string;
    }>>(
      `${API_ENDPOINTS.slides.detail(presentationId, slideId)}/analytics`
    );
  }

  /**
   * スライドのリアルタイム統計取得
   */
  async getRealTimeStats(
    presentationId: number, 
    slideId: number
  ): Promise<ApiResponse<{
    responseCount: number;
    lastResponseAt?: string;
    isActive: boolean;
    recentResponses: Array<{
      participantName: string;
      responseData: ResponseData;
      timestamp: string;
    }>;
  }>> {
    return api.get<ApiResponse<{
      responseCount: number;
      lastResponseAt?: string;
      isActive: boolean;
      recentResponses: Array<{
        participantName: string;
        responseData: ResponseData;
        timestamp: string;
      }>;
    }>>(
      `${API_ENDPOINTS.slides.detail(presentationId, slideId)}/realtime-stats`
    );
  }

  /**
   * スライドの結果公開/非公開切替
   */
  async toggleResultsVisibility(
    presentationId: number, 
    slideId: number, 
    showResults: boolean
  ): Promise<ApiResponse<{ showResults: boolean }>> {
    return api.patch<ApiResponse<{ showResults: boolean }>>(
      API_ENDPOINTS.slides.update(presentationId, slideId),
      { 
        content: { 
          settings: { 
            showResults 
          } 
        } 
      }
    );
  }

  /**
   * スライドの結果リセット
   */
  async resetResponses(
    presentationId: number, 
    slideId: number
  ): Promise<ApiResponse<{ reset: boolean; deletedCount: number }>> {
    return api.post<ApiResponse<{ reset: boolean; deletedCount: number }>>(
      `${API_ENDPOINTS.slides.detail(presentationId, slideId)}/reset-responses`
    );
  }

  /**
   * スライドテンプレートの取得
   */
  async getTemplates(type?: 'multiple_choice' | 'word_cloud'): Promise<ApiResponse<Array<{
    id: string;
    name: string;
    type: 'multiple_choice' | 'word_cloud';
    template: SlideContent;
    preview: string;
    tags: string[];
  }>>> {
    const params = type ? `?type=${type}` : '';
    return api.get<ApiResponse<Array<{
      id: string;
      name: string;
      type: 'multiple_choice' | 'word_cloud';
      template: SlideContent;
      preview: string;
      tags: string[];
    }>>>(`/slides/templates${params}`);
  }

  /**
   * スライドの自動保存
   */
  async autoSave(
    presentationId: number, 
    slideId: number, 
    data: Partial<UpdateSlideRequest>
  ): Promise<ApiResponse<{ saved: boolean; lastSavedAt: string }>> {
    return api.post<ApiResponse<{ saved: boolean; lastSavedAt: string }>>(
      `${API_ENDPOINTS.slides.detail(presentationId, slideId)}/auto-save`,
      data
    );
  }

  /**
   * スライドの変更履歴取得
   */
  async getHistory(
    presentationId: number, 
    slideId: number
  ): Promise<ApiResponse<Array<{
    id: string;
    action: 'create' | 'update' | 'delete';
    changes: Record<string, any>;
    timestamp: string;
    userId: string;
    username: string;
  }>>> {
    return api.get<ApiResponse<Array<{
      id: string;
      action: 'create' | 'update' | 'delete';
      changes: Record<string, any>;
      timestamp: string;
      userId: string;
      username: string;
    }>>>(
      `${API_ENDPOINTS.slides.detail(presentationId, slideId)}/history`
    );
  }

  /**
   * バルク操作：複数スライドの削除
   */
  async bulkDelete(
    presentationId: number, 
    slideIds: number[]
  ): Promise<ApiResponse<{ deleted: boolean; deletedCount: number }>> {
    return api.post<ApiResponse<{ deleted: boolean; deletedCount: number }>>(
      `${API_ENDPOINTS.slides.list(presentationId)}/bulk-delete`,
      { slideIds }
    );
  }

  /**
   * バルク操作：複数スライドの複製
   */
  async bulkDuplicate(
    presentationId: number, 
    slideIds: number[]
  ): Promise<ApiResponse<{ duplicated: boolean; newSlides: SlideInfo[] }>> {
    return api.post<ApiResponse<{ duplicated: boolean; newSlides: SlideInfo[] }>>(
      `${API_ENDPOINTS.slides.list(presentationId)}/bulk-duplicate`,
      { slideIds }
    );
  }

  /**
   * スライドデータのエクスポート
   */
  async exportSlide(
    presentationId: number, 
    slideId: number, 
    format: 'json' | 'csv' | 'png' = 'json'
  ): Promise<Blob> {
    const response = await fetch(
      `${API_ENDPOINTS.slides.detail(presentationId, slideId)}/export?format=${format}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('nanoconnect_auth_token')}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('スライドのエクスポートに失敗しました');
    }

    return response.blob();
  }

  /**
   * スライドのプレビュー画像生成
   */
  async generatePreview(
    presentationId: number, 
    slideId: number
  ): Promise<ApiResponse<{ previewUrl: string }>> {
    return api.post<ApiResponse<{ previewUrl: string }>>(
      `${API_ENDPOINTS.slides.detail(presentationId, slideId)}/generate-preview`
    );
  }
}

// デフォルトインスタンス
export const slideApi = new SlideApi();