/**
 * スライド管理コンポーネントの型定義
 */

export type SlideType = 'multiple_choice' | 'word_cloud';

export interface SlideData {
  id: string;
  presentationId: string;
  type: SlideType;
  title: string;
  question: string;
  options?: string[];
  slideOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface SlideOrderUpdate {
  slideId: string;
  order: number;
}

export interface SlideManagerProps {
  /** プレゼンテーションID */
  presentationId: string;
  /** スライド一覧 */
  slides: SlideData[];
  /** スライド順序変更時のコールバック */
  onReorderSlides: (slideOrders: SlideOrderUpdate[]) => Promise<void>;
  /** スライド追加時のコールバック */
  onAddSlide: (afterIndex?: number) => void;
  /** スライド編集時のコールバック */
  onEditSlide: (slideId: string) => void;
  /** スライド複製時のコールバック */
  onDuplicateSlide: (slideId: string) => void;
  /** スライド削除時のコールバック */
  onDeleteSlide: (slideId: string) => void;
  /** スライドタイプ変更時のコールバック */
  onChangeSlideType: (slideId: string, newType: SlideType) => void;
  /** 読み込み中フラグ */
  loading?: boolean;
  /** 編集可能フラグ */
  editable?: boolean;
}

export interface SlideSortableProps {
  /** スライド一覧 */
  slides: SlideData[];
  /** スライド順序変更時のコールバック */
  onReorder: (slideOrders: SlideOrderUpdate[]) => Promise<void>;
  /** スライドアイテムクリック時のコールバック */
  onSlideClick: (slideId: string) => void;
  /** スライドアクション実行時のコールバック */
  onSlideAction: (action: SlideAction, slideId: string) => void;
  /** 読み込み中フラグ */
  loading?: boolean;
  /** 編集可能フラグ */
  editable?: boolean;
}

export interface SlideItemProps {
  /** スライドデータ */
  slide: SlideData;
  /** スライド番号（表示用） */
  index: number;
  /** 選択状態 */
  selected?: boolean;
  /** ドラッグ中フラグ */
  isDragging?: boolean;
  /** クリック時のコールバック */
  onClick: () => void;
  /** アクション実行時のコールバック */
  onAction: (action: SlideAction) => void;
  /** 編集可能フラグ */
  editable?: boolean;
}

export interface SlideActionsProps {
  /** 対象スライドID */
  slideId: string;
  /** スライドタイプ */
  slideType: SlideType;
  /** アクション実行時のコールバック */
  onAction: (action: SlideAction) => void;
  /** 編集可能フラグ */
  editable?: boolean;
  /** コンパクト表示フラグ */
  compact?: boolean;
}

export type SlideAction =
  | 'edit'
  | 'duplicate'
  | 'delete'
  | 'change-type-multiple-choice'
  | 'change-type-word-cloud'
  | 'move-up'
  | 'move-down';

export interface DragEndEvent {
  active: {
    id: string;
  };
  over: {
    id: string;
  } | null;
}

export interface SlideThumbnailerProps {
  /** スライドデータ */
  slide: SlideData;
  /** サムネイルサイズ */
  size?: 'small' | 'medium' | 'large';
  /** クリック可能フラグ */
  clickable?: boolean;
  /** クリック時のコールバック */
  onClick?: () => void;
}
