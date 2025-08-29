import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/common/Layout/Layout';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import PresentationFormPage from '@/pages/PresentationFormPage';
import { SlideEditorDemo } from '@/pages/SlideEditorDemo';
import { PresenterDashboard } from '@/pages/PresenterDashboard';

export const AppRouter: React.FC = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/presentations/new" element={<PresentationFormPage />} />
          <Route
            path="/presentations/:id/edit"
            element={<PresentationFormPage />}
          />
          <Route path="/slide-editor-demo" element={<SlideEditorDemo />} />
          <Route path="/presenter/dashboard" element={<PresenterDashboard />} />
          <Route path="*" element={<div>404 - ページが見つかりません</div>} />
        </Routes>
      </Layout>
    </Router>
  );
};
