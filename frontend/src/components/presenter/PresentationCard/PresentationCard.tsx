import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Box,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Edit,
  Delete,
  Preview,
  MoreVert,
  Code,
  Slideshow,
} from '@mui/icons-material';
import { Presentation, PresentationStatus } from '@/types/common';

interface PresentationCardProps {
  presentation: Presentation;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  onPreview?: (id: number) => void;
  isListView?: boolean;
}

const getStatusColor = (
  status: PresentationStatus
): 'default' | 'primary' | 'success' | 'error' => {
  switch (status) {
    case 'draft':
      return 'default';
    case 'active':
      return 'success';
    case 'ended':
      return 'primary';
    default:
      return 'default';
  }
};

const getStatusLabel = (status: PresentationStatus): string => {
  switch (status) {
    case 'draft':
      return '下書き';
    case 'active':
      return '公開中';
    case 'ended':
      return '終了';
    default:
      return '不明';
  }
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const PresentationCard: React.FC<PresentationCardProps> = ({
  presentation,
  onEdit,
  onDelete,
  onPreview,
  isListView = false,
}) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = (event: React.MouseEvent) => {
    event.stopPropagation();
    handleMenuClose();
    onEdit?.(presentation.id);
  };

  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
    handleMenuClose();
    onDelete?.(presentation.id);
  };

  const handlePreview = (event: React.MouseEvent) => {
    event.stopPropagation();
    handleMenuClose();
    onPreview?.(presentation.id);
  };

  if (isListView) {
    return (
      <Card
        sx={{
          mb: 1,
          display: 'flex',
          alignItems: 'center',
          px: 2,
          py: 1,
          cursor: 'pointer',
          '&:hover': {
            boxShadow: 2,
          },
        }}
        onClick={() => onEdit?.(presentation.id)}
      >
        <Box
          sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 2 }}
        >
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" component="h3">
              {presentation.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {presentation.description}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              icon={<Slideshow />}
              label={`${presentation.slideCount || 0} スライド`}
              size="small"
              variant="outlined"
            />
            {presentation.status === 'active' && (
              <Chip
                icon={<Code />}
                label={presentation.accessCode}
                size="small"
                color="primary"
              />
            )}
            <Chip
              label={getStatusLabel(presentation.status)}
              size="small"
              color={getStatusColor(presentation.status)}
            />
          </Box>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ minWidth: 120 }}
          >
            {formatDate(presentation.updatedAt)}
          </Typography>
        </Box>

        <IconButton
          onClick={handleMenuClick}
          size="small"
          sx={{ ml: 1 }}
          aria-label="メニューを開く"
        >
          <MoreVert />
        </IconButton>

        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleMenuClose}
          onClick={(e) => e.stopPropagation()}
        >
          <MenuItem onClick={handleEdit}>
            <ListItemIcon>
              <Edit fontSize="small" />
            </ListItemIcon>
            <ListItemText>編集</ListItemText>
          </MenuItem>
          <MenuItem onClick={handlePreview}>
            <ListItemIcon>
              <Preview fontSize="small" />
            </ListItemIcon>
            <ListItemText>プレビュー</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <Delete fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>削除</ListItemText>
          </MenuItem>
        </Menu>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: 4,
          transform: 'translateY(-2px)',
        },
      }}
      onClick={() => onEdit?.(presentation.id)}
    >
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            mb: 2,
          }}
        >
          <Typography variant="h6" component="h3" sx={{ flexGrow: 1, pr: 1 }}>
            {presentation.title}
          </Typography>
          <IconButton
            size="small"
            onClick={handleMenuClick}
            aria-label="メニューを開く"
          >
            <MoreVert />
          </IconButton>
        </Box>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            minHeight: 40,
          }}
        >
          {presentation.description}
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          <Chip
            icon={<Slideshow />}
            label={`${presentation.slideCount || 0} スライド`}
            size="small"
            variant="outlined"
          />
          <Chip
            label={getStatusLabel(presentation.status)}
            size="small"
            color={getStatusColor(presentation.status)}
          />
          {presentation.status === 'active' && (
            <Chip
              icon={<Code />}
              label={presentation.accessCode}
              size="small"
              color="primary"
            />
          )}
        </Box>

        <Typography variant="body2" color="text.secondary">
          最終更新: {formatDate(presentation.updatedAt)}
        </Typography>
      </CardContent>

      <CardActions sx={{ pt: 0, px: 2, pb: 2 }}>
        <Button
          size="small"
          startIcon={<Edit />}
          onClick={handleEdit}
          fullWidth
        >
          編集
        </Button>
        <Button
          size="small"
          startIcon={<Preview />}
          onClick={handlePreview}
          variant="outlined"
          fullWidth
        >
          プレビュー
        </Button>
      </CardActions>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>編集</ListItemText>
        </MenuItem>
        <MenuItem onClick={handlePreview}>
          <ListItemIcon>
            <Preview fontSize="small" />
          </ListItemIcon>
          <ListItemText>プレビュー</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <Delete fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>削除</ListItemText>
        </MenuItem>
      </Menu>
    </Card>
  );
};
