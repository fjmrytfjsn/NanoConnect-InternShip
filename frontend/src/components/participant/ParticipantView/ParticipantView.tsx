/**
 * ParticipantView - 参加者メイン画面コンポーネント
 * プレゼンテーションの参加者向けのメイン表示画面
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ExitToApp,
  Wifi,
  WifiOff,
  People,
  Slideshow,
} from '@mui/icons-material';
import { useSocket } from '@/hooks/useSocket';
import { useRealtimeConnection } from '@/hooks/useRealtimeConnection';
import { socketSelectors } from '@/store/slices/socketSlice';
import { RealtimeSlide } from '@/components/participant/RealtimeSlide';

/**
 * プロパティの型定義
 */
interface ParticipantViewProps {
  /** アクセスコード */
  accessCode: string;
}

/**
 * ParticipantViewコンポーネント
 */
export const ParticipantView: React.FC<ParticipantViewProps> = ({ accessCode }) => {
  const navigate = useNavigate();

  // Redux状態の取得
  const isConnected = useSelector(socketSelectors.getIsConnected);
  const presentationData = useSelector(socketSelectors.getCurrentPresentation);
  const participants = useSelector(socketSelectors.getParticipants);
  const error = useSelector(socketSelectors.getError);

  // Socket関連のフック
  const { leavePresentation, joinPresentation } = useSocket(true);
  const { 
    connectionQuality, 
    networkState,
    forceReconnect 
  } = useRealtimeConnection({
    autoConnect: true,
    enableQualityMonitoring: true,
  });

  // ローカル状態
  const [isLeaving, setIsLeaving] = useState<boolean>(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState<boolean>(false);
  const [sessionId] = useState<string>(() => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  /**
   * 初期接続とプレゼンテーション参加
   */
  useEffect(() => {
    if (isConnected && !presentationData) {
      console.log(`🎯 プレゼンテーションに参加: ${accessCode}`);
      joinPresentation(accessCode, (response: any) => {
        if (!response.success) {
          console.error('❌ プレゼンテーション参加失敗:', response.error);
        }
      });
    }
  }, [isConnected, presentationData, accessCode, joinPresentation]);

  /**
   * 退出処理
   */
  const handleLeave = useCallback(async () => {
    if (!presentationData) return;
    
    setIsLeaving(true);
    
    try {
      leavePresentation(presentationData.presentationId, sessionId);
      navigate('/participant');
    } catch (error) {
      console.error('❌ 退出処理エラー:', error);
    } finally {
      setIsLeaving(false);
      setShowLeaveDialog(false);
    }
  }, [presentationData, sessionId, leavePresentation, navigate]);

  /**
   * 退出確認ダイアログを表示
   */
  const handleShowLeaveDialog = useCallback(() => {
    setShowLeaveDialog(true);
  }, []);

  /**
   * 退出確認ダイアログをキャンセル
   */
  const handleCancelLeave = useCallback(() => {
    setShowLeaveDialog(false);
  }, []);

  /**
   * 再接続処理
   */
  const handleReconnect = useCallback(() => {
    forceReconnect();
  }, [forceReconnect]);

  /**
   * 接続状態に基づくステータス表示
   */
  const getConnectionStatus = useCallback(() => {
    if (!isConnected) {
      return { 
        text: networkState === 'offline' ? 'オフライン' : '未接続', 
        color: 'error' as const, 
        icon: <WifiOff fontSize="small" /> 
      };
    }
    return { 
      text: '接続済み', 
      color: 'success' as const, 
      icon: <Wifi fontSize="small" /> 
    };
  }, [isConnected, networkState]);

  const status = getConnectionStatus();

  // 接続エラー時の表示
  if (error && error.code === 'CONNECTION_ERROR') {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={handleReconnect}>
              再接続
            </Button>
          }
        >
          {error.message}
        </Alert>
        <Button variant="contained" onClick={() => navigate('/participant')}>
          戻る
        </Button>
      </Box>
    );
  }

  // プレゼンテーションが見つからない場合
  if (isConnected && !presentationData && !error) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <CircularProgress sx={{ mb: 2 }} />
        <Typography>プレゼンテーションに接続中...</Typography>
      </Box>
    );
  }

  // プレゼンテーションデータがない場合
  if (!presentationData) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          プレゼンテーションが見つかりません
        </Alert>
        <Button variant="contained" onClick={() => navigate('/participant')}>
          戻る
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* ヘッダー */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Slideshow color="primary" />
              <Typography variant="h6" component="h1">
                {presentationData.title}
              </Typography>
            </Box>
            <Button
              variant="outlined"
              size="small"
              startIcon={isLeaving ? <CircularProgress size={16} /> : <ExitToApp />}
              onClick={handleShowLeaveDialog}
              disabled={isLeaving}
            >
              退出
            </Button>
          </Box>
          
          {/* ステータス情報 */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip
              icon={status.icon}
              label={status.text}
              color={status.color}
              size="small"
            />
            {connectionQuality !== 'disconnected' && (
              <Chip
                label={`品質: ${connectionQuality}`}
                size="small"
                color={
                  connectionQuality === 'excellent' ? 'success' :
                  connectionQuality === 'good' ? 'info' :
                  connectionQuality === 'poor' ? 'warning' : 'default'
                }
              />
            )}
            <Chip
              icon={<People fontSize="small" />}
              label={`参加者: ${participants.count}人`}
              size="small"
              variant="outlined"
            />
            <Chip
              label={`コード: ${accessCode}`}
              size="small"
              variant="outlined"
            />
          </Box>

          {presentationData.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {presentationData.description}
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* 接続品質警告 */}
      {connectionQuality === 'poor' && isConnected && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          接続品質が低下しています。安定した接続のため、Wi-Fiに接続することをお勧めします。
        </Alert>
      )}

      {/* スライド表示エリア */}
      <RealtimeSlide 
        presentationData={presentationData}
        sessionId={sessionId}
      />

      {/* 退出確認ダイアログ */}
      <Dialog open={showLeaveDialog} onClose={handleCancelLeave}>
        <DialogTitle>プレゼンテーションから退出</DialogTitle>
        <DialogContent>
          <Typography>
            プレゼンテーション「{presentationData.title}」から退出しますか？
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            退出すると、これまでの回答データは保持されますが、リアルタイム更新を受信できなくなります。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelLeave}>
            キャンセル
          </Button>
          <Button 
            onClick={handleLeave} 
            color="error" 
            disabled={isLeaving}
            startIcon={isLeaving ? <CircularProgress size={16} /> : null}
          >
            退出する
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ParticipantView;