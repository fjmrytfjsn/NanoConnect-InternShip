import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Fab,
  Container,
} from '@mui/material';
import { Add, Refresh } from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '@/store';
import {
  fetchPresentationsStart,
  fetchPresentationsSuccess,
  fetchPresentationsFailure,
  removePresentation,
} from '@/store/slices/presentationSlice';
import { PresentationList } from '@/components/presenter/PresentationList/PresentationList';
import { Presentation } from '@/types/common';

// サンプルデータ（後でAPI呼び出しに置き換え）
const mockPresentations: Presentation[] = [
  {
    id: 1,
    title: 'React基礎講座',
    description: 'Reactの基本概念とコンポーネント開発について学ぶためのプレゼンテーションです。',
    accessCode: 'ABC123',
    isActive: true,
    creatorId: 1,
    slideCount: 15,
    currentSlideIndex: 0,
    status: 'active',
    createdAt: '2024-01-10T09:00:00.000Z',
    updatedAt: '2024-01-15T14:30:00.000Z',
  },
  {
    id: 2,
    title: 'TypeScript入門',
    description: 'TypeScriptの型システムと実践的な使い方を解説します。',
    accessCode: 'DEF456',
    isActive: false,
    creatorId: 1,
    slideCount: 22,
    currentSlideIndex: 0,
    status: 'draft',
    createdAt: '2024-01-08T10:15:00.000Z',
    updatedAt: '2024-01-12T16:45:00.000Z',
  },
  {
    id: 3,
    title: 'UIデザインの基本',
    description: 'ユーザーインターフェースデザインの基本原則とMaterial-UIの活用方法について。',
    accessCode: 'GHI789',
    isActive: false,
    creatorId: 1,
    slideCount: 18,
    currentSlideIndex: 0,
    status: 'ended',
    createdAt: '2024-01-05T11:20:00.000Z',
    updatedAt: '2024-01-06T15:00:00.000Z',
  },
];

export const PresenterDashboard: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { presentations, isLoading, error } = useSelector(
    (state: RootState) => state.presentation
  );
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [presentationToDelete, setPresentationToDelete] = useState<number | null>(null);
  const [presentationToDeleteTitle, setPresentationToDeleteTitle] = useState<string>('');

  // コンポーネントマウント時にプレゼンテーション一覧を読み込み
  useEffect(() => {
    loadPresentations();
  }, []);

  const loadPresentations = async () => {
    try {
      dispatch(fetchPresentationsStart());
      // TODO: 実際のAPI呼び出しに置き換え
      await new Promise(resolve => setTimeout(resolve, 1000)); // ローディング状態を表示するため
      dispatch(fetchPresentationsSuccess(mockPresentations));
    } catch (error) {
      dispatch(fetchPresentationsFailure('プレゼンテーション一覧の読み込みに失敗しました'));
    }
  };

  const handleCreateNew = () => {
    navigate('/presenter/presentations/new');
  };

  const handleEdit = (id: number) => {
    navigate(`/presenter/presentations/${id}/edit`);
  };

  const handleDelete = (id: number) => {
    const presentation = presentations.find(p => p.id === id);
    if (presentation) {
      setPresentationToDelete(id);
      setPresentationToDeleteTitle(presentation.title);
      setDeleteDialogOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (presentationToDelete) {
      try {
        // TODO: 実際のAPI呼び出しに置き換え
        await new Promise(resolve => setTimeout(resolve, 500));
        dispatch(removePresentation(presentationToDelete));
      } catch (error) {
        console.error('削除に失敗しました:', error);
        // TODO: エラーハンドリング
      }
    }
    setDeleteDialogOpen(false);
    setPresentationToDelete(null);
    setPresentationToDeleteTitle('');
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setPresentationToDelete(null);
    setPresentationToDeleteTitle('');
  };

  const handlePreview = (id: number) => {
    navigate(`/presenter/presentations/${id}/preview`);
  };

  const handleRefresh = () => {
    loadPresentations();
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 3 }}>
        {/* ヘッダー */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 4,
          }}
        >
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              プレゼンテーション管理
            </Typography>
            <Typography variant="body1" color="text.secondary">
              プレゼンテーションの作成・編集・管理を行います
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={handleRefresh}
              disabled={isLoading}
            >
              更新
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleCreateNew}
              size="large"
            >
              新規作成
            </Button>
          </Box>
        </Box>

        {/* プレゼンテーション一覧 */}
        <PresentationList
          onEdit={handleEdit}
          onDelete={handleDelete}
          onPreview={handlePreview}
        />

        {/* フローティングアクションボタン（モバイル用） */}
        <Fab
          color="primary"
          aria-label="新規作成"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            display: { xs: 'flex', sm: 'none' },
          }}
          onClick={handleCreateNew}
        >
          <Add />
        </Fab>

        {/* 削除確認ダイアログ */}
        <Dialog
          open={deleteDialogOpen}
          onClose={handleCancelDelete}
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-description"
        >
          <DialogTitle id="delete-dialog-title">
            プレゼンテーションの削除
          </DialogTitle>
          <DialogContent>
            <DialogContentText id="delete-dialog-description">
              「{presentationToDeleteTitle}」を削除してもよろしいですか？
              <br />
              この操作は取り消すことができません。
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCancelDelete} color="primary">
              キャンセル
            </Button>
            <Button
              onClick={handleConfirmDelete}
              color="error"
              variant="contained"
              autoFocus
            >
              削除
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};