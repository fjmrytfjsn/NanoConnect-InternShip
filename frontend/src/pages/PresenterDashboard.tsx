import React, { useEffect, useState, useCallback } from 'react';
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
  Grid,
  Card,
  CardContent,
  Alert,
  Divider,
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
import {
  RealtimeControls,
  ParticipantCounter,
  ConnectionStatus,
  RealtimeResults,
} from '@/components/presenter';
import { useSocket } from '@/hooks/useSocket';
import { useRealtimeConnection } from '@/hooks/useRealtimeConnection';
import { Presentation } from '@/types/common';

// サンプルデータ（後でAPI呼び出しに置き換え）
const mockPresentations: Presentation[] = [
  {
    id: 1,
    title: 'React基礎講座',
    description:
      'Reactの基本概念とコンポーネント開発について学ぶためのプレゼンテーションです。',
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
    description:
      'ユーザーインターフェースデザインの基本原則とMaterial-UIの活用方法について。',
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
  const { presentations, isLoading } = useSelector(
    (state: RootState) => state.presentation
  );

  // Socket.IOフックの利用
  const { connect, isConnected } = useSocket();
  const { connectionState, reconnectAttempts } = useRealtimeConnection();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [presentationToDelete, setPresentationToDelete] = useState<
    number | null
  >(null);
  const [presentationToDeleteTitle, setPresentationToDeleteTitle] =
    useState<string>('');

  // リアルタイム機能の状態
  const [selectedPresentation, setSelectedPresentation] =
    useState<Presentation | null>(null);
  const [showRealtimePanel, setShowRealtimePanel] = useState(false);

  const loadPresentations = useCallback(async () => {
    try {
      dispatch(fetchPresentationsStart());
      // TODO: 実際のAPI呼び出しに置き換え
      await new Promise((resolve) => setTimeout(resolve, 1000)); // ローディング状態を表示するため
      dispatch(fetchPresentationsSuccess(mockPresentations));
    } catch (error) {
      dispatch(
        fetchPresentationsFailure(
          'プレゼンテーション一覧の読み込みに失敗しました'
        )
      );
    }
  }, [dispatch]);

  // コンポーネントマウント時にプレゼンテーション一覧を読み込み
  useEffect(() => {
    loadPresentations();
    // Socket.IO接続を開始
    if (!isConnected) {
      connect();
    }
  }, [loadPresentations, connect, isConnected]);

  const handleCreateNew = () => {
    navigate('/presenter/presentations/new');
  };

  const handleEdit = (id: number) => {
    navigate(`/presenter/presentations/${id}/edit`);
  };

  const handleDelete = (id: number) => {
    const presentation = presentations.find((p) => p.id === id);
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
        await new Promise((resolve) => setTimeout(resolve, 500));
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

  const handleRefresh = () => {
    loadPresentations();
  };

  // ========== リアルタイム機能ハンドラー ==========

  const handlePresentationSelect = (presentation: Presentation) => {
    setSelectedPresentation(presentation);
    setShowRealtimePanel(true);
  };

  const handleStartPresentation = useCallback((presentationId: number) => {
    console.log(`リアルタイムプレゼンテーション開始: ${presentationId}`);
    // 実際の実装では、プレゼンテーション状態をアクティブに更新
  }, []);

  const handleStopPresentation = useCallback((presentationId: number) => {
    console.log(`リアルタイムプレゼンテーション停止: ${presentationId}`);
    // 実際の実装では、プレゼンテーション状態を停止に更新
  }, []);

  const handleSlideChange = useCallback(
    (presentationId: number, slideIndex: number) => {
      console.log(`スライド変更: ${presentationId} - ${slideIndex}`);
      // 実際の実装では、現在のスライドインデックスを更新
    },
    []
  );

  const handleRealtimePanelClose = () => {
    setShowRealtimePanel(false);
    setSelectedPresentation(null);
  };

  return (
    <Container maxWidth="xl">
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
              プレゼンテーションの作成・編集・管理とリアルタイム制御を行います
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

        {/* 接続状態警告 */}
        {!isConnected && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            リアルタイム機能を利用するにはSocket.IO接続が必要です。 接続状態:{' '}
            {connectionState}
            {reconnectAttempts > 0 && ` (再試行: ${reconnectAttempts}回)`}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* メインコンテンツエリア */}
          <Grid item xs={12} lg={showRealtimePanel ? 8 : 12}>
            {/* プレゼンテーション一覧 */}
            <PresentationList
              onEdit={handleEdit}
              onDelete={handleDelete}
              onPreview={(id) => {
                const presentation = presentations.find((p) => p.id === id);
                if (presentation) {
                  handlePresentationSelect(presentation);
                }
              }}
            />
          </Grid>

          {/* リアルタイムパネル */}
          {showRealtimePanel && selectedPresentation && (
            <Grid item xs={12} lg={4}>
              <Card>
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 2,
                    }}
                  >
                    <Typography variant="h6">リアルタイム制御パネル</Typography>
                    <Button size="small" onClick={handleRealtimePanelClose}>
                      閉じる
                    </Button>
                  </Box>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    {selectedPresentation.title}
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  {/* 接続状態（コンパクト） */}
                  <Box sx={{ mb: 2 }}>
                    <ConnectionStatus compact />
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  {/* プレゼンテーション制御（コンパクト） */}
                  <Box sx={{ mb: 3 }}>
                    <RealtimeControls
                      presentationId={selectedPresentation.id}
                      totalSlides={selectedPresentation.slideCount || 0}
                      currentSlideIndex={
                        selectedPresentation.currentSlideIndex || 0
                      }
                      onPresentationStart={handleStartPresentation}
                      onPresentationStop={handleStopPresentation}
                      onSlideChange={handleSlideChange}
                      compact
                    />
                  </Box>

                  {/* 参加者数（コンパクト） */}
                  <Box sx={{ mb: 3 }}>
                    <ParticipantCounter compact showRecentActivity={false} />
                  </Box>

                  {/* リアルタイム結果（コンパクト） */}
                  <Box>
                    <RealtimeResults
                      compact
                      showRealtime
                      showAnalytics
                      maxResponses={3}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>

        {/* 詳細なリアルタイム情報（選択されたプレゼンテーションがある場合） */}
        {selectedPresentation && showRealtimePanel && (
          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid item xs={12} md={6}>
              <ConnectionStatus showDetails showStats />
            </Grid>
            <Grid item xs={12} md={6}>
              <ParticipantCounter
                showRecentActivity
                showTrend
                maxRecentItems={5}
              />
            </Grid>
            <Grid item xs={12}>
              <RealtimeControls
                presentationId={selectedPresentation.id}
                totalSlides={selectedPresentation.slideCount || 0}
                currentSlideIndex={selectedPresentation.currentSlideIndex || 0}
                onPresentationStart={handleStartPresentation}
                onPresentationStop={handleStopPresentation}
                onSlideChange={handleSlideChange}
              />
            </Grid>
            <Grid item xs={12}>
              <RealtimeResults showRealtime showAnalytics />
            </Grid>
          </Grid>
        )}

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
