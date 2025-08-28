import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  FormControlLabel,
  Checkbox,
  Radio,
  RadioGroup,
  TextField,
  Button,
  Card,
  CardContent,
} from '@mui/material';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { SlideContent, SlideType } from '../../../../../shared/types/api';

// Chart.jsの登録
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface SlidePreviewProps {
  type: SlideType;
  content: SlideContent;
  title: string;
  mockData?: boolean;
}

interface MockResponseData {
  multipleChoice: { [option: string]: number };
  wordCloud: { [word: string]: number };
}

// モックデータ生成
const generateMockData = (type: SlideType, content: SlideContent): MockResponseData => {
  if (type === 'multiple_choice') {
    const mockData: { [option: string]: number } = {};
    content.options?.forEach((option) => {
      mockData[option] = Math.floor(Math.random() * 50) + 10;
    });
    return { multipleChoice: mockData, wordCloud: {} };
  } else {
    const mockWords = [
      '革新', '成長', '協力', '挑戦', '品質', '効率', '創造', '信頼',
      '顧客', '価値', '技術', '発展', '改善', '成功', '未来',
    ];
    const wordCloud: { [word: string]: number } = {};
    mockWords.forEach(word => {
      wordCloud[word] = Math.floor(Math.random() * 20) + 5;
    });
    return { multipleChoice: {}, wordCloud };
  }
};

export const SlidePreview: React.FC<SlidePreviewProps> = ({
  type,
  content,
  title,
  mockData = true,
}) => {
  const mockResponseData = useMemo(() => 
    mockData ? generateMockData(type, content) : null,
    [type, content, mockData]
  );

  const renderMultipleChoicePreview = () => {
    const options = content.options || [];
    const allowMultiple = content.settings?.allowMultiple || false;
    const showResultsEnabled = content.settings?.showResults !== false;

    return (
      <Box>
        {/* 質問表示 */}
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
          {content.question || '質問を入力してください'}
        </Typography>

        {/* 参加者の投票画面プレビュー */}
        <Paper sx={{ p: 3, mb: 3, bgcolor: 'grey.50' }}>
          <Typography variant="subtitle2" gutterBottom color="primary">
            参加者画面プレビュー
          </Typography>
          
          {allowMultiple ? (
            <Box>
              {options.map((option, index) => (
                <FormControlLabel
                  key={index}
                  control={<Checkbox />}
                  label={option}
                  sx={{ display: 'block', mb: 1 }}
                />
              ))}
            </Box>
          ) : (
            <RadioGroup>
              {options.map((option, index) => (
                <FormControlLabel
                  key={index}
                  value={option}
                  control={<Radio />}
                  label={option}
                  sx={{ mb: 1 }}
                />
              ))}
            </RadioGroup>
          )}

          <Button 
            variant="contained" 
            sx={{ mt: 2 }}
            disabled
          >
            投票する
          </Button>
        </Paper>

        {/* 結果表示プレビュー */}
        {showResultsEnabled && mockResponseData && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle2" gutterBottom color="secondary">
              結果表示プレビュー（サンプルデータ）
            </Typography>
            
            <Box sx={{ height: 300, mt: 2 }}>
              <Bar
                data={{
                  labels: options,
                  datasets: [
                    {
                      label: '投票数',
                      data: options.map(option => mockResponseData.multipleChoice[option] || 0),
                      backgroundColor: 'rgba(54, 162, 235, 0.8)',
                      borderColor: 'rgba(54, 162, 235, 1)',
                      borderWidth: 1,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
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
                }}
              />
            </Box>
            
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              総投票数: {Object.values(mockResponseData.multipleChoice).reduce((sum, count) => sum + count, 0)}
            </Typography>
          </Paper>
        )}
      </Box>
    );
  };

  const renderWordCloudPreview = () => {
    const maxWords = content.settings?.maxWords || 100;

    return (
      <Box>
        {/* 質問表示 */}
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
          {content.question || '質問を入力してください'}
        </Typography>

        {/* 参加者の入力画面プレビュー */}
        <Paper sx={{ p: 3, mb: 3, bgcolor: 'grey.50' }}>
          <Typography variant="subtitle2" gutterBottom color="primary">
            参加者画面プレビュー
          </Typography>
          
          <TextField
            placeholder="あなたの回答を入力してください..."
            multiline
            rows={3}
            fullWidth
            variant="outlined"
            sx={{ mb: 2 }}
            disabled
          />
          
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            50文字以内で入力してください
          </Typography>
          
          <Button 
            variant="contained" 
            disabled
          >
            送信する
          </Button>
        </Paper>

        {/* ワードクラウドプレビュー */}
        {mockResponseData && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle2" gutterBottom color="secondary">
              ワードクラウドプレビュー（サンプルデータ）
            </Typography>
            
            <Box 
              sx={{ 
                height: 300, 
                mt: 2, 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: 1,
                borderColor: 'grey.300',
                borderRadius: 1,
                bgcolor: 'background.paper',
              }}
            >
              {/* 簡易ワードクラウド表示 */}
              <Box sx={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: 2, 
                justifyContent: 'center',
                alignItems: 'center',
                p: 2,
              }}>
                {Object.entries(mockResponseData.wordCloud)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, maxWords)
                  .map(([word, count], index) => {
                    const fontSize = Math.max(14, Math.min(36, 14 + count * 2));
                    const opacity = Math.max(0.5, count / 20);
                    
                    return (
                      <Typography
                        key={index}
                        sx={{
                          fontSize: `${fontSize}px`,
                          fontWeight: count > 15 ? 'bold' : 'normal',
                          color: `rgba(25, 118, 210, ${opacity})`,
                          cursor: 'default',
                          userSelect: 'none',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            transform: 'scale(1.1)',
                          },
                        }}
                      >
                        {word}
                      </Typography>
                    );
                  })
                }
              </Box>
              
              <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                ワードクラウド（イメージ）
              </Typography>
            </Box>
            
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              回答数: {Object.values(mockResponseData.wordCloud).length} 語
            </Typography>
          </Paper>
        )}
      </Box>
    );
  };

  return (
    <Box>
      {/* タイトル表示 */}
      <Card sx={{ mb: 3, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            {title || 'スライドタイトル'}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            {type === 'multiple_choice' ? '多肢選択式' : 'ワードクラウド'}
          </Typography>
        </CardContent>
      </Card>

      {/* プレビュー内容 */}
      {type === 'multiple_choice' ? renderMultipleChoicePreview() : renderWordCloudPreview()}

      {/* プレビュー注意事項 */}
      <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
        <Typography variant="body2" color="info.contrastText">
          💡 これはプレビューです。実際の投票画面では、参加者はスマートフォンやパソコンから回答できます。
        </Typography>
      </Box>
    </Box>
  );
};