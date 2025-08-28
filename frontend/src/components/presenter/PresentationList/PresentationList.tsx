import React, { useMemo } from 'react';
import {
  Box,
  Grid,
  Typography,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  ToggleButtonGroup,
  ToggleButton,
  Fade,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Search, ViewModule, ViewList, Sort } from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import {
  setViewMode,
  setSearchQuery,
  setSortBy,
  setSortOrder,
  setStatusFilter,
} from '@/store/slices/presentationSlice';
import { PresentationCard } from '../PresentationCard/PresentationCard';
import { ViewMode, SortOption, PresentationStatus } from '@/types/common';

interface PresentationListProps {
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  onPreview?: (id: number) => void;
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'updatedAt', label: '更新日時' },
  { value: 'createdAt', label: '作成日時' },
  { value: 'title', label: 'タイトル' },
  { value: 'status', label: 'ステータス' },
];

const statusFilterOptions: {
  value: PresentationStatus | 'all';
  label: string;
}[] = [
  { value: 'all', label: 'すべて' },
  { value: 'draft', label: '下書き' },
  { value: 'active', label: '公開中' },
  { value: 'ended', label: '終了' },
];

export const PresentationList: React.FC<PresentationListProps> = ({
  onEdit,
  onDelete,
  onPreview,
}) => {
  const dispatch = useDispatch();
  const {
    presentations,
    isLoading,
    error,
    viewMode,
    searchQuery,
    sortBy,
    sortOrder,
    statusFilter,
  } = useSelector((state: RootState) => state.presentation);

  // フィルタリングとソートされたプレゼンテーション一覧
  const filteredAndSortedPresentations = useMemo(() => {
    let filtered = presentations;

    // 検索フィルタ
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (presentation) =>
          presentation.title.toLowerCase().includes(query) ||
          presentation.description.toLowerCase().includes(query) ||
          presentation.accessCode.toLowerCase().includes(query)
      );
    }

    // ステータスフィルタ
    if (statusFilter !== 'all') {
      filtered = filtered.filter(
        (presentation) => presentation.status === statusFilter
      );
    }

    // ソート
    const sorted = [...filtered].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
        default:
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [presentations, searchQuery, statusFilter, sortBy, sortOrder]);

  const handleViewModeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newViewMode: ViewMode | null
  ) => {
    if (newViewMode !== null) {
      dispatch(setViewMode(newViewMode));
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setSearchQuery(event.target.value));
  };

  const handleSortByChange = (event: SelectChangeEvent<SortOption>) => {
    dispatch(setSortBy(event.target.value as SortOption));
  };

  const handleSortOrderToggle = () => {
    dispatch(setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'));
  };

  const handleStatusFilterChange = (
    event: SelectChangeEvent<PresentationStatus | 'all'>
  ) => {
    dispatch(setStatusFilter(event.target.value as PresentationStatus | 'all'));
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 200,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        エラーが発生しました: {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* フィルタ・ソート・表示モード切替バー */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          mb: 3,
          alignItems: { xs: 'stretch', sm: 'center' },
        }}
      >
        {/* 検索ボックス */}
        <TextField
          placeholder="プレゼンテーションを検索..."
          value={searchQuery}
          onChange={handleSearchChange}
          size="small"
          sx={{ flexGrow: 1, minWidth: 200 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />

        {/* ステータスフィルタ */}
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="status-filter-label">ステータス</InputLabel>
          <Select
            labelId="status-filter-label"
            value={statusFilter}
            onChange={handleStatusFilterChange}
            label="ステータス"
          >
            {statusFilterOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* ソートオプション */}
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="sort-by-label">並び替え</InputLabel>
          <Select
            labelId="sort-by-label"
            value={sortBy}
            onChange={handleSortByChange}
            label="並び替え"
          >
            {sortOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* ソート順序切替ボタン */}
        <ToggleButton
          value={sortOrder}
          selected={sortOrder === 'desc'}
          onChange={handleSortOrderToggle}
          size="small"
          aria-label="ソート順序"
        >
          <Sort
            sx={{
              transform: sortOrder === 'desc' ? 'rotate(180deg)' : 'none',
            }}
          />
        </ToggleButton>

        {/* 表示モード切替 */}
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={handleViewModeChange}
          size="small"
          aria-label="表示モード"
        >
          <ToggleButton value="grid" aria-label="グリッド表示">
            <ViewModule />
          </ToggleButton>
          <ToggleButton value="list" aria-label="リスト表示">
            <ViewList />
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* プレゼンテーション一覧 */}
      {filteredAndSortedPresentations.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 200,
            textAlign: 'center',
          }}
        >
          <Typography variant="h6" color="text.secondary" gutterBottom>
            プレゼンテーションが見つかりません
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {searchQuery.trim() || statusFilter !== 'all'
              ? '検索条件を変更してもう一度お試しください'
              : '新しいプレゼンテーションを作成してみましょう'}
          </Typography>
        </Box>
      ) : (
        <Fade in={true} timeout={300}>
          <Box>
            {viewMode === 'grid' ? (
              <Grid container spacing={3}>
                {filteredAndSortedPresentations.map((presentation) => (
                  <Grid item xs={12} sm={6} md={4} key={presentation.id}>
                    <PresentationCard
                      presentation={presentation}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onPreview={onPreview}
                      isListView={false}
                    />
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box>
                {filteredAndSortedPresentations.map((presentation) => (
                  <PresentationCard
                    key={presentation.id}
                    presentation={presentation}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onPreview={onPreview}
                    isListView={true}
                  />
                ))}
              </Box>
            )}
          </Box>
        </Fade>
      )}
    </Box>
  );
};
