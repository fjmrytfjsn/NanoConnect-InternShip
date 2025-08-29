import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  PresentationState,
  Presentation,
  ViewMode,
  SortOption,
  SortOrder,
  PresentationStatus,
} from '@/types/common';

const initialState: PresentationState = {
  presentations: [],
  isLoading: false,
  error: null,
  viewMode: 'grid',
  searchQuery: '',
  sortBy: 'updatedAt',
  sortOrder: 'desc',
  statusFilter: 'all',
};

const presentationSlice = createSlice({
  name: 'presentation',
  initialState,
  reducers: {
    // 読み込み状態の管理
    fetchPresentationsStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchPresentationsSuccess: (
      state,
      action: PayloadAction<Presentation[]>
    ) => {
      state.isLoading = false;
      state.presentations = action.payload;
      state.error = null;
    },
    fetchPresentationsFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },

    // プレゼンテーション操作
    addPresentation: (state, action: PayloadAction<Presentation>) => {
      state.presentations.unshift(action.payload);
    },
    updatePresentation: (state, action: PayloadAction<Presentation>) => {
      const index = state.presentations.findIndex(
        (p) => p.id === action.payload.id
      );
      if (index !== -1) {
        state.presentations[index] = action.payload;
      }
    },
    removePresentation: (state, action: PayloadAction<number>) => {
      state.presentations = state.presentations.filter(
        (p) => p.id !== action.payload
      );
    },

    // UI状態の管理
    setViewMode: (state, action: PayloadAction<ViewMode>) => {
      state.viewMode = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setSortBy: (state, action: PayloadAction<SortOption>) => {
      state.sortBy = action.payload;
    },
    setSortOrder: (state, action: PayloadAction<SortOrder>) => {
      state.sortOrder = action.payload;
    },
    setStatusFilter: (
      state,
      action: PayloadAction<PresentationStatus | 'all'>
    ) => {
      state.statusFilter = action.payload;
    },

    // エラー状態のクリア
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  fetchPresentationsStart,
  fetchPresentationsSuccess,
  fetchPresentationsFailure,
  addPresentation,
  updatePresentation,
  removePresentation,
  setViewMode,
  setSearchQuery,
  setSortBy,
  setSortOrder,
  setStatusFilter,
  clearError,
} = presentationSlice.actions;

export default presentationSlice.reducer;
