import React, { ReactNode } from 'react';
import { Box, Container, CssBaseline } from '@mui/material';
import { Header } from '../Header/Header';

interface LayoutProps {
  children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        <Container 
          component="main" 
          maxWidth="lg" 
          sx={{ 
            flexGrow: 1, 
            py: 3,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {children}
        </Container>
      </Box>
    </>
  );
};