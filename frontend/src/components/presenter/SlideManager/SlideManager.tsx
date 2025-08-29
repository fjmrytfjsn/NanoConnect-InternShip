/**
 * スライド管理メインコンポーネント
 * プレゼンテーション内のスライド一覧表示と順序管理機能を提供
 */

import { useState, useCallback, memo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Toolbar,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Alert,
  Snackbar,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Add as AddIcon,
  ViewList as ListViewIcon,
  ViewModule as GridViewIcon,
  Sort as SortIcon,
  MoreVert as MoreIcon,
} from '@mui/icons-material';
import { SlideManagerProps, SlideOrderUpdate, SlideAction } from './types';
import { SlideSortable } from './SlideSortable';

type ViewMode = 'list' | 'grid';
type SortMode = 'order' | 'title' | 'type' | 'created';

export const SlideManager = memo<SlideManagerProps>(
  ({
    slides,
    onReorderSlides,
    onAddSlide,
    onEditSlide,
    onDuplicateSlide,
    onDeleteSlide,
    onChangeSlideType,
    loading = false,
    editable = true,
  }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [sortMode, setSortMode] = useState<SortMode>('order');
    const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
    const [snackbar, setSnackbar] = useState<{
      open: boolean;
      message: string;
      severity: 'success' | 'error' | 'info' | 'warning';
    }>({
      open: false,
      message: '',
      severity: 'info',
    });

    // スライド順序変更処理
    const handleReorderSlides = useCallback(
      async (slideOrders: SlideOrderUpdate[]) => {
        try {
          await onReorderSlides(slideOrders);
          setSnackbar({
            open: true,
            message: 'スライドの順序を更新しました',
            severity: 'success',
          });
        } catch (error) {
          console.error('スライド順序変更エラー:', error);
          setSnackbar({
            open: true,
            message: 'スライドの順序更新に失敗しました',
            severity: 'error',
          });
        }
      },
      [onReorderSlides]
    );

    // スライドクリック処理
    const handleSlideClick = useCallback(
      (slideId: string) => {
        onEditSlide(slideId);
      },
      [onEditSlide]
    );

    // スライドアクション処理
    const handleSlideAction = useCallback(
      (action: SlideAction, slideId: string) => {
        switch (action) {
          case 'edit':
            onEditSlide(slideId);
            break;
          case 'duplicate':
            onDuplicateSlide(slideId);
            setSnackbar({
              open: true,
              message: 'スライドを複製しました',
              severity: 'success',
            });
            break;
          case 'delete':
            onDeleteSlide(slideId);
            setSnackbar({
              open: true,
              message: 'スライドを削除しました',
              severity: 'success',
            });
            break;
          case 'change-type-multiple-choice':
            onChangeSlideType(slideId, 'multiple_choice');
            setSnackbar({
              open: true,
              message: 'スライドタイプを多肢選択式に変更しました',
              severity: 'success',
            });
            break;
          case 'change-type-word-cloud':
            onChangeSlideType(slideId, 'word_cloud');
            setSnackbar({
              open: true,
              message: 'スライドタイプをワードクラウドに変更しました',
              severity: 'success',
            });
            break;
        }
      },
      [onEditSlide, onDuplicateSlide, onDeleteSlide, onChangeSlideType]
    );

    // 新規スライド追加
    const handleAddSlide = useCallback(() => {
      onAddSlide();
      setSnackbar({
        open: true,
        message: '新しいスライドを追加しました',
        severity: 'success',
      });
    }, [onAddSlide]);

    // ツールバーメニュー
    const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
      setMenuAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
      setMenuAnchorEl(null);
    };

    // スナックバーを閉じる
    const handleSnackbarClose = () => {
      setSnackbar((prev) => ({ ...prev, open: false }));
    };

    // ソートされたスライド一覧を取得
    const getSortedSlides = () => {
      const sortedSlides = [...slides];
      switch (sortMode) {
        case 'order':
          return sortedSlides.sort((a, b) => a.slideOrder - b.slideOrder);
        case 'title':
          return sortedSlides.sort((a, b) =>
            (a.title || '').localeCompare(b.title || '')
          );
        case 'type':
          return sortedSlides.sort((a, b) => a.type.localeCompare(b.type));
        case 'created':
          return sortedSlides.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        default:
          return sortedSlides;
      }
    };

    const sortedSlides = getSortedSlides();

    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* ツールバー */}
        <Paper
          elevation={1}
          sx={{
            borderRadius: 0,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Toolbar variant={isMobile ? 'dense' : 'regular'}>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              スライド管理
              <Typography
                component="span"
                variant="body2"
                color="text.secondary"
                sx={{ ml: 1 }}
              >
                ({slides.length}枚)
              </Typography>
            </Typography>

            {/* 表示モード切り替え */}
            {!isMobile && (
              <Box sx={{ display: 'flex', mr: 1 }}>
                <Tooltip title="リスト表示">
                  <IconButton
                    color={viewMode === 'list' ? 'primary' : 'default'}
                    onClick={() => setViewMode('list')}
                    size="small"
                  >
                    <ListViewIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="グリッド表示">
                  <IconButton
                    color={viewMode === 'grid' ? 'primary' : 'default'}
                    onClick={() => setViewMode('grid')}
                    size="small"
                    disabled // 将来実装予定
                  >
                    <GridViewIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            )}

            {/* 新規スライド追加ボタン */}
            {editable && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddSlide}
                size={isMobile ? 'small' : 'medium'}
                sx={{ mr: 1 }}
              >
                {isMobile ? '追加' : '新しいスライド'}
              </Button>
            )}

            {/* その他のアクションメニュー */}
            <Tooltip title="その他のアクション">
              <IconButton onClick={handleMenuClick}>
                <MoreIcon />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </Paper>

        {/* メニュー */}
        <Menu
          anchorEl={menuAnchorEl}
          open={Boolean(menuAnchorEl)}
          onClose={handleMenuClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem
            onClick={() => {
              setSortMode('order');
              handleMenuClose();
            }}
          >
            <ListItemIcon>
              <SortIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>順序でソート</ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() => {
              setSortMode('title');
              handleMenuClose();
            }}
          >
            <ListItemIcon>
              <SortIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>タイトルでソート</ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() => {
              setSortMode('type');
              handleMenuClose();
            }}
          >
            <ListItemIcon>
              <SortIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>タイプでソート</ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() => {
              setSortMode('created');
              handleMenuClose();
            }}
          >
            <ListItemIcon>
              <SortIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>作成日でソート</ListItemText>
          </MenuItem>
        </Menu>

        {/* スライド一覧 */}
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          {loading && (
            <Alert severity="info" sx={{ m: 2 }}>
              スライドを読み込み中...
            </Alert>
          )}

          <SlideSortable
            slides={sortedSlides}
            onReorder={handleReorderSlides}
            onSlideClick={handleSlideClick}
            onSlideAction={handleSlideAction}
            loading={loading}
            editable={editable && sortMode === 'order'} // 順序ソート時のみ並び替え可能
          />
        </Box>

        {/* スナックバー */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={handleSnackbarClose}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    );
  }
);

SlideManager.displayName = 'SlideManager';
