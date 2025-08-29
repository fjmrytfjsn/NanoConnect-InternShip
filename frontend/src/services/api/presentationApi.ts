/**
 * プレゼンテーション関連API
 * プレゼンテーションのCRUD操作、状態管理、参加者管理
 */

import { api } from './baseApi';
import { API_ENDPOINTS } from '../../constants/api';
import {
  CreatePresentationRequest,
  CreatePresentationResponse,
  UpdatePresentationRequest,
  UpdatePresentationResponse,
  DeletePresentationResponse,
  GetPresentationResponse,
  GetPresentationsResponse,
  PresentationInfo,
  JoinPresentationRequest,
  JoinPresentationResponse,
  AnalyticsResponse,
} from '../../../../shared/types/api';
import { ApiResponse, PaginatedResponse } from '../../../../shared/types/common';

/**
 * プレゼンテーション一覧取得オプション
 */
export interface GetPresentationsOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'draft' | 'active' | 'ended' | 'all';
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'status';
  sortOrder?: 'asc' | 'desc';
}

/**
 * プレゼンテーション関連のAPIクライアント
 */
export class PresentationApi {
  /**
   * プレゼンテーション一覧取得
   */
  async getAll(options: GetPresentationsOptions = {}): Promise<GetPresentationsResponse> {
    const params = new URLSearchParams();
    
    if (options.page) params.append('page', options.page.toString());
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.search) params.append('search', options.search);
    if (options.status && options.status !== 'all') params.append('status', options.status);
    if (options.sortBy) params.append('sortBy', options.sortBy);
    if (options.sortOrder) params.append('sortOrder', options.sortOrder);

    const queryString = params.toString();
    const url = queryString ? `${API_ENDPOINTS.presentations.list}?${queryString}` : API_ENDPOINTS.presentations.list;

    return api.get<GetPresentationsResponse>(url);
  }

  /**
   * ページネーション付きプレゼンテーション一覧取得
   */
  async getPaginated(options: GetPresentationsOptions = {}): Promise<PaginatedResponse<PresentationInfo>> {
    const params = new URLSearchParams();
    
    // デフォルト値の設定
    const page = options.page || 1;
    const limit = options.limit || 10;
    
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (options.search) params.append('search', options.search);
    if (options.status && options.status !== 'all') params.append('status', options.status);
    if (options.sortBy) params.append('sortBy', options.sortBy);
    if (options.sortOrder) params.append('sortOrder', options.sortOrder);

    const url = `${API_ENDPOINTS.presentations.list}/paginated?${params.toString()}`;
    return api.get<PaginatedResponse<PresentationInfo>>(url);
  }

  /**
   * プレゼンテーション詳細取得
   */
  async getById(id: number): Promise<GetPresentationResponse> {
    return api.get<GetPresentationResponse>(API_ENDPOINTS.presentations.detail(id));
  }

  /**
   * プレゼンテーション作成
   */
  async create(data: CreatePresentationRequest): Promise<CreatePresentationResponse> {
    return api.post<CreatePresentationResponse, CreatePresentationRequest>(
      API_ENDPOINTS.presentations.create,
      data
    );
  }

  /**
   * プレゼンテーション更新
   */
  async update(id: number, data: UpdatePresentationRequest): Promise<UpdatePresentationResponse> {
    return api.put<UpdatePresentationResponse, UpdatePresentationRequest>(
      API_ENDPOINTS.presentations.update(id),
      data
    );
  }

  /**
   * プレゼンテーション部分更新
   */
  async patch(id: number, data: Partial<UpdatePresentationRequest>): Promise<UpdatePresentationResponse> {
    return api.patch<UpdatePresentationResponse, Partial<UpdatePresentationRequest>>(
      API_ENDPOINTS.presentations.update(id),
      data
    );
  }

  /**
   * プレゼンテーション削除
   */
  async delete(id: number): Promise<DeletePresentationResponse> {
    return api.delete<DeletePresentationResponse>(API_ENDPOINTS.presentations.delete(id));
  }

  /**
   * プレゼンテーション開始
   */
  async start(id: number): Promise<ApiResponse<{ started: boolean; currentSlideIndex: number }>> {
    return api.post<ApiResponse<{ started: boolean; currentSlideIndex: number }>>(
      `${API_ENDPOINTS.presentations.detail(id)}/start`
    );
  }

  /**
   * プレゼンテーション停止
   */
  async stop(id: number): Promise<ApiResponse<{ stopped: boolean }>> {
    return api.post<ApiResponse<{ stopped: boolean }>>(
      `${API_ENDPOINTS.presentations.detail(id)}/stop`
    );
  }

  /**
   * 現在のスライドを変更
   */
  async changeSlide(id: number, slideIndex: number): Promise<ApiResponse<{ slideIndex: number }>> {
    return api.post<ApiResponse<{ slideIndex: number }>>(
      `${API_ENDPOINTS.presentations.detail(id)}/slide`,
      { slideIndex }
    );
  }

  /**
   * 次のスライドに移動
   */
  async nextSlide(id: number): Promise<ApiResponse<{ slideIndex: number; hasNext: boolean }>> {
    return api.post<ApiResponse<{ slideIndex: number; hasNext: boolean }>>(
      `${API_ENDPOINTS.presentations.detail(id)}/next-slide`
    );
  }

  /**
   * 前のスライドに移動
   */
  async previousSlide(id: number): Promise<ApiResponse<{ slideIndex: number; hasPrevious: boolean }>> {
    return api.post<ApiResponse<{ slideIndex: number; hasPrevious: boolean }>>(
      `${API_ENDPOINTS.presentations.detail(id)}/previous-slide`
    );
  }

  /**
   * プレゼンテーションに参加（参加者向け）
   */
  async join(data: JoinPresentationRequest): Promise<JoinPresentationResponse> {
    return api.post<JoinPresentationResponse, JoinPresentationRequest>(
      '/presentations/join',
      data
    );
  }

  /**
   * プレゼンテーションの分析データ取得
   */
  async getAnalytics(id: number): Promise<AnalyticsResponse> {
    return api.get<AnalyticsResponse>(`${API_ENDPOINTS.presentations.detail(id)}/analytics`);
  }

  /**
   * プレゼンテーションの参加者一覧取得
   */
  async getParticipants(id: number): Promise<ApiResponse<{ 
    participants: Array<{ sessionId: string; name: string; joinedAt: string; isActive: boolean }>;
    activeCount: number;
    totalCount: number;
  }>> {
    return api.get<ApiResponse<{ 
      participants: Array<{ sessionId: string; name: string; joinedAt: string; isActive: boolean }>;
      activeCount: number;
      totalCount: number;
    }>>(`${API_ENDPOINTS.presentations.detail(id)}/participants`);
  }

  /**
   * プレゼンテーションの複製
   */
  async duplicate(id: number, newTitle?: string): Promise<CreatePresentationResponse> {
    return api.post<CreatePresentationResponse>(
      `${API_ENDPOINTS.presentations.detail(id)}/duplicate`,
      { title: newTitle }
    );
  }

  /**
   * プレゼンテーションのアーカイブ
   */
  async archive(id: number): Promise<ApiResponse<{ archived: boolean }>> {
    return api.post<ApiResponse<{ archived: boolean }>>(
      `${API_ENDPOINTS.presentations.detail(id)}/archive`
    );
  }

  /**
   * プレゼンテーションの公開設定変更
   */
  async setPublic(id: number, isPublic: boolean): Promise<ApiResponse<{ isPublic: boolean }>> {
    return api.patch<ApiResponse<{ isPublic: boolean }>>(
      API_ENDPOINTS.presentations.update(id),
      { isPublic }
    );
  }

  /**
   * プレゼンテーションのアクセスコード再生成
   */
  async regenerateAccessCode(id: number): Promise<ApiResponse<{ accessCode: string }>> {
    return api.post<ApiResponse<{ accessCode: string }>>(
      `${API_ENDPOINTS.presentations.detail(id)}/regenerate-access-code`
    );
  }

  /**
   * プレゼンテーションのリアルタイム統計取得
   */
  async getRealTimeStats(id: number): Promise<ApiResponse<{
    activeParticipants: number;
    totalResponses: number;
    currentSlide: {
      index: number;
      title: string;
      responseCount: number;
    };
    recentActivity: Array<{
      type: 'join' | 'leave' | 'response';
      participantName: string;
      timestamp: string;
    }>;
  }>> {
    return api.get<ApiResponse<{
      activeParticipants: number;
      totalResponses: number;
      currentSlide: {
        index: number;
        title: string;
        responseCount: number;
      };
      recentActivity: Array<{
        type: 'join' | 'leave' | 'response';
        participantName: string;
        timestamp: string;
      }>;
    }>>(`${API_ENDPOINTS.presentations.detail(id)}/realtime-stats`);
  }

  /**
   * プレゼンテーション検索（高度な検索機能）
   */
  async search(query: string, filters?: {
    tags?: string[];
    dateFrom?: string;
    dateTo?: string;
    minParticipants?: number;
    maxParticipants?: number;
  }): Promise<GetPresentationsResponse> {
    const params = new URLSearchParams();
    params.append('q', query);
    
    if (filters?.tags) {
      filters.tags.forEach(tag => params.append('tags', tag));
    }
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    if (filters?.minParticipants) params.append('minParticipants', filters.minParticipants.toString());
    if (filters?.maxParticipants) params.append('maxParticipants', filters.maxParticipants.toString());

    return api.get<GetPresentationsResponse>(`${API_ENDPOINTS.presentations.list}/search?${params.toString()}`);
  }

  /**
   * プレゼンテーションのエクスポート
   */
  async exportData(id: number, format: 'json' | 'csv' | 'pdf' = 'json'): Promise<Blob> {
    const response = await fetch(`${API_ENDPOINTS.presentations.detail(id)}/export?format=${format}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('nanoconnect_auth_token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('エクスポートに失敗しました');
    }

    return response.blob();
  }

  /**
   * プレゼンテーションのバックアップ
   */
  async backup(id: number): Promise<ApiResponse<{ backupId: string; downloadUrl: string }>> {
    return api.post<ApiResponse<{ backupId: string; downloadUrl: string }>>(
      `${API_ENDPOINTS.presentations.detail(id)}/backup`
    );
  }

  /**
   * バックアップからのリストア
   */
  async restore(backupId: string): Promise<CreatePresentationResponse> {
    return api.post<CreatePresentationResponse>(
      '/presentations/restore',
      { backupId }
    );
  }
}

// デフォルトインスタンス
export const presentationApi = new PresentationApi();