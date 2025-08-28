import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/common/Layout/Layout';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { SlideEditorDemo } from '@/pages/SlideEditorDemo';

export const AppRouter: React.FC = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/slide-editor-demo" element={<SlideEditorDemo />} />
          <Route path="*" element={<div>404 - ページが見つかりません</div>} />
        </Routes>
      </Layout>
    </Router>
  );
};
