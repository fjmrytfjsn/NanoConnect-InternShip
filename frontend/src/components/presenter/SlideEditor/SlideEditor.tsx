import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Grid,
  Divider,
} from '@mui/material';
import { Quiz, Cloud } from '@mui/icons-material';
import {
  SlideInfo,
  SlideType,
  SlideContent,
} from '../../../../../shared/types/api';
import { MultipleChoiceEditor } from './MultipleChoiceEditor';
import { WordCloudEditor } from './WordCloudEditor';
import { SlidePreview } from './SlidePreview';

interface SlideEditorProps {
  slide?: SlideInfo;
  onSlideChange?: (slide: Partial<SlideInfo>) => void;
}

export const SlideEditor: React.FC<SlideEditorProps> = ({
  slide,
  onSlideChange,
}) => {
  const [slideType, setSlideType] = useState<SlideType>(
    slide?.type || 'multiple_choice'
  );
  const [slideContent, setSlideContent] = useState<SlideContent>(
    slide?.content || {
      question: '',
      options: [],
      settings: {
        allowMultiple: false,
        showResults: true,
        maxWords: 100,
      },
    }
  );
  const [slideTitle, setSlideTitle] = useState<string>(
    slide?.title || '新しいスライド'
  );

  const handleSlideTypeChange = useCallback(
    (event: React.MouseEvent<HTMLElement>, newType: SlideType | null) => {
      if (newType === null) return;

      setSlideType(newType);

      // スライドタイプ変更時の初期コンテンツ設定
      const initialContent: SlideContent = {
        question: slideContent.question,
        ...(newType === 'multiple_choice' && {
          options: slideContent.options?.length
            ? slideContent.options
            : ['選択肢1', '選択肢2'],
        }),
        settings: {
          ...slideContent.settings,
          ...(newType === 'word_cloud' && {
            maxWords: slideContent.settings?.maxWords || 100,
          }),
        },
      };

      setSlideContent(initialContent);

      // 親コンポーネントに変更を通知
      onSlideChange?.({
        type: newType,
        content: initialContent,
      });
    },
    [slideContent, onSlideChange]
  );

  const handleContentChange = useCallback(
    (content: SlideContent) => {
      setSlideContent(content);
      onSlideChange?.({
        content,
      });
    },
    [onSlideChange]
  );

  const handleTitleChange = useCallback(
    (title: string) => {
      setSlideTitle(title);
      onSlideChange?.({
        title,
      });
    },
    [onSlideChange]
  );

  return (
    <Box sx={{ p: 3, height: '100%' }}>
      <Grid container spacing={3} sx={{ height: '100%' }}>
        {/* エディタ部分 */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3, height: '100%', overflow: 'auto' }}>
            <Typography variant="h5" gutterBottom>
              スライドエディタ
            </Typography>

            {/* スライドタイプ選択 */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                スライドタイプ
              </Typography>
              <ToggleButtonGroup
                value={slideType}
                exclusive
                onChange={handleSlideTypeChange}
                aria-label="スライドタイプ選択"
                sx={{ mb: 2 }}
              >
                <ToggleButton value="multiple_choice" aria-label="多肢選択式">
                  <Quiz sx={{ mr: 1 }} />
                  多肢選択式
                </ToggleButton>
                <ToggleButton value="word_cloud" aria-label="ワードクラウド">
                  <Cloud sx={{ mr: 1 }} />
                  ワードクラウド
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <Divider />

            {/* エディタコンポーネント */}
            <Box sx={{ mt: 3 }}>
              {slideType === 'multiple_choice' ? (
                <MultipleChoiceEditor
                  content={slideContent}
                  title={slideTitle}
                  onContentChange={handleContentChange}
                  onTitleChange={handleTitleChange}
                />
              ) : (
                <WordCloudEditor
                  content={slideContent}
                  title={slideTitle}
                  onContentChange={handleContentChange}
                  onTitleChange={handleTitleChange}
                />
              )}
            </Box>
          </Paper>
        </Grid>

        {/* プレビュー部分 */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3, height: '100%', overflow: 'auto' }}>
            <Typography variant="h5" gutterBottom>
              プレビュー
            </Typography>
            <SlidePreview
              type={slideType}
              content={slideContent}
              title={slideTitle}
            />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
