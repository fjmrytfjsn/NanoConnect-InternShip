// API関連の定数
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// APIエンドポイント
export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
  },
  presentations: {
    list: '/presentations',
    create: '/presentations',
    detail: (id: number) => `/presentations/${id}`,
    update: (id: number) => `/presentations/${id}`,
    delete: (id: number) => `/presentations/${id}`,
  },
  slides: {
    list: (presentationId: number) => `/presentations/${presentationId}/slides`,
    create: (presentationId: number) =>
      `/presentations/${presentationId}/slides`,
    detail: (presentationId: number, slideId: number) =>
      `/presentations/${presentationId}/slides/${slideId}`,
    update: (presentationId: number, slideId: number) =>
      `/presentations/${presentationId}/slides/${slideId}`,
    delete: (presentationId: number, slideId: number) =>
      `/presentations/${presentationId}/slides/${slideId}`,
  },
} as const;
