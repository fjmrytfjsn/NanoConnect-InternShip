import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import { SlideEditor } from '../components/presenter/SlideEditor';

export const SlideEditorDemo: React.FC = () => {
  const handleSlideChange = (slide: any) => {
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