/**
 * 個別スライドアイテムコンポーネント
 * スライド一覧の各項目を表示し、ドラッグ&ドロップをサポート
 */

import { memo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  DragIndicator as DragIcon,
  Quiz as MultipleChoiceIcon,
  Cloud as WordCloudIcon,
} from '@mui/icons-material';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SlideItemProps, SlideAction } from './types';
import { SlideActions } from './SlideActions';

export const SlideItem = memo<SlideItemProps>(({
  slide,
  index,
  selected = false,
  isDragging = false,
  onClick,
  onAction,
  editable = true,
}) => {
  const theme = useTheme();
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: slide.id,
    disabled: !editable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dragging = isDragging || isSortableDragging;

  // スライドタイプに応じたアイコンとカラー
  const getSlideTypeInfo = () => {
    switch (slide.type) {
      case 'multiple_choice':
        return {
          icon: <MultipleChoiceIcon fontSize="small" />,
          label: '多肢選択',
          color: theme.palette.primary.main,
        };
      case 'word_cloud':
        return {
          icon: <WordCloudIcon fontSize="small" />,
          label: 'ワードクラウド',
          color: theme.palette.secondary.main,
        };
      default:
        return {
          icon: <MultipleChoiceIcon fontSize="small" />,
          label: '不明',
          color: theme.palette.grey[500],
        };
    }
  };

  const typeInfo = getSlideTypeInfo();

  // スライドのサムネイル生成（簡易版）
  const renderThumbnail = () => {
    return (
      <Box
        sx={{
          width: 80,
          height: 60,
          backgroundColor: alpha(typeInfo.color, 0.1),
          border: `1px solid ${alpha(typeInfo.color, 0.3)}`,
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {typeInfo.icon}
      </Box>
    );
  };

  const handleAction = (action: SlideAction) => {
    onAction(action);
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      sx={{
        mb: 1,
        cursor: editable ? 'pointer' : 'default',
        transition: 'all 0.2s ease-in-out',
        transform: dragging ? 'scale(1.02)' : 'scale(1)',
        opacity: dragging ? 0.8 : 1,
        boxShadow: dragging ? theme.shadows[8] : theme.shadows[1],
        backgroundColor: selected 
          ? alpha(theme.palette.primary.main, 0.08)
          : theme.palette.background.paper,
        borderLeft: selected 
          ? `4px solid ${theme.palette.primary.main}`
          : '4px solid transparent',
        '&:hover': !dragging && editable ? {
          boxShadow: theme.shadows[4],
          transform: 'translateY(-1px)',
        } : {},
      }}
      onClick={onClick}
    >
      <CardContent
        sx={{
          p: 2,
          '&:last-child': { pb: 2 },
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        {/* ドラッグハンドル */}
        {editable && (
          <Box
            {...attributes}
            {...listeners}
            sx={{
              cursor: 'grab',
              display: 'flex',
              alignItems: 'center',
              color: theme.palette.text.secondary,
              '&:active': {
                cursor: 'grabbing',
              },
            }}
            aria-label={`スライド ${index + 1} を移動`}
          >
            <DragIcon />
          </Box>
        )}

        {/* スライド番号 */}
        <Typography
          variant="h6"
          sx={{
            minWidth: 24,
            textAlign: 'center',
            color: theme.palette.text.secondary,
            fontWeight: 600,
          }}
        >
          {index + 1}
        </Typography>

        {/* サムネイル */}
        {renderThumbnail()}

        {/* スライド情報 */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
              }}
            >
              {slide.title || 'タイトル未設定'}
            </Typography>
            <Chip
              icon={typeInfo.icon}
              label={typeInfo.label}
              size="small"
              sx={{
                backgroundColor: alpha(typeInfo.color, 0.1),
                color: typeInfo.color,
                '& .MuiChip-icon': {
                  color: typeInfo.color,
                },
              }}
            />
          </Box>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {slide.question || '質問未設定'}
          </Typography>
          {slide.options && slide.options.length > 0 && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 0.5 }}
            >
              選択肢: {slide.options.length}個
            </Typography>
          )}
        </Box>

        {/* アクションボタン */}
        {editable && (
          <SlideActions
            slideId={slide.id}
            slideType={slide.type}
            onAction={handleAction}
            editable={editable}
            compact={true}
          />
        )}
      </CardContent>
    </Card>
  );
});

SlideItem.displayName = 'SlideItem';