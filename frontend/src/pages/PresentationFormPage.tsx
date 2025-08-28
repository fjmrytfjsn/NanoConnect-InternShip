/**
 * プレゼンテーション作成・編集フォームページ
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Button,
  AppBar,
  Toolbar,
  IconButton,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Save as SaveIcon,
  Preview as PreviewIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';

import {
  PresentationFormData,
  ValidationError,
  AutoSaveData,
} from '../types/presentation';
import BasicInfoForm from '../components/presenter/PresentationForm/BasicInfoForm';
import SettingsForm from '../components/presenter/PresentationForm/SettingsForm';
import PreviewCard from '../components/presenter/PresentationForm/PreviewCard';

// デフォルトフォームデータ
const defaultFormData: PresentationFormData = {
  title: '',
  description: '',
  category: 'other',
  tags: [],
  settings: {
    allowAnonymousAnswers: true,
    preventDuplicateAnswers: true,
    showResultsToParticipants: true,
    maxParticipants: undefined,
    accessCodeExpirationMinutes: 60,
    ipRestriction: undefined,
    contentFilter: true,
  },
};

interface PresentationFormPageProps {}

const PresentationFormPage: React.FC<PresentationFormPageProps> = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = Boolean(id);

  // フォーム状態
  const [formData, setFormData] =
    useState<PresentationFormData>(defaultFormData);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    []
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // スナックバー状態
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    'success' | 'error' | 'warning' | 'info'
  >('info');

  // 初期化処理
  useEffect(() => {
    if (isEditMode && id) {
      loadPresentationData(id);
    } else {
      // 新規作成時の下書き復元
      loadDraftData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEditMode]);

  // 既存プレゼンテーションデータの読み込み
  const loadPresentationData = async (presentationId: string) => {
    try {
      // TODO: APIからプレゼンテーションデータを取得
      // const response = await fetchPresentation(presentationId);
      // setFormData(response.data);
      console.log('プレゼンテーションデータを読み込み中...', presentationId);
    } catch (error) {
      console.error('プレゼンテーション読み込みエラー:', error);
      showSnackbar('プレゼンテーションの読み込みに失敗しました', 'error');
    }
  };

  // 下書きデータの読み込み
  const loadDraftData = () => {
    try {
      const draftData = localStorage.getItem('presentation-draft');
      if (draftData) {
        const autoSaveData: AutoSaveData = JSON.parse(draftData);
        setFormData(autoSaveData.formData);
        showSnackbar('下書きを復元しました', 'info');
      }
    } catch (error) {
      console.error('下書きデータ読み込みエラー:', error);
    }
  };

  // フォームデータ更新
  const handleFormDataChange = useCallback(
    (newData: Partial<PresentationFormData>) => {
      setFormData((prev) => ({ ...prev, ...newData }));
      setIsDirty(true);

      // バリデーション実行
      const errors = validateFormData({ ...formData, ...newData });
      setValidationErrors(errors);
    },
    [formData]
  );

  // 基本情報フォーム更新
  const handleBasicInfoChange = useCallback(
    (
      basicInfo: Pick<
        PresentationFormData,
        'title' | 'description' | 'category' | 'tags'
      >
    ) => {
      handleFormDataChange(basicInfo);
    },
    [handleFormDataChange]
  );

  // 設定フォーム更新
  const handleSettingsChange = useCallback(
    (settings: PresentationFormData['settings']) => {
      handleFormDataChange({ settings });
    },
    [handleFormDataChange]
  );

  // フォームバリデーション
  const validateFormData = (data: PresentationFormData): ValidationError[] => {
    const errors: ValidationError[] = [];

    // タイトル必須チェック
    if (!data.title || data.title.trim().length === 0) {
      errors.push({
        field: 'title',
        message: 'プレゼンテーションタイトルは必須です',
      });
    }

    // タイトル長さチェック
    if (data.title && data.title.length > 100) {
      errors.push({
        field: 'title',
        message: 'プレゼンテーションタイトルは100文字以内で入力してください',
      });
    }

    // 説明文長さチェック
    if (data.description && data.description.length > 500) {
      errors.push({
        field: 'description',
        message: 'プレゼンテーション説明は500文字以内で入力してください',
      });
    }

    // 参加者数制限チェック
    if (
      data.settings.maxParticipants !== undefined &&
      data.settings.maxParticipants < 1
    ) {
      errors.push({
        field: 'maxParticipants',
        message: '参加人数制限は1以上で入力してください',
      });
    }

    // アクセスコード有効期限チェック
    if (
      data.settings.accessCodeExpirationMinutes !== undefined &&
      data.settings.accessCodeExpirationMinutes < 5
    ) {
      errors.push({
        field: 'accessCodeExpirationMinutes',
        message: 'アクセスコード有効期限は5分以上で入力してください',
      });
    }

    return errors;
  };

  // 自動保存
  const autoSave = useCallback(async () => {
    if (!isDirty || isSaving) return;

    try {
      const autoSaveData: AutoSaveData = {
        formData,
        lastSaved: new Date().toISOString(),
        isDraft: true,
      };
      localStorage.setItem('presentation-draft', JSON.stringify(autoSaveData));
    } catch (error) {
      console.error('自動保存エラー:', error);
    }
  }, [formData, isDirty, isSaving]);

  // 自動保存の定期実行
  useEffect(() => {
    const interval = setInterval(autoSave, 30000); // 30秒毎
    return () => clearInterval(interval);
  }, [autoSave]);

  // 保存処理
  const handleSave = async () => {
    const errors = validateFormData(formData);
    if (errors.length > 0) {
      setValidationErrors(errors);
      showSnackbar('入力内容にエラーがあります', 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (isEditMode && id) {
        // TODO: 更新API呼び出し
        // await updatePresentation(id, formData);
        console.log('プレゼンテーション更新:', id, formData);
        showSnackbar('プレゼンテーションを更新しました', 'success');
      } else {
        // TODO: 作成API呼び出し
        // const response = await createPresentation(formData);
        console.log('プレゼンテーション作成:', formData);
        showSnackbar('プレゼンテーションを作成しました', 'success');

        // 下書きデータをクリア
        localStorage.removeItem('presentation-draft');
      }
      setIsDirty(false);
    } catch (error) {
      console.error('保存エラー:', error);
      showSnackbar('保存に失敗しました', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // プレビュー表示切り替え
  const handlePreviewToggle = () => {
    setShowPreview((prev) => !prev);
  };

  // 戻る処理
  const handleBack = () => {
    if (isDirty) {
      const confirmed = window.confirm('未保存の変更があります。戻りますか？');
      if (!confirmed) return;
    }
    navigate(-1);
  };

  // スナックバー表示
  const showSnackbar = (
    message: string,
    severity: 'success' | 'error' | 'warning' | 'info'
  ) => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  // スナックバーを閉じる
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  return (
    <>
      {/* ヘッダー */}
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={handleBack}
            aria-label="戻る"
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, ml: 2 }}>
            {isEditMode ? 'プレゼンテーション編集' : 'プレゼンテーション作成'}
          </Typography>
          <Button
            color="inherit"
            startIcon={<PreviewIcon />}
            onClick={handlePreviewToggle}
            sx={{ mr: 1 }}
          >
            プレビュー
          </Button>
          <Button
            color="inherit"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? '保存中...' : '保存'}
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 3, mb: 3 }}>
        <Grid container spacing={3}>
          {/* フォーム部分 */}
          <Grid item xs={12} md={showPreview ? 8 : 12}>
            <Paper elevation={1} sx={{ p: 3 }}>
              {/* バリデーションエラー表示 */}
              {validationErrors.length > 0 && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    入力内容を確認してください:
                  </Typography>
                  <ul style={{ marginBottom: 0, paddingLeft: '20px' }}>
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error.message}</li>
                    ))}
                  </ul>
                </Alert>
              )}

              {/* 基本情報フォーム */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>
                  基本情報
                </Typography>
                <BasicInfoForm
                  data={{
                    title: formData.title,
                    description: formData.description,
                    category: formData.category,
                    tags: formData.tags,
                  }}
                  onChange={handleBasicInfoChange}
                  errors={validationErrors}
                />
              </Box>

              {/* 設定フォーム */}
              <Box>
                <Typography variant="h6" gutterBottom>
                  プレゼンテーション設定
                </Typography>
                <SettingsForm
                  data={formData.settings}
                  onChange={handleSettingsChange}
                  errors={validationErrors}
                />
              </Box>
            </Paper>
          </Grid>

          {/* プレビュー部分 */}
          {showPreview && (
            <Grid item xs={12} md={4}>
              <PreviewCard
                data={{
                  title: formData.title,
                  description: formData.description,
                  category: formData.category,
                  tags: formData.tags,
                  participantLimit: formData.settings.maxParticipants,
                }}
              />
            </Grid>
          )}
        </Grid>
      </Container>

      {/* スナックバー */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default PresentationFormPage;
