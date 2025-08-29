/**
 * リアルタイム結果表示コンポーネント
 * 投票結果のリアルタイム更新表示と分析データの可視化
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  Fade,
  Alert,
  IconButton,
  Tooltip,
  ButtonGroup,
  Button,
  Divider,
} from '@mui/material';
import {
  Refresh,
  TrendingUp,
  BarChart,
  PieChart,
  Timeline,
  Visibility,
  VisibilityOff,
  Analytics,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { socketSelectors } from '@/store/slices/socketSlice';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

/**
 * RealtimeResultsプロパティ
 */
export interface RealtimeResultsProps {
  presentationId?: number;
  slideId?: number;
  showRealtime?: boolean;
  showAnalytics?: boolean;
  maxResponses?: number;
  onRefresh?: () => void;
  onToggleVisibility?: (visible: boolean) => void;
  compact?: boolean;
  className?: string;
}

/**
 * 表示モード
 */
type DisplayMode = 'responses' | 'analytics' | 'both';

/**
 * リアルタイム結果表示コンポーネント
 */
export const RealtimeResults: React.FC<RealtimeResultsProps> = ({
  presentationId,
  slideId,
  showRealtime = true,
  showAnalytics = true,
  maxResponses = 10,
  onRefresh,
  onToggleVisibility,
  compact = false,
  className,
}) => {
  // Redux状態を取得
  const responses = useSelector(socketSelectors.getResponses);
  const analytics = useSelector(socketSelectors.getAnalytics);
  const isConnected = useSelector(socketSelectors.getIsConnected);
  const currentSlide = useSelector(socketSelectors.getCurrentSlide);

  // ローカル状態
  const [displayMode, setDisplayMode] = useState<DisplayMode>('both');
  const [isVisible, setIsVisible] = useState(true);
  const [newResponseAnimation, setNewResponseAnimation] = useState(false);

  // ========== 計算されたデータ ==========

  // 現在のスライドの回答のみをフィルタリング
  const currentSlideResponses = useMemo(() => {
    if (!slideId && !currentSlide?.slideId) return responses;
    const targetSlideId = slideId || currentSlide?.slideId;
    return responses.filter(response => response.slideId === targetSlideId);
  }, [responses, slideId, currentSlide?.slideId]);

  // 回答数統計
  const responseStats = useMemo(() => {
    const total = currentSlideResponses.length;
    const recent = currentSlideResponses.filter(response => {
      const responseTime = new Date(response.timestamp);
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      return responseTime > fiveMinutesAgo;
    }).length;

    return { total, recent };
  }, [currentSlideResponses]);

  // 分析データ処理
  const processedAnalytics = useMemo(() => {
    if (!analytics) return null;

    const data = analytics.analytics;
    
    // 多肢選択問題の場合
    if ('optionCounts' in data && 'optionPercentages' in data) {
      const options = Object.entries(data.optionCounts).map(([option, count]) => ({
        option,
        count: count as number,
        percentage: (data.optionPercentages as Record<string, number>)[option] || 0,
      })).sort((a, b) => b.count - a.count);

      return {
        type: 'multiple_choice' as const,
        totalResponses: analytics.totalResponses,
        options,
        lastUpdated: analytics.timestamp,
      };
    }
    
    // ワードクラウドの場合
    if ('wordFrequencies' in data && 'topWords' in data) {
      return {
        type: 'word_cloud' as const,
        totalResponses: analytics.totalResponses,
        wordFrequencies: data.wordFrequencies as Record<string, number>,
        topWords: (data.topWords as Array<{word: string; count: number; percentage: number}>).slice(0, 10),
        lastUpdated: analytics.timestamp,
      };
    }

    return null;
  }, [analytics]);

  // ========== エフェクト ==========

  /**
   * 新しい回答があった時のアニメーション
   */
  useEffect(() => {
    if (currentSlideResponses.length > 0) {
      setNewResponseAnimation(true);
      const timer = setTimeout(() => setNewResponseAnimation(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [currentSlideResponses.length]);

  // ========== ハンドラー ==========

  const handleRefresh = () => {
    onRefresh?.();
    console.log('🔄 結果データを更新中...');
  };

  const handleToggleVisibility = () => {
    const newVisibility = !isVisible;
    setIsVisible(newVisibility);
    onToggleVisibility?.(newVisibility);
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), {
        addSuffix: true,
        locale: ja,
      });
    } catch (error) {
      return '不明';
    }
  };

  // ========== レンダリング補助関数 ==========

  const renderMultipleChoiceResults = () => {
    if (!processedAnalytics || processedAnalytics.type !== 'multiple_choice') {
      return null;
    }

    return (
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          選択肢別回答数 ({processedAnalytics.totalResponses}件)
        </Typography>
        {processedAnalytics.options.map((option, index) => (
          <Fade in key={option.option} timeout={300 * (index + 1)}>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">
                  {option.option}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {option.count}件 ({Math.round(option.percentage)}%)
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={option.percentage}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: 'grey.200',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    bgcolor: index === 0 ? 'primary.main' : 
                           index === 1 ? 'secondary.main' :
                           index === 2 ? 'success.main' : 'info.main',
                  },
                }}
              />
            </Box>
          </Fade>
        ))}
      </Box>
    );
  };

  const renderWordCloudResults = () => {
    if (!processedAnalytics || processedAnalytics.type !== 'word_cloud') {
      return null;
    }

    return (
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          人気キーワード ({processedAnalytics.totalResponses}件の回答)
        </Typography>
        <List dense>
          {processedAnalytics.topWords.map((word, index) => (
            <Fade in key={word.word} timeout={300 * (index + 1)}>
              <ListItem>
                <ListItemText
                  primary={word.word}
                  secondary={`${word.count}回 (${Math.round(word.percentage)}%)`}
                />
                <Chip
                  label={word.count}
                  size="small"
                  color={index < 3 ? 'primary' : 'default'}
                  sx={{
                    fontSize: Math.max(12, Math.min(18, 12 + word.count / 5)),
                  }}
                />
              </ListItem>
            </Fade>
          ))}
        </List>
      </Box>
    );
  };

  const renderRecentResponses = () => {
    const recentResponses = currentSlideResponses
      .slice(-maxResponses)
      .reverse();

    if (recentResponses.length === 0) {
      return (
        <Alert severity="info">
          まだ回答がありません
        </Alert>
      );
    }

    return (
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          最新の回答 ({recentResponses.length}/{responseStats.total}件)
        </Typography>
        <List dense>
          {recentResponses.map((response, index) => (
            <Fade in key={response.responseId} timeout={200 * (index + 1)}>
              <ListItem>
                <ListItemText
                  primary={
                    <Typography variant="body2">
                      {typeof response.responseData === 'object' 
                        ? JSON.stringify(response.responseData)
                        : String(response.responseData)
                      }
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {formatTimestamp(response.timestamp)}
                    </Typography>
                  }
                />
              </ListItem>
            </Fade>
          ))}
        </List>
      </Box>
    );
  };

  // ========== コンパクトモード ==========
  if (compact) {
    return (
      <Box className={className} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Tooltip title="回答数">
          <Chip
            icon={<Analytics />}
            label={responseStats.total}
            color={isConnected ? 'primary' : 'default'}
            size="small"
            sx={{
              animation: newResponseAnimation ? 'pulse 1s ease-in-out' : 'none',
              '@keyframes pulse': {
                '0%': { transform: 'scale(1)' },
                '50%': { transform: 'scale(1.1)' },
                '100%': { transform: 'scale(1)' },
              },
            }}
          />
        </Tooltip>
        
        {responseStats.recent > 0 && (
          <Tooltip title={`直近5分間: ${responseStats.recent}件`}>
            <Chip
              icon={<TrendingUp />}
              label={responseStats.recent}
              color="success"
              size="small"
              variant="outlined"
            />
          </Tooltip>
        )}

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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            リアルタイム結果
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {onToggleVisibility && (
              <Tooltip title={isVisible ? '結果を非表示' : '結果を表示'}>
                <IconButton size="small" onClick={handleToggleVisibility}>
                  {isVisible ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="更新">
              <IconButton size="small" onClick={handleRefresh}>
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* 接続状態警告 */}
        {!isConnected && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            リアルタイム更新を受信するには接続が必要です
          </Alert>
        )}

        {/* 統計サマリー */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Chip
            icon={<BarChart />}
            label={`${responseStats.total}件の回答`}
            color="primary"
            sx={{
              animation: newResponseAnimation ? 'pulse 1s ease-in-out' : 'none',
              '@keyframes pulse': {
                '0%': { transform: 'scale(1)' },
                '50%': { transform: 'scale(1.1)' },
                '100%': { transform: 'scale(1)' },
              },
            }}
          />
          {responseStats.recent > 0 && (
            <Chip
              icon={<TrendingUp />}
              label={`直近5分: ${responseStats.recent}件`}
              color="success"
              variant="outlined"
            />
          )}
          {processedAnalytics && (
            <Chip
              label={`最終更新: ${formatTimestamp(processedAnalytics.lastUpdated)}`}
              size="small"
              variant="outlined"
            />
          )}
        </Box>

        {/* 表示モード切り替え */}
        {showAnalytics && showRealtime && (
          <Box sx={{ mb: 3 }}>
            <ButtonGroup size="small" variant="outlined" fullWidth>
              <Button
                startIcon={<Timeline />}
                onClick={() => setDisplayMode('responses')}
                variant={displayMode === 'responses' ? 'contained' : 'outlined'}
              >
                回答一覧
              </Button>
              <Button
                startIcon={<Analytics />}
                onClick={() => setDisplayMode('analytics')}
                variant={displayMode === 'analytics' ? 'contained' : 'outlined'}
              >
                分析結果
              </Button>
              <Button
                startIcon={<PieChart />}
                onClick={() => setDisplayMode('both')}
                variant={displayMode === 'both' ? 'contained' : 'outlined'}
              >
                すべて
              </Button>
            </ButtonGroup>
          </Box>
        )}

        {/* コンテンツ表示 */}
        {isVisible && (
          <Box>
            {/* 分析結果 */}
            {(displayMode === 'analytics' || displayMode === 'both') && showAnalytics && (
              <Box sx={{ mb: 3 }}>
                {processedAnalytics ? (
                  <Box>
                    {processedAnalytics.type === 'multiple_choice' && renderMultipleChoiceResults()}
                    {processedAnalytics.type === 'word_cloud' && renderWordCloudResults()}
                  </Box>
                ) : (
                  <Alert severity="info">
                    分析データがまだ利用できません
                  </Alert>
                )}
              </Box>
            )}

            {/* 区切り線 */}
            {displayMode === 'both' && showAnalytics && showRealtime && processedAnalytics && (
              <Divider sx={{ my: 3 }} />
            )}

            {/* 回答一覧 */}
            {(displayMode === 'responses' || displayMode === 'both') && showRealtime && (
              <Box>
                {renderRecentResponses()}
              </Box>
            )}
          </Box>
        )}

        {/* 非表示状態 */}
        {!isVisible && (
          <Alert severity="info">
            結果表示が非表示になっています。参加者には結果が表示されません。
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default RealtimeResults;