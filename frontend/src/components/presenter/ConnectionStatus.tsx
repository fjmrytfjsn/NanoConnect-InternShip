/**
 * 接続状態表示コンポーネント
 * Socket.IO接続状態、ネットワーク品質、接続統計を表示
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Alert,
  Collapse,
  Divider,
  Grid,
} from '@mui/material';
import {
  WifiOff,
  SignalCellular0Bar,
  SignalCellular1Bar,
  SignalCellular3Bar,
  SignalCellular4Bar,
  Refresh,
  ExpandMore,
  ExpandLess,
  Speed,
  Replay,
} from '@mui/icons-material';
import { useRealtimeConnection } from '@/hooks/useRealtimeConnection';
import { useSelector } from 'react-redux';
import { socketSelectors } from '@/store/slices/socketSlice';

/**
 * ConnectionStatusプロパティ
 */
export interface ConnectionStatusProps {
  compact?: boolean;
  showDetails?: boolean;
  showStats?: boolean;
  onReconnect?: () => void;
  className?: string;
}

/**
 * 接続状態表示コンポーネント
 */
export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  compact = false,
  showDetails = true,
  showStats = true,
  onReconnect,
  className,
}) => {
  // フックから接続状態を取得
  const {
    connectionState,
    isConnected,
    isConnecting,
    networkState,
    connectionQuality,
    reconnectAttempts,
    stats,
    forceReconnect,
    pingServer,
  } = useRealtimeConnection({
    autoConnect: true,
    enableQualityMonitoring: true,
    enableNetworkStateMonitoring: true,
  });

  // Redux状態から追加情報を取得
  const error = useSelector(socketSelectors.getError);
  const settings = useSelector(socketSelectors.getSettings);

  // ローカル状態
  const [showExpandedStats, setShowExpandedStats] = useState(false);
  const [isPinging, setIsPinging] = useState(false);

  // ========== ハンドラー ==========

  const handleReconnect = useCallback(async () => {
    try {
      await forceReconnect();
      onReconnect?.();
    } catch (error) {
      console.error('再接続エラー:', error);
    }
  }, [forceReconnect, onReconnect]);

  const handlePing = useCallback(async () => {
    if (isPinging) return;

    setIsPinging(true);
    try {
      const latency = await pingServer();
      console.log(`📊 Ping: ${latency}ms`);
    } catch (error) {
      console.error('Pingエラー:', error);
    } finally {
      setIsPinging(false);
    }
  }, [isPinging, pingServer]);

  const toggleExpandedStats = () => {
    setShowExpandedStats(!showExpandedStats);
  };

  // ========== 表示用データ計算 ==========

  const getConnectionIcon = () => {
    if (networkState === 'offline') {
      return <WifiOff color="error" />;
    }

    if (!isConnected) {
      return <WifiOff color="disabled" />;
    }

    switch (connectionQuality) {
      case 'excellent':
        return <SignalCellular4Bar color="success" />;
      case 'good':
        return <SignalCellular3Bar color="primary" />;
      case 'poor':
        return <SignalCellular1Bar color="warning" />;
      default:
        return <SignalCellular0Bar color="disabled" />;
    }
  };

  const getConnectionColor = () => {
    if (networkState === 'offline' || !isConnected) {
      return 'error';
    }

    switch (connectionQuality) {
      case 'excellent':
        return 'success';
      case 'good':
        return 'primary';
      case 'poor':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getConnectionText = () => {
    if (networkState === 'offline') {
      return 'オフライン';
    }

    if (isConnecting) {
      return '接続中...';
    }

    if (!isConnected) {
      return '未接続';
    }

    switch (connectionQuality) {
      case 'excellent':
        return '優秀';
      case 'good':
        return '良好';
      case 'poor':
        return '不安定';
      default:
        return '接続済み';
    }
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)}秒`;
    return `${Math.round(ms / 60000)}分`;
  };

  // ========== コンパクトモード ==========
  if (compact) {
    return (
      <Box
        className={className}
        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <Tooltip title={`接続状態: ${getConnectionText()}`}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {getConnectionIcon()}
          </Box>
        </Tooltip>

        <Chip
          label={getConnectionText()}
          color={getConnectionColor()}
          size="small"
          variant="outlined"
        />

        {reconnectAttempts > 0 && (
          <Tooltip title={`再接続試行: ${reconnectAttempts}回`}>
            <Chip
              label={reconnectAttempts}
              color="warning"
              size="small"
              icon={<Replay />}
            />
          </Tooltip>
        )}

        {(!isConnected || error.hasError) && (
          <Tooltip title="再接続">
            <IconButton size="small" onClick={handleReconnect}>
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    );
  }

  // ========== 通常モード ==========
  return (
    <Card className={className}>
      <CardContent>
        {/* ヘッダー */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
          }}
        >
          <Typography variant="h6">接続状態</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="接続テスト">
              <IconButton
                size="small"
                onClick={handlePing}
                disabled={!isConnected || isPinging}
              >
                <Speed />
              </IconButton>
            </Tooltip>
            <Tooltip title="再接続">
              <IconButton size="small" onClick={handleReconnect}>
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* メイン接続状態 */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Box sx={{ mr: 2, fontSize: '2rem' }}>{getConnectionIcon()}</Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6">{getConnectionText()}</Typography>
            <Typography variant="body2" color="text.secondary">
              {connectionState}{' '}
              {networkState === 'offline' && '(ネットワーク圏外)'}
            </Typography>
            {isConnecting && <LinearProgress sx={{ mt: 1 }} />}
          </Box>
          <Chip
            label={isConnected ? 'オンライン' : 'オフライン'}
            color={getConnectionColor()}
            variant="filled"
          />
        </Box>

        {/* エラー表示 */}
        {error.hasError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body2" component="div">
              {error.message}
              {error.code && (
                <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                  エラーコード: {error.code}
                </Typography>
              )}
            </Typography>
          </Alert>
        )}

        {/* 再接続情報 */}
        {reconnectAttempts > 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            再接続を {reconnectAttempts} 回試行中
            {settings.maxReconnectAttempts && (
              <span>
                {' '}
                ({reconnectAttempts}/{settings.maxReconnectAttempts})
              </span>
            )}
          </Alert>
        )}

        {/* 接続品質詳細 */}
        {showDetails && isConnected && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              接続品質
            </Typography>
            <Grid container spacing={2}>
              {stats.lastLatency && (
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="primary">
                      {Math.round(stats.lastLatency)}ms
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      レイテンシ
                    </Typography>
                  </Box>
                </Grid>
              )}
              {stats.averageLatency && (
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="text.secondary">
                      {Math.round(stats.averageLatency)}ms
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      平均レイテンシ
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Box>
        )}

        {/* 統計情報 */}
        {showStats && (
          <Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 1,
              }}
            >
              <Typography variant="subtitle2">接続統計</Typography>
              <IconButton size="small" onClick={toggleExpandedStats}>
                {showExpandedStats ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Box>

            <Grid container spacing={1}>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    {stats.reconnectCount}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    再接続回数
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    {formatTime(stats.connectedTime)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    接続時間
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    {formatTime(stats.disconnectedTime)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    切断時間
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            <Collapse in={showExpandedStats}>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    自動再接続:
                  </Typography>
                  <Typography variant="body2">
                    {settings.autoReconnect ? '有効' : '無効'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    最大試行回数:
                  </Typography>
                  <Typography variant="body2">
                    {settings.maxReconnectAttempts}回
                  </Typography>
                </Grid>
              </Grid>
            </Collapse>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ConnectionStatus;
