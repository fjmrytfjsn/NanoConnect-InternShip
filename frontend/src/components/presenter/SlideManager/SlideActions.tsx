/**
 * スライドアクションボタン群コンポーネント
 * スライドに対する各種操作（編集、複製、削除など）を提供
 */

import React, { useState, memo } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Tooltip,
} from '@mui/material';
import {
  MoreVert as MoreIcon,
  Edit as EditIcon,
  ContentCopy as DuplicateIcon,
  Delete as DeleteIcon,
  Quiz as MultipleChoiceIcon,
  Cloud as WordCloudIcon,
  KeyboardArrowUp as MoveUpIcon,
  KeyboardArrowDown as MoveDownIcon,
} from '@mui/icons-material';
import { SlideActionsProps, SlideAction } from './types';

export const SlideActions = memo<SlideActionsProps>(
  ({ slideType, onAction, editable = true, compact = false }) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const open = Boolean(anchorEl);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
      event.stopPropagation();
      setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
      setAnchorEl(null);
    };

    const handleAction = (action: SlideAction) => {
      handleClose();

      if (action === 'delete') {
        setDeleteDialogOpen(true);
      } else {
        onAction(action);
      }
    };

    const handleDeleteConfirm = () => {
      setDeleteDialogOpen(false);
      onAction('delete');
    };

    const handleDeleteCancel = () => {
      setDeleteDialogOpen(false);
    };

    if (!editable) {
      return null;
    }

    return (
      <>
        <Tooltip title="アクション">
          <IconButton
            aria-label="スライドアクション"
            aria-controls={open ? 'slide-actions-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={open ? 'true' : undefined}
            onClick={handleClick}
            size={compact ? 'small' : 'medium'}
          >
            <MoreIcon />
          </IconButton>
        </Tooltip>

        <Menu
          id="slide-actions-menu"
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          MenuListProps={{
            'aria-labelledby': 'slide-actions-button',
            dense: compact,
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          {/* 編集 */}
          <MenuItem onClick={() => handleAction('edit')}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>編集</ListItemText>
          </MenuItem>

          {/* 複製 */}
          <MenuItem onClick={() => handleAction('duplicate')}>
            <ListItemIcon>
              <DuplicateIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>複製</ListItemText>
          </MenuItem>

          <Divider />

          {/* スライドタイプ変更 */}
          <MenuItem
            onClick={() => handleAction('change-type-multiple-choice')}
            disabled={slideType === 'multiple_choice'}
          >
            <ListItemIcon>
              <MultipleChoiceIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>多肢選択式に変更</ListItemText>
          </MenuItem>

          <MenuItem
            onClick={() => handleAction('change-type-word-cloud')}
            disabled={slideType === 'word_cloud'}
          >
            <ListItemIcon>
              <WordCloudIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>ワードクラウドに変更</ListItemText>
          </MenuItem>

          <Divider />

          {/* 並び順変更 */}
          <MenuItem onClick={() => handleAction('move-up')}>
            <ListItemIcon>
              <MoveUpIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>上に移動</ListItemText>
          </MenuItem>

          <MenuItem onClick={() => handleAction('move-down')}>
            <ListItemIcon>
              <MoveDownIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>下に移動</ListItemText>
          </MenuItem>

          <Divider />

          {/* 削除 */}
          <MenuItem
            onClick={() => handleAction('delete')}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon>
              <DeleteIcon fontSize="small" sx={{ color: 'error.main' }} />
            </ListItemIcon>
            <ListItemText>削除</ListItemText>
          </MenuItem>
        </Menu>

        {/* 削除確認ダイアログ */}
        <Dialog
          open={deleteDialogOpen}
          onClose={handleDeleteCancel}
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-description"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogTitle id="delete-dialog-title">スライドの削除確認</DialogTitle>
          <DialogContent>
            <DialogContentText id="delete-dialog-description">
              このスライドを削除しますか？この操作は元に戻すことができません。
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteCancel} color="inherit">
              キャンセル
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              color="error"
              variant="contained"
              autoFocus
            >
              削除
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }
);

SlideActions.displayName = 'SlideActions';
