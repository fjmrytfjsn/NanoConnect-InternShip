import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import { SlideEditor } from '../components/presenter/SlideEditor';

interface SlideInfo {
  id?: string;
  title?: string;
  type?: 'multiple_choice' | 'word_cloud';
  content?: {
    question: string;
    options?: string[];
    settings?: {
      allowMultiple?: boolean;
      showResults?: boolean;
      maxWords?: number;
    };
  };
}

export const SlideEditorDemo: React.FC = () => {
  const handleSlideChange = (slide: Partial<SlideInfo>) => {
    console.log('Slide changed:', slide);
  };

  return (
    <Container maxWidth={false} sx={{ py: 3 }}>
      <Typography variant="h4" gutterBottom>
        スライドエディタデモ
      </Typography>
      <Box sx={{ height: 'calc(100vh - 200px)' }}>
        <SlideEditor onSlideChange={handleSlideChange} />
      </Box>
    </Container>
  );
};
