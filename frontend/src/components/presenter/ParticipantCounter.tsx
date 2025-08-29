/**
 * 参加者数表示コンポーネント
 * リアルタイムで参加者数を表示し、参加/退出の通知を管理
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Avatar,
  Fade,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Badge,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  People,
  PersonAdd,
  PersonRemove,
  TrendingUp,
  TrendingDown,
  Refresh,
  Visibility,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { socketSelectors } from '@/store/slices/socketSlice';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

/**
 * ParticipantCounterプロパティ
 */
export interface ParticipantCounterProps {
  showRecentActivity?: boolean;
  showTrend?: boolean;
  compact?: boolean;
  maxRecentItems?: number;
  onRefresh?: () => void;
  className?: string;
}

/**
 * 参加者アクティビティの型定義
 */
interface ParticipantActivity {
  type: 'joined' | 'left';
  sessionId: string;
  timestamp: string;
  participantCount: number;
}

/**
 * 参加者数表示コンポーネント
 */
export const ParticipantCounter: React.FC<ParticipantCounterProps> = ({
  showRecentActivity = true,
  showTrend = true,
  compact = false,
  maxRecentItems = 5,
  onRefresh,
  className,
}) => {
  // Redux状態を取得
  const participants = useSelector(socketSelectors.getParticipants);
  const isConnected = useSelector(socketSelectors.getIsConnected);

  // ローカル状態
  const [previousCount, setPreviousCount] = useState(0);
  const [trendDirection, setTrendDirection] = useState<
    'up' | 'down' | 'stable'
  >('stable');
  const [recentActivity, setRecentActivity] = useState<ParticipantActivity[]>(
    []
  );
  const [newJoinAnimation, setNewJoinAnimation] = useState(false);

  const currentCount = participants.count;

  // ========== エフェクト ==========

  /**
   * 参加者数の変化を監視してトレンドを更新
   */
  useEffect(() => {
    if (previousCount === 0) {
      setPreviousCount(currentCount);
      return;
    }

    if (currentCount > previousCount) {
      setTrendDirection('up');
      setNewJoinAnimation(true);
      setTimeout(() => setNewJoinAnimation(false), 1000);

      // 参加イベントを記録
      setRecentActivity((prev) => [
        {
          type: 'joined',
          sessionId: `session-${Date.now()}`,
          timestamp: new Date().toISOString(),
          participantCount: currentCount,
        },
        ...prev.slice(0, maxRecentItems - 1),
      ]);
    } else if (currentCount < previousCount) {
      setTrendDirection('down');

      // 退出イベントを記録
      setRecentActivity((prev) => [
        {
          type: 'left',
          sessionId: `session-${Date.now()}`,
          timestamp: new Date().toISOString(),
          participantCount: currentCount,
        },
        ...prev.slice(0, maxRecentItems - 1),
      ]);
    } else {
      setTrendDirection('stable');
    }

    setPreviousCount(currentCount);
  }, [currentCount, previousCount, maxRecentItems]);

  /**
   * Redux参加者データからアクティビティを同期
   */
  useEffect(() => {
    if (participants.recent.length > 0) {
      const activities: ParticipantActivity[] = participants.recent.map(
        (event) => ({
          type: 'joined' as const,
          sessionId: event.sessionId,
          timestamp: event.timestamp,
          participantCount: event.participantCount,
        })
      );

      setRecentActivity((prev) => {
        // 重複を避けて新しいアクティビティのみを追加
        const existingSessions = prev.map((a) => a.sessionId);
        const newActivities = activities.filter(
          (a) => !existingSessions.includes(a.sessionId)
        );
        return [...newActivities, ...prev].slice(0, maxRecentItems);
      });
    }
  }, [participants.recent, maxRecentItems]);

  // ========== ハンドラー ==========

  const handleRefresh = () => {
    onRefresh?.();
    console.log('🔄 参加者数を更新中...');
  };

  // ========== レンダリング補助関数 ==========

  const getTrendIcon = () => {
    switch (trendDirection) {
      case 'up':
        return <TrendingUp color="success" fontSize="small" />;
      case 'down':
        return <TrendingDown color="error" fontSize="small" />;
      default:
        return null;
    }
  };

  const getTrendColor = () => {
    switch (trendDirection) {
      case 'up':
        return 'success.main';
      case 'down':
        return 'error.main';
      default:
        return 'text.secondary';
    }
  };

  const formatActivityTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), {
        addSuffix: true,
        locale: ja,
      });
    } catch (error) {
      return '不明';
    }
  };

  // ========== コンパクトモード ==========
  if (compact) {
    return (
      <Box
        className={className}
        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <Tooltip title="参加者数">
          <Badge
            badgeContent={currentCount}
            color={isConnected ? 'primary' : 'default'}
            sx={{
              '& .MuiBadge-badge': {
                animation: newJoinAnimation ? 'pulse 1s ease-in-out' : 'none',
                '@keyframes pulse': {
                  '0%': { transform: 'scale(1)' },
                  '50%': { transform: 'scale(1.2)' },
                  '100%': { transform: 'scale(1)' },
                },
              },
            }}
          >
            <People color={isConnected ? 'primary' : 'disabled'} />
          </Badge>
        </Tooltip>

        {showTrend && getTrendIcon()}

        {onRefresh && (
          <Tooltip title="更新">
            <IconButton size="small" onClick={handleRefresh}>
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
          <Typography variant="h6">参加者</Typography>
          {onRefresh && (
            <Tooltip title="更新">
              <IconButton size="small" onClick={handleRefresh}>
                <Refresh />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* 参加者数メイン表示 */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 3,
          }}
        >
          <Avatar
            sx={{
              bgcolor: isConnected ? 'primary.main' : 'grey.400',
              width: 64,
              height: 64,
              mr: 2,
              animation: newJoinAnimation ? 'pulse 1s ease-in-out' : 'none',
              '@keyframes pulse': {
                '0%': { transform: 'scale(1)' },
                '50%': { transform: 'scale(1.1)' },
                '100%': { transform: 'scale(1)' },
              },
            }}
          >
            <People sx={{ fontSize: 32 }} />
          </Avatar>

          <Box>
            <Typography
              variant="h3"
              component="div"
              sx={{ fontWeight: 'bold' }}
            >
              {currentCount}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                人が参加中
              </Typography>
              {showTrend && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    color: getTrendColor(),
                  }}
                >
                  {getTrendIcon()}
                </Box>
              )}
            </Box>
          </Box>
        </Box>

        {/* 接続状態 */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Chip
            icon={<Visibility />}
            label={isConnected ? 'リアルタイム同期中' : '同期停止'}
            color={isConnected ? 'success' : 'default'}
            variant={isConnected ? 'filled' : 'outlined'}
            size="small"
          />
        </Box>

        {/* 最近のアクティビティ */}
        {showRecentActivity && recentActivity.length > 0 && (
          <Box>
            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
              最近のアクティビティ
            </Typography>
            <List dense>
              {recentActivity
                .slice(0, maxRecentItems)
                .map((activity, index) => (
                  <Fade
                    in
                    key={`${activity.sessionId}-${activity.timestamp}`}
                    timeout={300 * (index + 1)}
                  >
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar
                          sx={{
                            bgcolor:
                              activity.type === 'joined'
                                ? 'success.light'
                                : 'error.light',
                            width: 32,
                            height: 32,
                          }}
                        >
                          {activity.type === 'joined' ? (
                            <PersonAdd fontSize="small" />
                          ) : (
                            <PersonRemove fontSize="small" />
                          )}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="body2">
                            {activity.type === 'joined'
                              ? '参加者が参加'
                              : '参加者が退出'}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {formatActivityTime(activity.timestamp)} •{' '}
                            {activity.participantCount}人
                          </Typography>
                        }
                      />
                    </ListItem>
                  </Fade>
                ))}
            </List>
          </Box>
        )}

        {/* 統計情報 */}
        {showTrend && previousCount > 0 && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              変化: {currentCount - previousCount >= 0 ? '+' : ''}
              {currentCount - previousCount}
              {trendDirection === 'up' && (
                <span style={{ color: '#4caf50' }}> ↗ 増加傾向</span>
              )}
              {trendDirection === 'down' && (
                <span style={{ color: '#f44336' }}> ↘ 減少傾向</span>
              )}
              {trendDirection === 'stable' && (
                <span style={{ color: '#757575' }}> → 安定</span>
              )}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ParticipantCounter;
