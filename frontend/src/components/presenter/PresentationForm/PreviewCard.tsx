/**
 * プレゼンテーションプレビューカードコンポーネント
 */

import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Chip,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  People as PeopleIcon,
  Category as CategoryIcon,
  Schedule as ScheduleIcon,
  Visibility as VisibilityIcon,
  Security as SecurityIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';

import { PresentationPreview, PresentationCategory } from '../../../types/presentation';

// カテゴリー表示名マッピング
const categoryLabels: Record<PresentationCategory, string> = {
  business: 'ビジネス',
  education: '教育',
  entertainment: 'エンターテイメント',
  research: '研究',
  other: 'その他'
};

// カテゴリーアイコン色
const categoryColors: Record<PresentationCategory, string> = {
  business: '#1976d2',
  education: '#388e3c',
  entertainment: '#f57c00',
  research: '#7b1fa2',
  other: '#616161'
};

interface PreviewCardProps {
  data: PresentationPreview;
}

const PreviewCard: React.FC<PreviewCardProps> = ({ data }) => {
  return (
    <Card elevation={2} sx={{ height: 'fit-content', position: 'sticky', top: 20 }}>
      <CardHeader
        avatar={
          <Avatar sx={{ bgcolor: categoryColors[data.category] }}>
            <CategoryIcon />
          </Avatar>
        }
        title="プレビュー"
        subheader="参加者から見た表示内容"
      />
      
      <CardContent>
        {/* タイトル */}
        <Typography variant="h6" component="h2" gutterBottom>
          {data.title || 'プレゼンテーションタイトル'}
        </Typography>

        {/* 説明文 */}
        {data.description && (
          <Typography variant="body2" color="text.secondary" paragraph>
            {data.description}
          </Typography>
        )}

        {/* カテゴリー */}
        <Box sx={{ mb: 2 }}>
          <Chip
            label={categoryLabels[data.category]}
            size="small"
            sx={{ 
              bgcolor: categoryColors[data.category],
              color: 'white',
              fontWeight: 'bold'
            }}
          />
        </Box>

        {/* タグ */}
        {data.tags && data.tags.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              タグ
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {data.tags.map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  size="small"
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* 詳細情報 */}
        <Typography variant="subtitle2" gutterBottom>
          プレゼンテーション詳細
        </Typography>

        <List dense disablePadding>
          {/* 参加人数制限 */}
          <ListItem disablePadding>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <PeopleIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="参加人数"
              secondary={data.participantLimit ? `最大 ${data.participantLimit} 人` : '制限なし'}
            />
          </ListItem>

          {/* 推定時間 */}
          {data.estimatedDuration && (
            <ListItem disablePadding>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <ScheduleIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="推定時間"
                secondary={data.estimatedDuration}
              />
            </ListItem>
          )}

          {/* アクセス方法 */}
          <ListItem disablePadding>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <SecurityIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="アクセス"
              secondary="6桁のコードで参加"
            />
          </ListItem>

          {/* 匿名性 */}
          <ListItem disablePadding>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <VisibilityIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="回答方式"
              secondary="匿名で参加可能"
            />
          </ListItem>

          {/* コンテンツフィルター */}
          <ListItem disablePadding>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <FilterIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="コンテンツ"
              secondary="不適切投稿フィルター有効"
            />
          </ListItem>
        </List>

        <Divider sx={{ my: 2 }} />

        {/* 参加方法の説明 */}
        <Box sx={{ p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            参加方法
          </Typography>
          <Typography variant="body2" color="text.secondary">
            1. プレゼンター画面に表示される6桁のコードを確認
            <br />
            2. 参加者は専用URLまたはアプリでコードを入力
            <br />
            3. 匿名でプレゼンテーションに参加完了
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PreviewCard;