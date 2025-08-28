import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/common/Layout/Layout';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import PresentationFormPage from '@/pages/PresentationFormPage';

// Layout付きのページコンポーネント
const HomePageWithLayout: React.FC = () => (
  <Layout>
    <HomePage />
  </Layout>
);

const LoginPageWithLayout: React.FC = () => (
  <Layout>
    <LoginPage />
  </Layout>
);

const NotFoundWithLayout: React.FC = () => (
  <Layout>
    <div>404 - ページが見つかりません</div>
  </Layout>
);

export const AppRouter: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePageWithLayout />} />
        <Route path="/login" element={<LoginPageWithLayout />} />
        <Route path="/presentations/new" element={<PresentationFormPage />} />
        <Route
          path="/presentations/:id/edit"
          element={<PresentationFormPage />}
        />
        <Route path="*" element={<NotFoundWithLayout />} />
      </Routes>
    </Router>
  );
};
