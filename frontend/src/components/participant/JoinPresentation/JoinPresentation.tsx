/**
 * JoinPresentation - アクセスコード入力・参加フォームコンポーネント
 * プレゼンテーションに参加するためのアクセスコード入力画面を提供
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Container,
  Paper,
  Chip,
} from '@mui/material';
import {
  Wifi,
  WifiOff,
  Person,
  SlideshowOutlined,
} from '@mui/icons-material';
import { useSocket } from '@/hooks/useSocket';
import { useRealtimeConnection } from '@/hooks/useRealtimeConnection';
import { socketSelectors } from '@/store/slices/socketSlice';

/**
 * プロパティの型定義
 */
interface JoinPresentationProps {
  /** 参加成功時のコールバック */
  onJoinSuccess?: (presentationData: any) => void;
  /** 参加失敗時のコールバック */
  onJoinError?: (error: any) => void;
}

/**
 * JoinPresentationコンポーネント
 */
export const JoinPresentation: React.FC<JoinPresentationProps> = ({
  onJoinSuccess,
  onJoinError,
}) => {
  const navigate = useNavigate();

  // Redux状態の取得
  const isConnected = useSelector(socketSelectors.getIsConnected);
  const isConnecting = useSelector(socketSelectors.getIsConnecting);
  const error = useSelector(socketSelectors.getError);

  // Socket関連のフック
  const { connect, joinPresentation } = useSocket();
  const { 
    connectionQuality, 
    networkState,
    forceReconnect 
  } = useRealtimeConnection({
    autoConnect: false,
    enableQualityMonitoring: true,
  });

  // ローカル状態
  const [accessCode, setAccessCode] = useState<string>('');
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  /**
   * アクセスコード入力値の検証
   */
  const isValidAccessCode = useCallback((code: string): boolean => {
    return /^\d{6}$/.test(code);
  }, []);

  /**
   * アクセスコード入力ハンドラー
   */
  const handleAccessCodeChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.replace(/\D/g, ''); // 数字以外を除去
    if (value.length <= 6) {
      setAccessCode(value);
      setJoinError(null); // エラーをクリア
    }
  }, []);

  /**
   * 参加ボタンクリックハンドラー
   */
  const handleJoin = useCallback(async () => {
    if (!isValidAccessCode(accessCode)) {
      setJoinError('6桁の数字を入力してください');
      return;
    }

    setIsJoining(true);
    setJoinError(null);

    try {
      // まず接続を確立
      if (!isConnected) {
        console.log('🔌 Socket.IO接続を開始...');
        connect();
        
        // 接続を待機（最大5秒）
        let attempts = 0;
        const maxAttempts = 25; // 5秒 / 200ms
        
        while (!isConnected && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 200));
          attempts++;
        }
        
        if (!isConnected) {
          throw new Error('サーバーに接続できませんでした。ネットワーク接続を確認してください。');
        }
      }

      // プレゼンテーションに参加
      console.log(`🎯 プレゼンテーション参加を試行: ${accessCode}`);
      
      joinPresentation(accessCode, (response: any) => {
        if (response.success) {
          console.log('✅ プレゼンテーション参加成功');
          onJoinSuccess?.(response.data);
          navigate(`/participant/${accessCode}`);
        } else {
          console.error('❌ プレゼンテーション参加失敗:', response.error);
          const errorMessage = response.error?.message || 'プレゼンテーションへの参加に失敗しました';
          setJoinError(errorMessage);
          onJoinError?.(response.error);
        }
        setIsJoining(false);
      });

    } catch (error) {
      console.error('❌ 参加処理エラー:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
      setJoinError(errorMessage);
      onJoinError?.(error);
      setIsJoining(false);
    }
  }, [
    accessCode,
    isValidAccessCode,
    isConnected,
    connect,
    joinPresentation,
    navigate,
    onJoinSuccess,
    onJoinError,
  ]);

  /**
   * Enterキー押下時の処理
   */
  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !isJoining && isValidAccessCode(accessCode)) {
      handleJoin();
    }
  }, [handleJoin, isJoining, accessCode, isValidAccessCode]);

  /**
   * 再接続ボタンクリックハンドラー
   */
  const handleReconnect = useCallback(() => {
    setJoinError(null);
    forceReconnect();
  }, [forceReconnect]);

  /**
   * 接続状態に基づくステータス表示
   */
  const getConnectionStatus = useCallback(() => {
    if (isConnecting) {
      return { text: '接続中...', color: 'warning' as const, icon: <CircularProgress size={16} /> };
    }
    if (isConnected) {
      return { 
        text: '接続済み', 
        color: 'success' as const, 
        icon: <Wifi fontSize="small" /> 
      };
    }
    if (networkState === 'offline') {
      return { 
        text: 'オフライン', 
        color: 'error' as const, 
        icon: <WifiOff fontSize="small" /> 
      };
    }
    return { 
      text: '未接続', 
      color: 'default' as const, 
      icon: <WifiOff fontSize="small" /> 
    };
  }, [isConnecting, isConnected, networkState]);

  /**
   * エラー表示の処理
   */
  const displayError = joinError || error?.message;

  const status = getConnectionStatus();

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        {/* ヘッダー */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <SlideshowOutlined sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" component="h1" gutterBottom>
            プレゼンテーションに参加
          </Typography>
          <Typography variant="body1" color="text.secondary">
            プレゼンターから提供された6桁のアクセスコードを入力してください
          </Typography>
        </Box>

        {/* 接続状態表示 */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
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
              sx={{ ml: 1 }}
              color={
                connectionQuality === 'excellent' ? 'success' :
                connectionQuality === 'good' ? 'info' :
                connectionQuality === 'poor' ? 'warning' : 'default'
              }
            />
          )}
        </Box>

        {/* メインフォーム */}
        <Card>
          <CardContent>
            {/* エラー表示 */}
            {displayError && (
              <Alert 
                severity="error" 
                sx={{ mb: 2 }}
                action={
                  error?.code === 'CONNECTION_ERROR' ? (
                    <Button color="inherit" size="small" onClick={handleReconnect}>
                      再接続
                    </Button>
                  ) : null
                }
              >
                {displayError}
              </Alert>
            )}

            {/* アクセスコード入力 */}
            <TextField
              fullWidth
              label="アクセスコード"
              placeholder="6桁のコードを入力"
              value={accessCode}
              onChange={handleAccessCodeChange}
              onKeyPress={handleKeyPress}
              inputProps={{
                maxLength: 6,
                'aria-label': 'アクセスコード',
                style: { 
                  textAlign: 'center', 
                  fontSize: '1.5rem',
                  letterSpacing: '0.5rem' 
                }
              }}
              disabled={isJoining}
              error={!!joinError}
              helperText={
                accessCode.length > 0 && accessCode.length < 6
                  ? `あと${6 - accessCode.length}文字入力してください`
                  : null
              }
              sx={{ mb: 3 }}
            />

            {/* 参加ボタン */}
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleJoin}
              disabled={!isValidAccessCode(accessCode) || isJoining}
              startIcon={
                isJoining ? (
                  <CircularProgress size={20} />
                ) : (
                  <Person />
                )
              }
              sx={{ py: 1.5 }}
            >
              {isJoining ? '参加中...' : '参加'}
            </Button>

            {/* ヒント */}
            <Typography 
              variant="caption" 
              color="text.secondary" 
              sx={{ display: 'block', textAlign: 'center', mt: 2 }}
            >
              💡 ヒント: プレゼンターの画面に表示されているコードを入力してください
            </Typography>
          </CardContent>
        </Card>

        {/* 接続品質に基づく追加情報 */}
        {connectionQuality === 'poor' && isConnected && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            接続品質が低下しています。安定した接続のため、Wi-Fiに接続することをお勧めします。
          </Alert>
        )}
      </Paper>
    </Container>
  );
};

export default JoinPresentation;