/**
 * RealtimeSlide - リアルタイムスライド表示・操作コンポーネント
 * 参加者画面でのスライド表示と回答機能を提供
 */

import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
} from '@mui/material';
import { socketSelectors } from '@/store/slices/socketSlice';
import { VotingForm } from '@/components/participant/VotingForm';

/**
 * プロパティの型定義
 */
interface RealtimeSlideProps {
  /** プレゼンテーションデータ */
  presentationData: any;
  /** セッションID */
  sessionId: string;
}

/**
 * RealtimeSlideコンポーネント
 */
export const RealtimeSlide: React.FC<RealtimeSlideProps> = ({
  presentationData,
  sessionId,
}) => {
  // Redux状態の取得
  const responses = useSelector(socketSelectors.getResponses);
  const analytics = useSelector(socketSelectors.getAnalytics);

  // 現在のスライド情報
  const currentSlideIndex = presentationData.currentSlideIndex || 0;
  const currentSlide = presentationData.slides?.[currentSlideIndex];
  
  // スライド進捗の計算
  const slideProgress = useMemo(() => {
    if (!presentationData.slides) return 0;
    return ((currentSlideIndex + 1) / presentationData.slides.length) * 100;
  }, [currentSlideIndex, presentationData.slides]);

  // 現在のスライドに対する自分の回答を確認
  const hasUserResponded = useMemo(() => {
    if (!currentSlide || !responses) return false;
    return responses.some(response => response.slideId === currentSlide.id);
  }, [currentSlide, responses]);

  // スライドが存在しない場合
  if (!currentSlide) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" align="center">
            スライドを読み込み中...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {/* スライド進捗バー */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            スライド進捗
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {currentSlideIndex + 1} / {presentationData.slides?.length || 0}
          </Typography>
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={slideProgress} 
          sx={{ height: 6, borderRadius: 3 }}
        />
      </Box>

      {/* スライドコンテンツ */}
      <Card>
        <CardContent>
          {/* スライドタイトル */}
          <Typography 
            variant="h4" 
            component="h2" 
            gutterBottom 
            sx={{ textAlign: 'center', mb: 3, fontWeight: 'bold' }}
          >
            {currentSlide.title}
          </Typography>

          {/* スライド質問 */}
          {currentSlide.question && (
            <Typography 
              variant="h6" 
              component="div" 
              sx={{ textAlign: 'center', mb: 4, color: 'text.secondary' }}
            >
              {currentSlide.question}
            </Typography>
          )}

          {/* 投票フォーム */}
          <VotingForm
            slide={currentSlide}
            presentationId={presentationData.id}
            sessionId={sessionId}
            hasUserResponded={hasUserResponded}
            analytics={analytics}
          />
        </CardContent>
      </Card>
    </Box>
  );
};

export default RealtimeSlide;