/**
 * 基本情報入力フォームコンポーネント
 */

import React, { useCallback } from 'react';
import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  Typography,
  Autocomplete,
  SelectChangeEvent,
} from '@mui/material';

import {
  PresentationCategory,
  ValidationError,
} from '../../../types/presentation';

// カテゴリー選択肢
const categoryOptions: { value: PresentationCategory; label: string }[] = [
  { value: 'business', label: 'ビジネス' },
  { value: 'education', label: '教育' },
  { value: 'entertainment', label: 'エンターテイメント' },
  { value: 'research', label: '研究' },
  { value: 'other', label: 'その他' },
];

// 人気のタグ例（サジェスト用）
const popularTags = [
  'プレゼンテーション',
  '投票',
  'インタラクティブ',
  'リアルタイム',
  'フィードバック',
  'アンケート',
  'ワークショップ',
  '研修',
  '授業',
  'セミナー',
  '会議',
  'ブレインストーミング',
];

interface BasicInfoFormData {
  title: string;
  description?: string;
  category: PresentationCategory;
  tags: string[];
}

interface BasicInfoFormProps {
  data: BasicInfoFormData;
  onChange: (data: BasicInfoFormData) => void;
  errors: ValidationError[];
}

const BasicInfoForm: React.FC<BasicInfoFormProps> = ({
  data,
  onChange,
  errors,
}) => {
  // エラー取得ヘルパー
  const getFieldError = (field: string): string | undefined => {
    return errors.find((error) => error.field === field)?.message;
  };

  // タイトル変更
  const handleTitleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange({
        ...data,
        title: event.target.value,
      });
    },
    [data, onChange]
  );

  // 説明文変更
  const handleDescriptionChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange({
        ...data,
        description: event.target.value,
      });
    },
    [data, onChange]
  );

  // カテゴリー変更
  const handleCategoryChange = useCallback(
    (event: SelectChangeEvent<PresentationCategory>) => {
      onChange({
        ...data,
        category: event.target.value as PresentationCategory,
      });
    },
    [data, onChange]
  );

  // タグ変更
  const handleTagsChange = useCallback(
    (_event: React.SyntheticEvent<Element, Event>, newValue: string[]) => {
      // 最大10個まで
      const limitedTags = newValue.slice(0, 10);
      onChange({
        ...data,
        tags: limitedTags,
      });
    },
    [data, onChange]
  );

  return (
    <Box>
      {/* プレゼンテーションタイトル */}
      <TextField
        fullWidth
        required
        label="プレゼンテーションタイトル"
        value={data.title}
        onChange={handleTitleChange}
        error={Boolean(getFieldError('title'))}
        helperText={
          getFieldError('title') ||
          '魅力的なタイトルを入力してください（最大100文字）'
        }
        inputProps={{ maxLength: 100 }}
        sx={{ mb: 3 }}
      />

      {/* 説明文 */}
      <TextField
        fullWidth
        multiline
        rows={4}
        label="説明文"
        placeholder="このプレゼンテーションの内容や目的を説明してください（任意）"
        value={data.description || ''}
        onChange={handleDescriptionChange}
        error={Boolean(getFieldError('description'))}
        helperText={
          getFieldError('description') ||
          '参加者に分かりやすい説明を入力してください（最大500文字）'
        }
        inputProps={{ maxLength: 500 }}
        sx={{ mb: 3 }}
      />

      {/* カテゴリー選択 */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>カテゴリー</InputLabel>
        <Select
          value={data.category}
          onChange={handleCategoryChange}
          label="カテゴリー"
        >
          {categoryOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* タグ入力 */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          タグ（最大10個）
        </Typography>
        <Autocomplete
          multiple
          freeSolo
          options={popularTags}
          value={data.tags}
          onChange={handleTagsChange}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => {
              // getTagPropsが返すpropsを取得（keyを含む）
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { key: _key, ...tagProps } = getTagProps({ index });
              return (
                <Chip
                  key={`tag-${index}-${option}`}
                  {...tagProps}
                  variant="outlined"
                  label={option}
                  size="small"
                />
              );
            })
          }
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="タグを入力してEnterキーで追加"
              helperText="プレゼンテーションを見つけやすくするためのタグを追加してください"
            />
          )}
          sx={{ mt: 1 }}
        />
      </Box>

      {/* 文字数カウンター */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
        <Typography variant="caption" color="text.secondary">
          タイトル: {data.title.length}/100文字
        </Typography>
        <Typography variant="caption" color="text.secondary">
          説明文: {(data.description || '').length}/500文字
        </Typography>
      </Box>
    </Box>
  );
};

export default BasicInfoForm;
