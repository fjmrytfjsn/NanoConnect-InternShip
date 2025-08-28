/**
 * プレゼンテーション設定フォームコンポーネント
 */

import React, { useCallback } from 'react';
import {
  TextField,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  InputAdornment,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon
} from '@mui/icons-material';

import { PresentationSettings, ValidationError } from '../../../types/presentation';

interface SettingsFormProps {
  data: PresentationSettings;
  onChange: (data: PresentationSettings) => void;
  errors: ValidationError[];
}

const SettingsForm: React.FC<SettingsFormProps> = ({
  data,
  onChange,
  errors
}) => {
  // エラー取得ヘルパー
  const getFieldError = (field: string): string | undefined => {
    return errors.find(error => error.field === field)?.message;
  };

  // 設定値更新ヘルパー
  const updateSetting = useCallback((key: keyof PresentationSettings, value: unknown) => {
    onChange({
      ...data,
      [key]: value
    });
  }, [data, onChange]);

  // スイッチ変更ハンドラー
  const handleSwitchChange = useCallback((key: keyof PresentationSettings) => 
    (event: React.ChangeEvent<HTMLInputElement>) => {
      updateSetting(key, event.target.checked);
    }, [updateSetting]);

  // 数値入力変更ハンドラー
  const handleNumberChange = useCallback((key: keyof PresentationSettings) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      updateSetting(key, value === '' ? undefined : parseInt(value, 10));
    }, [updateSetting]);

  return (
    <Box>
      {/* 基本設定 */}
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        基本設定
      </Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <FormControlLabel
            control={
              <Switch
                checked={data.allowAnonymousAnswers}
                onChange={handleSwitchChange('allowAnonymousAnswers')}
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                匿名回答を許可
                <Tooltip title="参加者が名前を入力せずに回答できるようになります">
                  <IconButton size="small" sx={{ ml: 0.5 }}>
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            }
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControlLabel
            control={
              <Switch
                checked={data.preventDuplicateAnswers}
                onChange={handleSwitchChange('preventDuplicateAnswers')}
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                重複回答を防止
                <Tooltip title="同じ参加者が複数回回答することを防ぎます">
                  <IconButton size="small" sx={{ ml: 0.5 }}>
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            }
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControlLabel
            control={
              <Switch
                checked={data.showResultsToParticipants}
                onChange={handleSwitchChange('showResultsToParticipants')}
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                参加者に結果を表示
                <Tooltip title="投票結果をリアルタイムで参加者に表示します">
                  <IconButton size="small" sx={{ ml: 0.5 }}>
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            }
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControlLabel
            control={
              <Switch
                checked={data.contentFilter}
                onChange={handleSwitchChange('contentFilter')}
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                不適切投稿フィルター
                <Tooltip title="不適切な内容を含む投稿を自動的にフィルタリングします">
                  <IconButton size="small" sx={{ ml: 0.5 }}>
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            }
          />
        </Grid>
      </Grid>

      {/* 参加制限設定 */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">参加制限設定</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="最大参加人数"
                placeholder="制限なし"
                value={data.maxParticipants || ''}
                onChange={handleNumberChange('maxParticipants')}
                error={Boolean(getFieldError('maxParticipants'))}
                helperText={getFieldError('maxParticipants') || '空欄の場合は制限なし'}
                InputProps={{
                  inputProps: { min: 1, max: 10000 },
                  endAdornment: <InputAdornment position="end">人</InputAdornment>
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="アクセスコード有効期限"
                value={data.accessCodeExpirationMinutes || ''}
                onChange={handleNumberChange('accessCodeExpirationMinutes')}
                error={Boolean(getFieldError('accessCodeExpirationMinutes'))}
                helperText={getFieldError('accessCodeExpirationMinutes') || '空欄の場合は無期限'}
                InputProps={{
                  inputProps: { min: 5, max: 1440 },
                  endAdornment: <InputAdornment position="end">分</InputAdornment>
                }}
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* 高度な設定 */}
      <Accordion sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">高度な設定</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="IPアドレス制限"
                placeholder="例: 192.168.1.0/24, 10.0.0.1"
                value={data.ipRestriction ? data.ipRestriction.join('\n') : ''}
                onChange={(event) => {
                  const value = event.target.value;
                  const ipList = value ? value.split('\n').filter(ip => ip.trim()) : undefined;
                  updateSetting('ipRestriction', ipList);
                }}
                helperText="特定のIPアドレスやネットワークからのアクセスのみを許可します。1行に1つのIPアドレス/ネットワークを入力してください。空欄の場合は制限なし。"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* 設定サマリー */}
      <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          設定サマリー
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • 匿名回答: {data.allowAnonymousAnswers ? '許可' : '不許可'}
          <br />
          • 重複回答防止: {data.preventDuplicateAnswers ? '有効' : '無効'}
          <br />
          • 結果表示: {data.showResultsToParticipants ? '参加者に表示' : '非表示'}
          <br />
          • 最大参加人数: {data.maxParticipants ? `${data.maxParticipants}人` : '制限なし'}
          <br />
          • アクセスコード有効期限: {data.accessCodeExpirationMinutes ? `${data.accessCodeExpirationMinutes}分` : '無期限'}
          <br />
          • 不適切投稿フィルター: {data.contentFilter ? '有効' : '無効'}
          <br />
          • IPアドレス制限: {data.ipRestriction && data.ipRestriction.length > 0 ? `${data.ipRestriction.length}個の制限` : '制限なし'}
        </Typography>
      </Box>
    </Box>
  );
};

export default SettingsForm;