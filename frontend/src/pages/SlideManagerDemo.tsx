/**
 * SlideManagerコンポーネントのデモページ
 * 実際の使用例を示し、機能テストを可能にする
 */

import { useState, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Alert,
} from '@mui/material';
import { SlideManager, SlideData, SlideOrderUpdate, SlideAction, SlideType } from '../components/presenter/SlideManager';

// デモ用のサンプルデータ
const createSampleSlides = (): SlideData[] => [
  {
    id: 'slide-1',
    presentationId: 'demo-presentation',
    type: 'multiple_choice',
    title: 'あなたの好きな季節は？',
    question: '最も好きな季節を選んでください',
    options: ['春', '夏', '秋', '冬'],
    slideOrder: 0,
    createdAt: new Date(Date.now() - 86400000).toISOString(), // 1日前
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'slide-2',
    presentationId: 'demo-presentation',
    type: 'word_cloud',
    title: '今日の気分を一言で',
    question: 'あなたの今日の気分を表す言葉を入力してください',
    slideOrder: 1,
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1時間前
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'slide-3',
    presentationId: 'demo-presentation',
    type: 'multiple_choice',
    title: 'プログラミング言語の選択',
    question: '最も習得したいプログラミング言語は？',
    options: ['JavaScript', 'Python', 'TypeScript', 'Java', 'Go'],
    slideOrder: 2,
    createdAt: new Date(Date.now() - 1800000).toISOString(), // 30分前
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
  },
];

export const SlideManagerDemo = () => {
  const [slides, setSlides] = useState<SlideData[]>(createSampleSlides());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>('');

  // スライド順序変更処理
  const handleReorderSlides = useCallback(async (slideOrders: SlideOrderUpdate[]) => {
    setLoading(true);
    setMessage('');
    
    try {
      // シミュレート: バックエンドAPIへの順序変更リクエスト
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // ローカル状態を更新
      const updatedSlides = slides.map(slide => {
        const orderUpdate = slideOrders.find(so => so.slideId === slide.id);
        return orderUpdate 
          ? { ...slide, slideOrder: orderUpdate.order, updatedAt: new Date().toISOString() }
          : slide;
      });
      
      setSlides(updatedSlides.sort((a, b) => a.slideOrder - b.slideOrder));
      setMessage('スライドの順序を正常に更新しました！');
      
    } catch (error) {
      console.error('スライド順序変更エラー:', error);
      setMessage('エラー: スライドの順序更新に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [slides]);

  // 新規スライド追加
  const handleAddSlide = useCallback((afterIndex?: number) => {
    const newSlide: SlideData = {
      id: `slide-${Date.now()}`,
      presentationId: 'demo-presentation',
      type: 'multiple_choice',
      title: `新しいスライド ${slides.length + 1}`,
      question: '新しい質問をここに入力してください',
      options: ['選択肢1', '選択肢2'],
      slideOrder: afterIndex !== undefined ? afterIndex + 1 : slides.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // 新しいスライドより後の順序を調整
    const updatedSlides = slides.map(slide => 
      slide.slideOrder >= newSlide.slideOrder
        ? { ...slide, slideOrder: slide.slideOrder + 1 }
        : slide
    );
    
    setSlides([...updatedSlides, newSlide].sort((a, b) => a.slideOrder - b.slideOrder));
    setMessage(`新しいスライドを追加しました: ${newSlide.title}`);
  }, [slides]);

  // スライド編集
  const handleEditSlide = useCallback((slideId: string) => {
    const slide = slides.find(s => s.id === slideId);
    setMessage(`編集画面を開きました: ${slide?.title || slideId}`);
  }, [slides]);

  // スライド複製
  const handleDuplicateSlide = useCallback((slideId: string) => {
    const originalSlide = slides.find(s => s.id === slideId);
    if (!originalSlide) return;
    
    const duplicatedSlide: SlideData = {
      ...originalSlide,
      id: `slide-${Date.now()}`,
      title: `${originalSlide.title} (コピー)`,
      slideOrder: slides.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    setSlides([...slides, duplicatedSlide]);
    setMessage(`スライドを複製しました: ${duplicatedSlide.title}`);
  }, [slides]);

  // スライド削除
  const handleDeleteSlide = useCallback((slideId: string) => {
    const slide = slides.find(s => s.id === slideId);
    const updatedSlides = slides
      .filter(s => s.id !== slideId)
      .map((s, index) => ({ ...s, slideOrder: index }));
    
    setSlides(updatedSlides);
    setMessage(`スライドを削除しました: ${slide?.title || slideId}`);
  }, [slides]);

  // スライドタイプ変更
  const handleChangeSlideType = useCallback((slideId: string, newType: SlideType) => {
    const updatedSlides = slides.map(slide => 
      slide.id === slideId 
        ? { 
            ...slide, 
            type: newType,
            // ワードクラウドに変更する場合は選択肢を削除
            options: newType === 'word_cloud' ? undefined : slide.options || ['選択肢1', '選択肢2'],
            updatedAt: new Date().toISOString()
          }
        : slide
    );
    
    setSlides(updatedSlides);
    const slide = slides.find(s => s.id === slideId);
    const typeLabel = newType === 'multiple_choice' ? '多肢選択式' : 'ワードクラウド';
    setMessage(`スライドタイプを変更しました: ${slide?.title} → ${typeLabel}`);
  }, [slides]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        スライド順序管理UI デモ
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        ドラッグ&ドロップでスライドの順序を変更できます。各スライドのアクションメニューから
        編集、複製、削除、タイプ変更などの操作も可能です。
      </Typography>

      {message && (
        <Alert 
          severity={message.startsWith('エラー') ? 'error' : 'info'} 
          sx={{ mb: 2 }}
          onClose={() => setMessage('')}
        >
          {message}
        </Alert>
      )}

      <Paper elevation={2} sx={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
        <SlideManager
          presentationId="demo-presentation"
          slides={slides}
          onReorderSlides={handleReorderSlides}
          onAddSlide={handleAddSlide}
          onEditSlide={handleEditSlide}
          onDuplicateSlide={handleDuplicateSlide}
          onDeleteSlide={handleDeleteSlide}
          onChangeSlideType={handleChangeSlideType}
          loading={loading}
          editable={true}
        />
      </Paper>

      <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button 
          variant="outlined" 
          onClick={() => setSlides(createSampleSlides())}
        >
          サンプルデータをリセット
        </Button>
        
        <Button 
          variant="outlined" 
          onClick={() => {
            const randomSlides = createSampleSlides();
            // ランダムに順序をシャッフル
            randomSlides.forEach((slide, index) => {
              slide.slideOrder = Math.floor(Math.random() * randomSlides.length);
            });
            setSlides(randomSlides);
            setMessage('スライドをランダムに並び替えました');
          }}
        >
          ランダム並び替え
        </Button>

        <Button 
          variant="outlined" 
          onClick={() => {
            setLoading(true);
            setTimeout(() => {
              setLoading(false);
              setMessage('ローディング状態のテスト完了');
            }, 2000);
          }}
        >
          ローディング状態をテスト
        </Button>
      </Box>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          実装済み機能
        </Typography>
        <ul>
          <li>ドラッグ&ドロップによるスライド順序変更</li>
          <li>スライドの追加、編集、複製、削除</li>
          <li>スライドタイプの変更（多肢選択式 ⇄ ワードクラウド）</li>
          <li>スライドサムネイル表示とメタ情報表示</li>
          <li>キーボードアクセシビリティ対応</li>
          <li>レスポンシブデザイン</li>
          <li>ローディング状態とエラーハンドリング</li>
          <li>ソート機能（順序、タイトル、タイプ、作成日）</li>
        </ul>
      </Box>
    </Container>
  );
};