/**
 * ドラッグ&ドロップ対応スライド一覧コンポーネント
 * @dnd-kitを使用してスライドの並び替え機能を提供
 */

import { useState, useCallback, memo } from 'react';
import {
  Box,
  Typography,
  Alert,
  Skeleton,
} from '@mui/material';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  MeasuringStrategy,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SlideSortableProps, SlideData, SlideOrderUpdate, SlideAction } from './types';
import { SlideItem } from './SlideItem';

export const SlideSortable = memo<SlideSortableProps>(({
  slides,
  onReorder,
  onSlideClick,
  onSlideAction,
  loading = false,
  editable = true,
}) => {
  const [activeSlide, setActiveSlide] = useState<SlideData | null>(null);
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  // ドラッグ&ドロップのセンサー設定
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 測定戦略の設定
  const measuring = {
    droppable: {
      strategy: MeasuringStrategy.Always,
    },
  };

  // ドラッグ開始処理
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const slide = slides.find(s => s.id === active.id);
    if (slide) {
      setActiveSlide(slide);
    }
  }, [slides]);

  // ドラッグ終了処理
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveSlide(null);

    if (!over || !editable) {
      return;
    }

    if (active.id !== over.id) {
      try {
        setIsReordering(true);
        
        const oldIndex = slides.findIndex(slide => slide.id === active.id);
        const newIndex = slides.findIndex(slide => slide.id === over.id);
        
        if (oldIndex !== -1 && newIndex !== -1) {
          // 新しい順序でスライド配列を作成
          const reorderedSlides = arrayMove(slides, oldIndex, newIndex);
          
          // 順序更新データを生成
          const slideOrders: SlideOrderUpdate[] = reorderedSlides.map((slide, index) => ({
            slideId: slide.id,
            order: index,
          }));
          
          // サーバーに順序変更を送信
          await onReorder(slideOrders);
        }
      } catch (error) {
        console.error('スライド順序変更エラー:', error);
        // エラーハンドリングは親コンポーネントで行う
      } finally {
        setIsReordering(false);
      }
    }
  }, [slides, onReorder, editable]);

  // スライドクリック処理
  const handleSlideClick = useCallback((slideId: string) => {
    setSelectedSlideId(selectedSlideId === slideId ? null : slideId);
    onSlideClick(slideId);
  }, [selectedSlideId, onSlideClick]);

  // スライドアクション処理
  const handleSlideAction = useCallback((action: SlideAction, slideId: string) => {
    // 順序変更アクション
    if (action === 'move-up' || action === 'move-down') {
      const currentIndex = slides.findIndex(slide => slide.id === slideId);
      if (currentIndex === -1) return;
      
      const newIndex = action === 'move-up' 
        ? Math.max(0, currentIndex - 1)
        : Math.min(slides.length - 1, currentIndex + 1);
      
      if (currentIndex !== newIndex) {
        const reorderedSlides = arrayMove(slides, currentIndex, newIndex);
        const slideOrders: SlideOrderUpdate[] = reorderedSlides.map((slide, index) => ({
          slideId: slide.id,
          order: index,
        }));
        
        onReorder(slideOrders).catch(error => {
          console.error('スライド順序変更エラー:', error);
        });
      }
      return;
    }
    
    // その他のアクション
    onSlideAction(action, slideId);
  }, [slides, onReorder, onSlideAction]);

  // ローディング中のスケルトン表示
  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        {Array.from({ length: 3 }).map((_, index) => (
          <Box key={index} sx={{ mb: 2 }}>
            <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 1 }} />
          </Box>
        ))}
      </Box>
    );
  }

  // スライドがない場合の表示
  if (slides.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          スライドがありません
        </Typography>
        <Typography variant="body2" color="text.secondary">
          「新しいスライドを追加」ボタンからスライドを作成してください。
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {isReordering && (
        <Alert severity="info" sx={{ mb: 2 }}>
          スライド順序を更新中...
        </Alert>
      )}
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis]}
        measuring={measuring}
        accessibility={{
          announcements: {
            onDragStart({ active }) {
              const slide = slides.find(s => s.id === active.id);
              return `${slide?.title || 'スライド'} を移動開始しました`;
            },
            onDragOver({ active, over }) {
              if (over) {
                const activeSlide = slides.find(s => s.id === active.id);
                const overSlide = slides.find(s => s.id === over.id);
                return `${activeSlide?.title || 'スライド'} を ${overSlide?.title || 'スライド'} の位置に移動しています`;
              }
              return `${active.id} を移動中`;
            },
            onDragEnd({ active, over }) {
              if (over) {
                const activeSlide = slides.find(s => s.id === active.id);
                const overSlide = slides.find(s => s.id === over.id);
                return `${activeSlide?.title || 'スライド'} を ${overSlide?.title || 'スライド'} の位置に移動しました`;
              }
              return `移動を終了しました`;
            },
            onDragCancel({ active }) {
              const slide = slides.find(s => s.id === active.id);
              return `${slide?.title || 'スライド'} の移動をキャンセルしました`;
            },
          },
        }}
      >
        <SortableContext 
          items={slides.map(slide => slide.id)} 
          strategy={verticalListSortingStrategy}
        >
          {slides.map((slide, index) => (
            <SlideItem
              key={slide.id}
              slide={slide}
              index={index}
              selected={selectedSlideId === slide.id}
              onClick={() => handleSlideClick(slide.id)}
              onAction={(action) => handleSlideAction(action, slide.id)}
              editable={editable}
            />
          ))}
        </SortableContext>

        <DragOverlay>
          {activeSlide && (
            <SlideItem
              slide={activeSlide}
              index={slides.findIndex(s => s.id === activeSlide.id)}
              isDragging={true}
              onClick={() => {}}
              onAction={() => {}}
              editable={editable}
            />
          )}
        </DragOverlay>
      </DndContext>
    </Box>
  );
});

SlideSortable.displayName = 'SlideSortable';