import React, { useState, useCallback } from 'react';
import {
  Box,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Divider,
  Chip,
  Button,
  FormControlLabel,
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { Add, ExpandMore, Palette, FilterList } from '@mui/icons-material';
import { SlideContent } from '../../../../../shared/types/api';

interface WordCloudEditorProps {
  content: SlideContent;
  title: string;
  onContentChange: (content: SlideContent) => void;
  onTitleChange: (title: string) => void;
}

const COLOR_THEMES = [
  {
    id: 'default',
    name: 'デフォルト',
    colors: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728'],
  },
  {
    id: 'warm',
    name: '暖色系',
    colors: ['#ff6b6b', '#feca57', '#ff9ff3', '#54a0ff'],
  },
  {
    id: 'cool',
    name: '寒色系',
    colors: ['#5f27cd', '#00d2d3', '#1dd1a1', '#576574'],
  },
  {
    id: 'monochrome',
    name: 'モノクローム',
    colors: ['#2c2c54', '#40407a', '#706fd3', '#f8f8f8'],
  },
];

const SHAPE_OPTIONS = [
  { id: 'circle', name: '円形' },
  { id: 'square', name: '正方形' },
  { id: 'heart', name: 'ハート' },
  { id: 'star', name: '星形' },
];

export const WordCloudEditor: React.FC<WordCloudEditorProps> = ({
  content,
  title,
  onContentChange,
  onTitleChange,
}) => {
  const [question, setQuestion] = useState<string>(content.question || '');
  const [maxWords, setMaxWords] = useState<number>(
    content.settings?.maxWords || 100
  );
  const [maxCharacters, setMaxCharacters] = useState<number>(50);
  const [prohibitedWords, setProhibitedWords] = useState<string[]>([]);
  const [newProhibitedWord, setNewProhibitedWord] = useState<string>('');
  const [colorTheme, setColorTheme] = useState<string>('default');
  const [shape, setShape] = useState<string>('circle');
  const [minFontSize, setMinFontSize] = useState<number>(12);
  const [maxFontSize, setMaxFontSize] = useState<number>(60);
  const [minWordCount, setMinWordCount] = useState<number>(1);
  const [enableSynonymGrouping, setEnableSynonymGrouping] =
    useState<boolean>(false);
  // 今回は実装を保留
  // const [synonymGroups, setSynonymGroups] = useState<string[]>([]);

  const updateContent = useCallback(
    (
      updates: Partial<{
        question: string;
        maxWords: number;
        maxCharacters: number;
      }>
    ) => {
      const newContent: SlideContent = {
        ...content,
        question: updates.question !== undefined ? updates.question : question,
        settings: {
          ...content.settings,
          maxWords:
            updates.maxWords !== undefined ? updates.maxWords : maxWords,
        },
      };
      onContentChange(newContent);
    },
    [content, question, maxWords, onContentChange]
  );

  const handleQuestionChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newQuestion = event.target.value;
      setQuestion(newQuestion);
      updateContent({ question: newQuestion });
    },
    [updateContent]
  );

  const handleMaxWordsChange = useCallback(
    (event: Event, value: number | number[]) => {
      const newMaxWords = Array.isArray(value) ? value[0] : value;
      setMaxWords(newMaxWords);
      updateContent({ maxWords: newMaxWords });
    },
    [updateContent]
  );

  const handleAddProhibitedWord = useCallback(() => {
    if (
      newProhibitedWord.trim() &&
      !prohibitedWords.includes(newProhibitedWord.trim())
    ) {
      setProhibitedWords([...prohibitedWords, newProhibitedWord.trim()]);
      setNewProhibitedWord('');
    }
  }, [prohibitedWords, newProhibitedWord]);

  const handleDeleteProhibitedWord = useCallback(
    (wordToDelete: string) => {
      setProhibitedWords(
        prohibitedWords.filter((word) => word !== wordToDelete)
      );
    },
    [prohibitedWords]
  );

  const handleKeyPress = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleAddProhibitedWord();
      }
    },
    [handleAddProhibitedWord]
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
          placeholder="参加者に入力してもらいたい内容を質問してください..."
          variant="outlined"
          sx={{ mb: 2 }}
        />

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>
            文字数制限: {maxCharacters}文字
          </Typography>
          <Slider
            value={maxCharacters}
            onChange={(_, value) =>
              setMaxCharacters(Array.isArray(value) ? value[0] : value)
            }
            min={10}
            max={200}
            step={10}
            marks
            valueLabelDisplay="auto"
            sx={{ mb: 1 }}
          />
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* 表示オプション */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h6"
          gutterBottom
          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <Palette />
          表示オプション
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>
            最大表示単語数: {maxWords}語
          </Typography>
          <Slider
            value={maxWords}
            onChange={handleMaxWordsChange}
            min={20}
            max={200}
            step={10}
            marks
            valueLabelDisplay="auto"
            sx={{ mb: 2 }}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>カラーテーマ</InputLabel>
            <Select
              value={colorTheme}
              onChange={(e) => setColorTheme(e.target.value)}
              label="カラーテーマ"
              size="small"
            >
              {COLOR_THEMES.map((theme) => (
                <MenuItem key={theme.id} value={theme.id}>
                  {theme.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>形状</InputLabel>
            <Select
              value={shape}
              onChange={(e) => setShape(e.target.value)}
              label="形状"
              size="small"
            >
              {SHAPE_OPTIONS.map((option) => (
                <MenuItem key={option.id} value={option.id}>
                  {option.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>
            フォントサイズ範囲: {minFontSize}px - {maxFontSize}px
          </Typography>
          <Slider
            value={[minFontSize, maxFontSize]}
            onChange={(_, value) => {
              const range = Array.isArray(value)
                ? value
                : [minFontSize, maxFontSize];
              setMinFontSize(range[0]);
              setMaxFontSize(range[1]);
            }}
            min={8}
            max={80}
            step={2}
            marks
            valueLabelDisplay="auto"
            sx={{ mb: 1 }}
          />
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* フィルタリング設定 */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterList />
            フィルタリング設定
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            {/* 禁止ワード設定 */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                禁止ワード
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  label="禁止ワードを追加"
                  value={newProhibitedWord}
                  onChange={(e) => setNewProhibitedWord(e.target.value)}
                  onKeyPress={handleKeyPress}
                  size="small"
                  sx={{ flexGrow: 1 }}
                />
                <Button
                  onClick={handleAddProhibitedWord}
                  startIcon={<Add />}
                  variant="outlined"
                  size="small"
                  disabled={!newProhibitedWord.trim()}
                >
                  追加
                </Button>
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {prohibitedWords.map((word, index) => (
                  <Chip
                    key={index}
                    label={word}
                    onDelete={() => handleDeleteProhibitedWord(word)}
                    color="error"
                    variant="outlined"
                    size="small"
                  />
                ))}
              </Box>
            </Box>

            {/* 最小出現回数設定 */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                最小出現回数: {minWordCount}回
              </Typography>
              <Slider
                value={minWordCount}
                onChange={(_, value) =>
                  setMinWordCount(Array.isArray(value) ? value[0] : value)
                }
                min={1}
                max={10}
                step={1}
                marks
                valueLabelDisplay="auto"
                sx={{ mb: 2 }}
              />
            </Box>

            {/* 同義語統合設定 */}
            <Box sx={{ mb: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={enableSynonymGrouping}
                    onChange={(e) => setEnableSynonymGrouping(e.target.checked)}
                  />
                }
                label="同義語統合を有効にする"
                sx={{ mb: 1, display: 'block' }}
              />
              {enableSynonymGrouping && (
                <Typography variant="body2" color="textSecondary">
                  類似した意味の単語を自動的にグループ化します
                </Typography>
              )}
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};
