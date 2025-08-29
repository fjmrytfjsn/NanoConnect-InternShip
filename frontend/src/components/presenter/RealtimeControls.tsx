/**
 * リアルタイム制御コンポーネント
 * プレゼンテーション開始・停止・スライド切り替えのリアルタイム制御を提供
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  Typography,
  Divider,
  Alert,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  NavigateBefore,
  NavigateNext,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { useSocket } from '@/hooks/useSocket';
import { useRealtimeConnection } from '@/hooks/useRealtimeConnection';
import { socketSelectors } from '@/store/slices/socketSlice';

/**
 * RealtimeControlsプロパティ
 */
export interface RealtimeControlsProps {
  presentationId: number;
  totalSlides?: number;
  currentSlideIndex?: number;
  onPresentationStart?: (presentationId: number) => void;
  onPresentationStop?: (presentationId: number) => void;
  onSlideChange?: (presentationId: number, slideIndex: number) => void;
  disabled?: boolean;
  compact?: boolean;
}

/**
 * リアルタイム制御コンポーネント
 */
export const RealtimeControls: React.FC<RealtimeControlsProps> = ({
  presentationId,
  totalSlides = 0,
  currentSlideIndex = 0,
  onPresentationStart,
  onPresentationStop,
  onSlideChange,
  disabled = false,
  compact = false,
}) => {
  const { emit } = useSocket();
  const { connectionQuality } = useRealtimeConnection();

  // Redux状態を取得
  const presentationStatus = useSelector(socketSelectors.getPresentationStatus);
  const isSocketConnected = useSelector(socketSelectors.getIsConnected);
  const error = useSelector(socketSelectors.getError);

  // ローカル状態
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isChangingSlide, setIsChangingSlide] = useState(false);

  // 状態計算
  const isPresenting = presentationStatus === 'started';
  const canControl = isSocketConnected && !disabled;
  const isFirstSlide = currentSlideIndex === 0;
  const isLastSlide = currentSlideIndex >= totalSlides - 1;

  // ========== イベントハンドラー ==========

  /**
   * プレゼンテーション開始
   */
  const handleStart = useCallback(async () => {
    if (!canControl || isStarting) return;

    setIsStarting(true);
    try {
      // Socket.IOイベントを送信
      emit('control:start', { presentationId: String(presentationId) });

      // コールバック関数実行
      onPresentationStart?.(presentationId);

      console.log(`📢 プレゼンテーション開始: ${presentationId}`);
    } catch (error) {
      console.error('プレゼンテーション開始エラー:', error);
    } finally {
      setIsStarting(false);
    }
  }, [canControl, isStarting, presentationId, emit, onPresentationStart]);

  /**
   * プレゼンテーション停止
   */
  const handleStop = useCallback(async () => {
    if (!canControl || isStopping) return;

    setIsStopping(true);
    try {
      // Socket.IOイベントを送信
      emit('control:stop', { presentationId: String(presentationId) });

      // コールバック関数実行
      onPresentationStop?.(presentationId);

      console.log(`⏸️ プレゼンテーション停止: ${presentationId}`);
    } catch (error) {
      console.error('プレゼンテーション停止エラー:', error);
    } finally {
      setIsStopping(false);
    }
  }, [canControl, isStopping, presentationId, emit, onPresentationStop]);

  /**
   * 前のスライドに移動
   */
  const handlePrevSlide = useCallback(async () => {
    if (!canControl || isChangingSlide || isFirstSlide) return;

    setIsChangingSlide(true);
    const newIndex = Math.max(0, currentSlideIndex - 1);
    try {
      // Socket.IOイベントを送信
      emit('control:prev-slide', { presentationId: String(presentationId) });

      // コールバック関数実行
      onSlideChange?.(presentationId, newIndex);

      console.log(`◀️ 前のスライドに移動: ${newIndex}`);
    } catch (error) {
      console.error('スライド切り替えエラー:', error);
    } finally {
      setIsChangingSlide(false);
    }
  }, [
    canControl,
    isChangingSlide,
    isFirstSlide,
    currentSlideIndex,
    presentationId,
    emit,
    onSlideChange,
  ]);

  /**
   * 次のスライドに移動
   */
  const handleNextSlide = useCallback(async () => {
    if (!canControl || isChangingSlide || isLastSlide) return;

    setIsChangingSlide(true);
    const newIndex = Math.min(totalSlides - 1, currentSlideIndex + 1);
    try {
      // Socket.IOイベントを送信
      emit('control:next-slide', { presentationId: String(presentationId) });

      // コールバック関数実行
      onSlideChange?.(presentationId, newIndex);

      console.log(`▶️ 次のスライドに移動: ${newIndex}`);
    } catch (error) {
      console.error('スライド切り替えエラー:', error);
    } finally {
      setIsChangingSlide(false);
    }
  }, [
    canControl,
    isChangingSlide,
    isLastSlide,
    currentSlideIndex,
    totalSlides,
    presentationId,
    emit,
    onSlideChange,
  ]);

  // ========== レンダリング ==========

  // コンパクトモードの場合
  if (compact) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {/* プレゼンテーション制御 */}
        <ButtonGroup size="small" variant="outlined">
          {!isPresenting ? (
            <Tooltip title="プレゼンテーションを開始">
              <span>
                <Button
                  startIcon={<PlayArrow />}
                  onClick={handleStart}
                  disabled={!canControl || isStarting}
                  color="success"
                >
                  開始
                </Button>
              </span>
            </Tooltip>
          ) : (
            <Tooltip title="プレゼンテーションを停止">
              <span>
                <Button
                  startIcon={<Stop />}
                  onClick={handleStop}
                  disabled={!canControl || isStopping}
                  color="error"
                >
                  停止
                </Button>
              </span>
            </Tooltip>
          )}
        </ButtonGroup>

        {/* スライド制御（プレゼンテーション中のみ） */}
        {isPresenting && (
          <ButtonGroup size="small" variant="outlined">
            <Tooltip title="前のスライド">
              <span>
                <Button
                  onClick={handlePrevSlide}
                  disabled={!canControl || isChangingSlide || isFirstSlide}
                >
                  <NavigateBefore />
                </Button>
              </span>
            </Tooltip>
            <Tooltip title="次のスライド">
              <span>
                <Button
                  onClick={handleNextSlide}
                  disabled={!canControl || isChangingSlide || isLastSlide}
                >
                  <NavigateNext />
                </Button>
              </span>
            </Tooltip>
          </ButtonGroup>
        )}

        {/* 接続状態インジケーター */}
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: isSocketConnected ? 'success.main' : 'error.main',
          }}
        />
      </Box>
    );
  }

  // 通常モード
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          リアルタイム制御
        </Typography>

        {/* エラー表示 */}
        {error.hasError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error.message}
          </Alert>
        )}

        {/* 接続状態警告 */}
        {!isSocketConnected && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            リアルタイム機能を使用するには接続が必要です
          </Alert>
        )}

        {/* プレゼンテーション制御 */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            プレゼンテーション制御
          </Typography>
          <ButtonGroup variant="contained" fullWidth>
            {!isPresenting ? (
              <Button
                startIcon={<PlayArrow />}
                onClick={handleStart}
                disabled={!canControl || isStarting}
                color="success"
                size="large"
              >
                {isStarting ? '開始中...' : 'プレゼンテーション開始'}
              </Button>
            ) : (
              <Button
                startIcon={<Stop />}
                onClick={handleStop}
                disabled={!canControl || isStopping}
                color="error"
                size="large"
              >
                {isStopping ? '停止中...' : 'プレゼンテーション停止'}
              </Button>
            )}
          </ButtonGroup>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* スライド制御 */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            スライド制御
          </Typography>

          {/* スライド位置表示 */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="body2" sx={{ minWidth: 120 }}>
              {currentSlideIndex + 1} / {totalSlides}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={
                totalSlides > 0
                  ? ((currentSlideIndex + 1) / totalSlides) * 100
                  : 0
              }
              sx={{ flexGrow: 1, mx: 2 }}
            />
            <Typography variant="body2" color="text.secondary">
              {totalSlides > 0
                ? Math.round(((currentSlideIndex + 1) / totalSlides) * 100)
                : 0}
              %
            </Typography>
          </Box>

          {/* スライドナビゲーション */}
          <ButtonGroup variant="outlined" fullWidth disabled={!isPresenting}>
            <Button
              startIcon={<NavigateBefore />}
              onClick={handlePrevSlide}
              disabled={
                !canControl || isChangingSlide || isFirstSlide || !isPresenting
              }
            >
              前へ
            </Button>
            <Button
              startIcon={<NavigateNext />}
              onClick={handleNextSlide}
              disabled={
                !canControl || isChangingSlide || isLastSlide || !isPresenting
              }
            >
              次へ
            </Button>
          </ButtonGroup>
        </Box>

        {/* 接続状態表示 */}
        <Box
          sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}
        >
          <Typography variant="body2" color="text.secondary">
            接続状態:
            <Box
              component="span"
              sx={{
                ml: 1,
                px: 1,
                py: 0.5,
                borderRadius: 1,
                fontSize: '0.75rem',
                fontWeight: 'medium',
                backgroundColor: isSocketConnected
                  ? 'success.light'
                  : 'error.light',
                color: isSocketConnected
                  ? 'success.contrastText'
                  : 'error.contrastText',
              }}
            >
              {isSocketConnected ? '接続済み' : '未接続'}
            </Box>
            {connectionQuality !== 'disconnected' && (
              <Box
                component="span"
                sx={{
                  ml: 1,
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  fontSize: '0.75rem',
                  backgroundColor:
                    connectionQuality === 'excellent'
                      ? 'success.light'
                      : connectionQuality === 'good'
                        ? 'info.light'
                        : 'warning.light',
                }}
              >
                品質:{' '}
                {connectionQuality === 'excellent'
                  ? '優秀'
                  : connectionQuality === 'good'
                    ? '良好'
                    : '低品質'}
              </Box>
            )}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default RealtimeControls;
