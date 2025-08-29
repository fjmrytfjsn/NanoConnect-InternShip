/**
 * VotingForm - リアルタイム投票フォームコンポーネント
 * 多肢選択式およびワードクラウド形式の投票フォームを提供
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Button,
  TextField,
  Typography,
  Alert,
  Grid,
  Chip,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Send,
  CheckCircle,
  BarChart,
} from '@mui/icons-material';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useSocket } from '@/hooks/useSocket';

// Chart.jsの設定
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

/**
 * プロパティの型定義
 */
interface VotingFormProps {
  /** スライド情報 */
  slide: any;
  /** プレゼンテーションID */
  presentationId: string;
  /** セッションID */
  sessionId: string;
  /** ユーザーが回答済みかどうか */
  hasUserResponded: boolean;
  /** 分析データ */
  analytics?: any;
}

/**
 * VotingFormコンポーネント
 */
export const VotingForm: React.FC<VotingFormProps> = ({
  slide,
  presentationId,
  sessionId,
  hasUserResponded,
  analytics,
}) => {
  const { submitResponse } = useSocket();

  // ローカル状態
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [textResponse, setTextResponse] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  /**
   * 選択肢クリックハンドラー（多肢選択式）
   */
  const handleOptionSelect = useCallback((option: string) => {
    if (hasUserResponded) return;

    setSelectedOptions(prev => {
      if (slide.allowMultiple) {
        // 複数選択可能
        return prev.includes(option)
          ? prev.filter(opt => opt !== option)
          : [...prev, option];
      } else {
        // 単一選択
        return [option];
      }
    });
    setSubmitError(null);
  }, [slide.allowMultiple, hasUserResponded]);

  /**
   * テキスト入力ハンドラー（ワードクラウド）
   */
  const handleTextChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (hasUserResponded) return;
    setTextResponse(event.target.value);
    setSubmitError(null);
  }, [hasUserResponded]);

  /**
   * 回答送信処理
   */
  const handleSubmit = useCallback(async () => {
    let responseData: any;

    if (slide.type === 'multiple_choice') {
      if (selectedOptions.length === 0) {
        setSubmitError('選択肢を選んでください');
        return;
      }
      responseData = { selectedOptions };
    } else if (slide.type === 'word_cloud') {
      if (!textResponse.trim()) {
        setSubmitError('回答を入力してください');
        return;
      }
      responseData = { text: textResponse.trim() };
    } else {
      setSubmitError('サポートされていないスライドタイプです');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      submitResponse(
        presentationId,
        slide.id,
        responseData,
        sessionId,
        (response: any) => {
          if (response.success) {
            setSubmitSuccess(true);
            console.log('✅ 回答送信成功');
          } else {
            const errorMessage = response.error?.message || '回答の送信に失敗しました';
            setSubmitError(errorMessage);
            console.error('❌ 回答送信失敗:', response.error);
          }
          setIsSubmitting(false);
        }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
      setSubmitError(errorMessage);
      setIsSubmitting(false);
      console.error('❌ 回答送信エラー:', error);
    }
  }, [
    slide,
    selectedOptions,
    textResponse,
    presentationId,
    sessionId,
    submitResponse,
  ]);

  /**
   * 回答可能かどうかを判定
   */
  const canSubmit = useMemo(() => {
    if (hasUserResponded || isSubmitting) return false;
    
    if (slide.type === 'multiple_choice') {
      return selectedOptions.length > 0;
    }
    if (slide.type === 'word_cloud') {
      return textResponse.trim().length > 0;
    }
    return false;
  }, [hasUserResponded, isSubmitting, slide.type, selectedOptions, textResponse]);

  /**
   * グラフデータの生成
   */
  const chartData = useMemo(() => {
    if (!analytics || !analytics.responseData) return null;

    const data = analytics.responseData;
    const labels = Object.keys(data);
    const values = Object.values(data) as number[];

    return {
      labels,
      datasets: [
        {
          label: '票数',
          data: values,
          backgroundColor: [
            '#FF6384',
            '#36A2EB',
            '#FFCE56',
            '#4BC0C0',
            '#9966FF',
            '#FF9F40',
            '#FF6384',
            '#C9CBCF',
          ],
          borderColor: [
            '#FF6384',
            '#36A2EB',
            '#FFCE56',
            '#4BC0C0',
            '#9966FF',
            '#FF9F40',
            '#FF6384',
            '#C9CBCF',
          ],
          borderWidth: 1,
        },
      ],
    };
  }, [analytics]);

  /**
   * グラフオプション
   */
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: '投票結果',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  return (
    <Box>
      {/* 回答済みメッセージ */}
      {(hasUserResponded || submitSuccess) && (
        <Alert 
          severity="success" 
          icon={<CheckCircle />}
          sx={{ mb: 3 }}
        >
          すでに回答済みです。ありがとうございました！
        </Alert>
      )}

      {/* エラーメッセージ */}
      {submitError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {submitError}
        </Alert>
      )}

      {/* 多肢選択式投票フォーム */}
      {slide.type === 'multiple_choice' && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="body1" gutterBottom sx={{ mb: 2 }}>
            {slide.allowMultiple ? '複数選択可能です' : '一つ選択してください'}
          </Typography>
          
          <Grid container spacing={2}>
            {slide.options?.map((option: string, index: number) => (
              <Grid item xs={12} sm={6} key={index}>
                <Card 
                  sx={{ 
                    cursor: hasUserResponded || submitSuccess ? 'default' : 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': !hasUserResponded && !submitSuccess ? {
                      transform: 'translateY(-2px)',
                      boxShadow: 3,
                    } : {},
                  }}
                  onClick={() => handleOptionSelect(option)}
                >
                  <CardContent sx={{ py: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          fontWeight: selectedOptions.includes(option) ? 'bold' : 'normal' 
                        }}
                      >
                        {option}
                      </Typography>
                      {selectedOptions.includes(option) && !hasUserResponded && (
                        <Chip
                          label="選択中"
                          size="small"
                          color="primary"
                          className="Mui-selected"
                        />
                      )}
                      {analytics?.responseData?.[option] && (
                        <Chip
                          label={`${analytics.responseData[option]}票`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* 送信ボタン */}
          {!hasUserResponded && !submitSuccess && (
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Button
                variant="contained"
                size="large"
                startIcon={isSubmitting ? <CircularProgress size={20} /> : <Send />}
                onClick={handleSubmit}
                disabled={!canSubmit}
                sx={{ minWidth: 200 }}
              >
                {isSubmitting ? '送信中...' : '回答を送信'}
              </Button>
            </Box>
          )}
        </Box>
      )}

      {/* ワードクラウド投票フォーム */}
      {slide.type === 'word_cloud' && (
        <Box sx={{ mb: 4 }}>
          <TextField
            fullWidth
            label="回答を入力"
            placeholder="あなたの回答を入力してください"
            value={textResponse}
            onChange={handleTextChange}
            disabled={hasUserResponded || submitSuccess}
            multiline
            rows={3}
            inputProps={{
              maxLength: 100,
              'aria-label': '回答を入力',
            }}
            helperText={`${textResponse.length}/100文字`}
            sx={{ mb: 3 }}
          />

          {/* 送信ボタン */}
          {!hasUserResponded && !submitSuccess && (
            <Box sx={{ textAlign: 'center' }}>
              <Button
                variant="contained"
                size="large"
                startIcon={isSubmitting ? <CircularProgress size={20} /> : <Send />}
                onClick={handleSubmit}
                disabled={!canSubmit}
                sx={{ minWidth: 200 }}
              >
                {isSubmitting ? '送信中...' : '回答を送信'}
              </Button>
            </Box>
          )}
        </Box>
      )}

      {/* リアルタイム結果表示 */}
      {analytics && chartData && slide.type === 'multiple_choice' && (
        <Box>
          <Divider sx={{ my: 3 }}>
            <Chip icon={<BarChart />} label="リアルタイム結果" />
          </Divider>

          <Box sx={{ mb: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              総回答数: {analytics.totalResponses}人
            </Typography>
          </Box>

          <Box sx={{ height: 300 }}>
            <Bar data={chartData} options={chartOptions} role="img" aria-label="投票結果" />
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default VotingForm;