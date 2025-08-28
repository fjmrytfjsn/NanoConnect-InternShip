import React, { useState, useCallback } from 'react';
import {
  Box,
  TextField,
  Button,
  IconButton,
  Typography,
  FormControlLabel,
  Switch,
  Chip,
  Paper,
  Divider,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import {
  Add,
  Delete,
  DragHandle,
  Timer,
  Image as ImageIcon,
  BarChart,
  PieChart,
} from '@mui/icons-material';
import { SlideContent } from '../../../../../shared/types/api';

interface MultipleChoiceEditorProps {
  content: SlideContent;
  title: string;
  onContentChange: (content: SlideContent) => void;
  onTitleChange: (title: string) => void;
}

export const MultipleChoiceEditor: React.FC<MultipleChoiceEditorProps> = ({
  content,
  title,
  onContentChange,
  onTitleChange,
}) => {
  const [options, setOptions] = useState<string[]>(content.options || ['選択肢1', '選択肢2']);
  const [question, setQuestion] = useState<string>(content.question || '');
  const [timeLimit, setTimeLimit] = useState<number>(60);
  const [allowMultiple, setAllowMultiple] = useState<boolean>(
    content.settings?.allowMultiple || false
  );
  const [showResults, setShowResults] = useState<boolean>(
    content.settings?.showResults !== false
  );
  const [resultDisplayType, setResultDisplayType] = useState<'bar' | 'pie'>('bar');

  const updateContent = useCallback(
    (updates: Partial<{
      question: string;
      options: string[];
      allowMultiple: boolean;
      showResults: boolean;
    }>) => {
      const newContent: SlideContent = {
        ...content,
        question: updates.question !== undefined ? updates.question : question,
        options: updates.options !== undefined ? updates.options : options,
        settings: {
          ...content.settings,
          allowMultiple: updates.allowMultiple !== undefined ? updates.allowMultiple : allowMultiple,
          showResults: updates.showResults !== undefined ? updates.showResults : showResults,
        },
      };
      onContentChange(newContent);
    },
    [content, question, options, allowMultiple, showResults, onContentChange]
  );

  const handleQuestionChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newQuestion = event.target.value;
      setQuestion(newQuestion);
      updateContent({ question: newQuestion });
    },
    [updateContent]
  );

  const handleOptionChange = useCallback(
    (index: number, value: string) => {
      const newOptions = [...options];
      newOptions[index] = value;
      setOptions(newOptions);
      updateContent({ options: newOptions });
    },
    [options, updateContent]
  );

  const handleAddOption = useCallback(() => {
    const newOptions = [...options, `選択肢${options.length + 1}`];
    setOptions(newOptions);
    updateContent({ options: newOptions });
  }, [options, updateContent]);

  const handleDeleteOption = useCallback(
    (index: number) => {
      if (options.length <= 2) return; // 最低2つの選択肢を保持

      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
      updateContent({ options: newOptions });
    },
    [options, updateContent]
  );

  // 今回は実装を保留（ドラッグ&ドロップは複雑になるため）
  // const handleMoveOption = useCallback(
  //   (fromIndex: number, toIndex: number) => {
  //     const newOptions = [...options];
  //     const [removed] = newOptions.splice(fromIndex, 1);
  //     newOptions.splice(toIndex, 0, removed);
  //     setOptions(newOptions);
  //     updateContent({ options: newOptions });
  //   },
  //   [options, updateContent]
  // );

  const handleAllowMultipleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newAllowMultiple = event.target.checked;
      setAllowMultiple(newAllowMultiple);
      updateContent({ allowMultiple: newAllowMultiple });
    },
    [updateContent]
  );

  const handleShowResultsChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newShowResults = event.target.checked;
      setShowResults(newShowResults);
      updateContent({ showResults: newShowResults });
    },
    [updateContent]
  );

  return (
    <Box>
      {/* スライドタイトル */}
      <Box sx={{ mb: 3 }}>
        <TextField
          label="スライドタイトル"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          fullWidth
          variant="outlined"
          sx={{ mb: 2 }}
        />
      </Box>

      {/* 質問設定 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          質問設定
        </Typography>
        <TextField
          label="質問文"
          value={question}
          onChange={handleQuestionChange}
          fullWidth
          multiline
          rows={3}
          placeholder="参加者に聞きたい質問を入力してください..."
          variant="outlined"
          sx={{ mb: 2 }}
        />

        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ImageIcon />}
            size="small"
            disabled // 今回は画像アップロード機能は省略
          >
            画像を追加
          </Button>
          <TextField
            label="制限時間（秒）"
            type="number"
            value={timeLimit}
            onChange={(e) => setTimeLimit(Number(e.target.value))}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Timer />
                </InputAdornment>
              ),
            }}
            sx={{ width: 150 }}
          />
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* 選択肢管理 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          選択肢管理
        </Typography>
        
        {options.map((option, index) => (
          <Paper key={index} sx={{ p: 2, mb: 2, border: 1, borderColor: 'grey.300' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton size="small" sx={{ cursor: 'grab' }}>
                <DragHandle />
              </IconButton>
              <Chip 
                label={`${index + 1}`} 
                size="small" 
                color="primary" 
                sx={{ minWidth: 30 }} 
              />
              <TextField
                value={option}
                onChange={(e) => handleOptionChange(index, e.target.value)}
                placeholder="選択肢を入力..."
                variant="outlined"
                size="small"
                fullWidth
              />
              <Tooltip title="選択肢を削除">
                <IconButton
                  onClick={() => handleDeleteOption(index)}
                  disabled={options.length <= 2}
                  color="error"
                  size="small"
                >
                  <Delete />
                </IconButton>
              </Tooltip>
            </Box>
          </Paper>
        ))}

        <Button
          onClick={handleAddOption}
          startIcon={<Add />}
          variant="outlined"
          disabled={options.length >= 10} // 最大10選択肢
        >
          選択肢を追加
        </Button>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* 表示オプション */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          表示オプション
        </Typography>

        <FormControlLabel
          control={
            <Switch
              checked={allowMultiple}
              onChange={handleAllowMultipleChange}
            />
          }
          label="複数選択を許可"
          sx={{ mb: 1, display: 'block' }}
        />

        <FormControlLabel
          control={
            <Switch
              checked={showResults}
              onChange={handleShowResultsChange}
            />
          }
          label="リアルタイム結果表示"
          sx={{ mb: 2, display: 'block' }}
        />

        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Typography variant="body2" sx={{ alignSelf: 'center', mr: 1 }}>
            結果表示形式:
          </Typography>
          <Button
            variant={resultDisplayType === 'bar' ? 'contained' : 'outlined'}
            startIcon={<BarChart />}
            size="small"
            onClick={() => setResultDisplayType('bar')}
          >
            棒グラフ
          </Button>
          <Button
            variant={resultDisplayType === 'pie' ? 'contained' : 'outlined'}
            startIcon={<PieChart />}
            size="small"
            onClick={() => setResultDisplayType('pie')}
          >
            円グラフ
          </Button>
        </Box>
      </Box>
    </Box>
  );
};